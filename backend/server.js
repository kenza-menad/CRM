require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const { sendWelcomeEmail, sendDealWonEmail, sendNewLeadEmail, sendOverdueTaskEmail, sendPasswordResetEmail } = require("./brevo");

const app = express();
const ALLOWED_DEAL_STATUSES = ["qualification","proposition","negociation","gagne","perdu"];

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.options("*", cors());

app.use((req, res, next) => {
  console.log("➡️", req.method, req.originalUrl);
  next();
});

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is missing.");
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function safeDbHost(url) {
  try {
    const u = new URL(url);
    return u.host;
  } catch {
    const afterAt = url.split("@")[1] || "";
    return afterAt.split("/")[0] || "unknown";
  }
}

// ---------- Health ----------
app.get("/health", async (req, res) => {
  try {
    const r = await pool.query("SELECT now() AS now");
    res.json({ ok: true, dbTime: r.rows[0].now, dbHost: safeDbHost(DATABASE_URL) });
  } catch (e) {
    res.status(500).json({ ok: false, error: "DB connection failed", detail: e.message });
  }
});

// ---------- Auth ----------
app.post("/auth/signup", async (req, res) => {
  try {
    const { first_name, last_name, email, password, role } = req.body;
    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ error: "first_name/last_name/email/password required" });
    }
    const exists = await pool.query(`SELECT 1 FROM users WHERE email=$1`, [email]);
    if (exists.rowCount > 0) return res.status(409).json({ error: "email already used" });
    const hash = await bcrypt.hash(password, 10);
    const r = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, first_name, last_name, email, role, created_at`,
      [first_name, last_name, email, hash, role || "user"]
    );
    const user = r.rows[0];
    const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({ token, user });
    sendWelcomeEmail({ email: user.email, first_name: user.first_name });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "email/password required" });
    const r = await pool.query(
      `SELECT id, email, role, password_hash, first_name, last_name FROM users WHERE email=$1`,
      [email]
    );
    const user = r.rows[0];
    if (!user) return res.status(401).json({ error: "invalid credentials" });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "invalid credentials" });
    const token = jwt.sign(
      { sub: user.id, role: user.role, name: `${user.first_name} ${user.last_name}` },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- Forgot Password ----------
app.post("/auth/mot-de-passe-oublie", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email requis" });
    const user = await pool.query(`SELECT id FROM users WHERE email=$1`, [email]);
    if (user.rowCount === 0) return res.json({ ok: true });
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await pool.query(`UPDATE password_resets SET used=true WHERE email=$1`, [email]);
    await pool.query(
      `INSERT INTO password_resets (email, code, expires_at) VALUES ($1, $2, $3)`,
      [email, code, expiresAt]
    );
    sendPasswordResetEmail({ email, code });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/auth/reset-password", async (req, res) => {
  try {
    const { email, code, password } = req.body;
    if (!email || !code || !password) return res.status(400).json({ error: "Email, code et mot de passe requis" });
    const r = await pool.query(
      `SELECT * FROM password_resets 
       WHERE email=$1 AND code=$2 AND used=false AND expires_at > now()
       ORDER BY created_at DESC LIMIT 1`,
      [email, code]
    );
    if (r.rowCount === 0) return res.status(400).json({ error: "Code invalide ou expiré" });
    const hash = await bcrypt.hash(password, 10);
    await pool.query(`UPDATE users SET password_hash=$1 WHERE email=$2`, [hash, email]);
    await pool.query(`UPDATE password_resets SET used=true WHERE id=$1`, [r.rows[0].id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- Middleware JWT ----------
function requireAuth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "missing token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "invalid token" });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Accès réservé aux administrateurs" });
  next();
}

// ---------- Contacts ----------
app.get("/contacts", requireAuth, async (req, res) => {
  try {
    const q = (req.query.q || "").toString().trim();
    const companyId = (req.query.companyId || "").toString().trim();
    const where = [];
    const params = [];
    let i = 1;
    if (q) {
      params.push(`%${q.toLowerCase()}%`);
      where.push(`(LOWER(c.first_name) LIKE $${i} OR LOWER(c.last_name) LIKE $${i} OR LOWER(c.email) LIKE $${i} OR COALESCE(c.phone,'') LIKE $${i})`);
      i++;
    }
    if (companyId) {
      params.push(companyId);
      where.push(`c.company_id = $${i}`);
      i++;
    }
    const sql = `
      SELECT c.*, co.name AS company_name
      FROM contacts c
      LEFT JOIN companies co ON co.id = c.company_id
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY c.created_at DESC
    `;
    const r = await pool.query(sql, params);
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/contacts/:id", requireAuth, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT c.*, co.name AS company_name FROM contacts c LEFT JOIN companies co ON co.id = c.company_id WHERE c.id = $1`,
      [req.params.id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: "Contact introuvable" });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/contacts", requireAuth, async (req, res) => {
  try {
    const { first_name, last_name, email, phone, history, company_id } = req.body;
    if (!first_name?.trim() || !last_name?.trim() || !email?.trim()) {
      return res.status(400).json({ error: "first_name, last_name, email requis" });
    }
    const r = await pool.query(
      `INSERT INTO contacts (first_name, last_name, email, phone, history, company_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [first_name.trim(), last_name.trim(), email.trim(), phone?.trim() || null, history?.trim() || null, company_id || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/contacts/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const { first_name, last_name, email, phone, history, company_id, job_title, city, linkedin_url } = req.body || {};
    if (!id) return res.status(400).json({ error: "ID invalide" });
    if (!first_name?.trim() || !last_name?.trim() || !email?.trim()) {
      return res.status(400).json({ error: "first_name, last_name, email requis" });
    }
    const r = await pool.query(
      `UPDATE contacts SET first_name=$1, last_name=$2, email=$3, phone=$4, history=$5, company_id=$6, job_title=$7, city=$8, linkedin_url=$9 WHERE id=$10 RETURNING *`,
      [first_name.trim(), last_name.trim(), email.trim(), phone?.trim() || null, history?.trim() || null, company_id || null, job_title?.trim() || null, city?.trim() || null, linkedin_url?.trim() || null, id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: "Contact introuvable" });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/contacts/:id", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`DELETE FROM contacts WHERE id=$1 RETURNING *`, [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Contact introuvable" });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- Companies ----------
app.get("/companies", requireAuth, async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM companies ORDER BY created_at DESC`);
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/companies/:id", requireAuth, async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM companies WHERE id = $1`, [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: "Entreprise introuvable" });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/companies", requireAuth, async (req, res) => {
  try {
    const { name, website, city, sector } = req.body;
    const r = await pool.query(
      `INSERT INTO companies (name, website, city, sector) VALUES ($1,$2,$3,$4) RETURNING *`,
      [name, website || null, city || null, sector || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/companies/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const { name, website, city, sector, phone, size, annual_revenue } = req.body || {};
    if (!id) return res.status(400).json({ error: "ID invalide" });
    if (!name || !String(name).trim()) return res.status(400).json({ error: "Le nom est obligatoire" });
    const result = await pool.query(
      `UPDATE companies SET name=$1, website=$2, city=$3, sector=$4, phone=$5, size=$6, annual_revenue=$7 WHERE id=$8 RETURNING *`,
      [String(name).trim(), website?.trim() || null, city?.trim() || null, sector?.trim() || null, phone?.trim() || null, size?.trim() || null, annual_revenue ? Number(annual_revenue) : null, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Entreprise introuvable" });
    return res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/companies/:id", requireAuth, async (req, res) => {
  try {
    await pool.query(`DELETE FROM companies WHERE id=$1`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- Leads ----------
const ALLOWED_LEAD_STATUSES = ["nouveau", "en_cours", "converti", "perdu"];

app.get("/leads", requireAuth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT l.*, c.first_name, c.last_name, c.email AS contact_email,
             co.name AS company_name, u.email AS assigned_email
      FROM leads l
      LEFT JOIN contacts c ON c.id = l.contact_id
      LEFT JOIN companies co ON co.id = c.company_id
      LEFT JOIN users u ON u.id = l.assigned_to
      ORDER BY l.created_at DESC
    `);
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/leads", requireAuth, async (req, res) => {
  try {
    const { title, status, source, value_eur, contact_id, assigned_to } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: "Titre requis" });
    const finalStatus = status || "nouveau";
    if (!ALLOWED_LEAD_STATUSES.includes(finalStatus)) return res.status(400).json({ error: "Statut invalide" });
    const r = await pool.query(
      `INSERT INTO leads (title, status, source, value_eur, contact_id, assigned_to)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [title.trim(), finalStatus, source?.trim() || null, value_eur ?? null, contact_id || null, assigned_to || null]
    );
    res.status(201).json(r.rows[0]);
    if (assigned_to) {
      try {
        const u = await pool.query(`SELECT email, first_name FROM users WHERE id=$1`, [assigned_to]);
        if (u.rows[0]) {
          sendNewLeadEmail({ email: u.rows[0].email, first_name: u.rows[0].first_name, lead_title: r.rows[0].title, source: r.rows[0].source });
        }
      } catch (emailErr) { console.error("Erreur email lead:", emailErr.message); }
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch("/leads/:id/status", requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!ALLOWED_LEAD_STATUSES.includes(status)) return res.status(400).json({ error: "Statut invalide" });
    const r = await pool.query(`UPDATE leads SET status=$1 WHERE id=$2 RETURNING *`, [status, req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: "Lead introuvable" });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/leads/:id", requireAuth, async (req, res) => {
  try {
    await pool.query(`DELETE FROM leads WHERE id=$1`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- Tasks ----------
app.get("/tasks", requireAuth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT t.*, u.email AS assigned_email
      FROM tasks t LEFT JOIN users u ON u.id = t.assigned_to
      ORDER BY t.created_at DESC
    `);
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/tasks", requireAuth, async (req, res) => {
  try {
    const { title, due_at, done, contact_id, lead_id, assigned_to, priority } = req.body;
    const result = await pool.query(
      `INSERT INTO tasks (title, due_at, done, contact_id, lead_id, assigned_to, priority)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [title, due_at || null, done || false, contact_id || null, lead_id || null, assigned_to || null, priority || "normal"]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch("/tasks/:id", requireAuth, async (req, res) => {
  try {
    const { title, due_at, done, priority } = req.body;
    const result = await pool.query(
      `UPDATE tasks SET title=COALESCE($1,title), due_at=COALESCE($2,due_at), done=COALESCE($3,done), priority=COALESCE($4,priority) WHERE id=$5 RETURNING *`,
      [title ?? null, due_at ?? null, done ?? null, priority ?? null, req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Task introuvable" });
    const task = result.rows[0];
    res.json(task);
    if (task.assigned_to && !task.done && task.due_at && new Date(task.due_at) < new Date()) {
      try {
        const userRow = await pool.query(`SELECT email, first_name FROM users WHERE id=$1`, [task.assigned_to]);
        if (userRow.rows[0]) sendOverdueTaskEmail({ email: userRow.rows[0].email, first_name: userRow.rows[0].first_name, task_title: task.title });
      } catch (emailErr) { console.error("Erreur email overdue task:", emailErr.message); }
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/tasks/:id", requireAuth, async (req, res) => {
  try {
    await pool.query(`DELETE FROM tasks WHERE id=$1`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- Dashboard Stats ----------
app.get("/dashboard/stats", requireAuth, async (req, res) => {
  try {
    const { period, start, end } = req.query;
    const now = new Date();
    let startDate, endDate, prevStartDate, prevEndDate;

    if (start && end) {
      startDate = start; endDate = end;
      const diff = new Date(endDate).getTime() - new Date(startDate).getTime();
      prevEndDate = startDate;
      prevStartDate = new Date(new Date(startDate).getTime() - diff).toISOString().split("T")[0];
    } else {
      const p = period || "30d";
      endDate = now.toISOString().split("T")[0];
      if (p === "today") {
        startDate = endDate;
        prevStartDate = new Date(now.getTime() - 86400000).toISOString().split("T")[0];
        prevEndDate = startDate;
      } else if (p === "7d") {
        startDate = new Date(now.getTime() - 7 * 86400000).toISOString().split("T")[0];
        prevStartDate = new Date(now.getTime() - 14 * 86400000).toISOString().split("T")[0];
        prevEndDate = startDate;
      } else if (p === "30d") {
        startDate = new Date(now.getTime() - 30 * 86400000).toISOString().split("T")[0];
        prevStartDate = new Date(now.getTime() - 60 * 86400000).toISOString().split("T")[0];
        prevEndDate = startDate;
      } else if (p === "month") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
        prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
        prevEndDate = startDate;
      } else {
        startDate = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
        prevStartDate = new Date(now.getFullYear() - 1, 0, 1).toISOString().split("T")[0];
        prevEndDate = startDate;
      }
    }

    const [
      dealsStats, dealsPrev, leadsStats, leadsPrev, taskStats,
      recentDeals, recentLeads, todayTasks, dealsByMonth, dealsByStatus, dealsByStatusGlobal, commerciaux,
    ] = await Promise.all([
      pool.query(`
        SELECT
          COALESCE(SUM(CASE WHEN status='gagne' THEN amount END), 0)::numeric AS ca_gagne,
          COALESCE(SUM(CASE WHEN status NOT IN ('gagne','perdu') THEN amount END), 0)::numeric AS pipeline_total,
          COUNT(*)::int AS total_deals,
          COUNT(CASE WHEN status='gagne' THEN 1 END)::int AS deals_gagnes,
          COUNT(CASE WHEN status='perdu' THEN 1 END)::int AS deals_perdus,
          COUNT(CASE WHEN status='prospect' THEN 1 END)::int AS deals_prospect,
          COUNT(CASE WHEN status='qualification' THEN 1 END)::int AS deals_qualification,
          COUNT(CASE WHEN status='proposition' THEN 1 END)::int AS deals_proposition,
          COUNT(CASE WHEN status='negociation' THEN 1 END)::int AS deals_negociation
        FROM deals WHERE created_at::date BETWEEN $1 AND $2
      `, [startDate, endDate]),
      pool.query(`
        SELECT COALESCE(SUM(CASE WHEN status='gagne' THEN amount END), 0)::numeric AS ca_gagne,
               COUNT(*)::int AS total_deals, COUNT(CASE WHEN status='gagne' THEN 1 END)::int AS deals_gagnes
        FROM deals WHERE created_at::date BETWEEN $1 AND $2
      `, [prevStartDate, prevEndDate]),
      pool.query(`
        SELECT COUNT(*)::int AS total_leads,
               COUNT(CASE WHEN status='nouveau' THEN 1 END)::int AS leads_nouveau,
               COUNT(CASE WHEN status='en_cours' THEN 1 END)::int AS leads_en_cours,
               COUNT(CASE WHEN status='converti' THEN 1 END)::int AS leads_converti,
               COUNT(CASE WHEN status='perdu' THEN 1 END)::int AS leads_perdu
        FROM leads WHERE created_at::date BETWEEN $1 AND $2
      `, [startDate, endDate]),
      pool.query(`SELECT COUNT(*)::int AS total_leads FROM leads WHERE created_at::date BETWEEN $1 AND $2`, [prevStartDate, prevEndDate]),
      pool.query(`
        SELECT COUNT(*)::int AS total_tasks,
               COUNT(CASE WHEN done=false THEN 1 END)::int AS tasks_todo,
               COUNT(CASE WHEN done=false AND due_at < now() THEN 1 END)::int AS tasks_overdue
        FROM tasks
      `),
      pool.query(`
        SELECT d.id, d.title, d.status, d.amount, c.first_name, c.last_name
        FROM deals d LEFT JOIN contacts c ON c.id = d.contact_id
        WHERE d.created_at::date BETWEEN $1 AND $2
        ORDER BY d.updated_at DESC LIMIT 5
      `, [startDate, endDate]),
      pool.query(`
        SELECT l.id, l.title, l.status, l.value_eur, c.first_name, c.last_name
        FROM leads l LEFT JOIN contacts c ON c.id = l.contact_id
        WHERE l.created_at::date BETWEEN $1 AND $2
        ORDER BY l.created_at DESC LIMIT 5
      `, [startDate, endDate]),
      pool.query(`
        SELECT t.id, t.title, t.due_at, t.done, COALESCE(t.priority, 'normal') AS priority FROM tasks t
        WHERE t.done=false AND (t.due_at::date <= CURRENT_DATE OR t.priority = 'urgent')
        ORDER BY t.priority DESC, t.due_at ASC NULLS LAST LIMIT 5
      `),
      pool.query(`
        SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
               COUNT(*)::int AS count,
               COALESCE(SUM(CASE WHEN status='gagne' THEN amount END), 0)::numeric AS total
        FROM deals WHERE created_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at)
      `),
      pool.query(`
        SELECT status, COUNT(*)::int AS count, COALESCE(SUM(amount),0)::numeric AS total
        FROM deals WHERE created_at::date BETWEEN $1 AND $2
        GROUP BY status
      `, [startDate, endDate]),
      pool.query(`
        SELECT status, COUNT(*)::int AS count
        FROM deals
        GROUP BY status
      `),
      pool.query(`
        SELECT u.id, u.first_name, u.last_name,
               COUNT(d.id)::int AS total_deals,
               COUNT(CASE WHEN d.status='gagne' THEN 1 END)::int AS deals_gagnes,
               COALESCE(SUM(CASE WHEN d.status='gagne' THEN d.amount END), 0)::numeric AS ca,
               COUNT(t.id)::int AS tasks_open
        FROM users u
        LEFT JOIN deals d ON d.assigned_to=u.id AND d.created_at::date BETWEEN $1 AND $2
        LEFT JOIN tasks t ON t.assigned_to=u.id AND t.done=false
        GROUP BY u.id, u.first_name, u.last_name
        ORDER BY ca DESC LIMIT 5
      `, [startDate, endDate]),
    ]);

    const d = dealsStats.rows[0];
    const dp = dealsPrev.rows[0];
    const l = leadsStats.rows[0];
    const lp = leadsPrev.rows[0];
    const t = taskStats.rows[0];

    function evol(current, previous) {
      if (!previous || previous == 0) return null;
      return Math.round(((current - previous) / previous) * 100);
    }

    const tauxConversion = l.total_leads > 0 ? Math.round((d.deals_gagnes / l.total_leads) * 100) : 0;
    const byStatus = {};
    dealsByStatus.rows.forEach(r => { byStatus[r.status] = { count: r.count, total: Number(r.total) }; });
    const byStatusGlobal = {};
    dealsByStatusGlobal.rows.forEach(r => { byStatusGlobal[r.status] = r.count; });

    res.json({
      period: { startDate, endDate, prevStartDate, prevEndDate },
      kpi: {
        ca_gagne: Number(d.ca_gagne), ca_gagne_evol: evol(Number(d.ca_gagne), Number(dp.ca_gagne)),
        pipeline_total: Number(d.pipeline_total),
        total_leads: l.total_leads, total_leads_evol: evol(l.total_leads, lp.total_leads),
        taux_conversion: tauxConversion,
        tasks_todo: t.tasks_todo, tasks_overdue: t.tasks_overdue,
        total_deals: d.total_deals, total_deals_evol: evol(d.total_deals, dp.total_deals),
      },
      deals_by_status: {
        prospect: byStatus["prospect"]?.count ?? 0, qualification: byStatus["qualification"]?.count ?? 0,
        proposition: byStatus["proposition"]?.count ?? 0, negociation: byStatus["negociation"]?.count ?? 0,
        gagne: byStatus["gagne"]?.count ?? 0, perdu: byStatus["perdu"]?.count ?? 0,
      },
      deals_by_status_global: {
        prospect: byStatusGlobal["prospect"] ?? 0, qualification: byStatusGlobal["qualification"] ?? 0,
        proposition: byStatusGlobal["proposition"] ?? 0, negociation: byStatusGlobal["negociation"] ?? 0,
        gagne: byStatusGlobal["gagne"] ?? 0, perdu: byStatusGlobal["perdu"] ?? 0,
      },
      leads_by_status: { nouveau: l.leads_nouveau, en_cours: l.leads_en_cours, converti: l.leads_converti, perdu: l.leads_perdu },
      recent_deals: recentDeals.rows,
      recent_leads: recentLeads.rows,
      today_tasks: todayTasks.rows,
      monthly_sales: dealsByMonth.rows,
      commerciaux: commerciaux.rows,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- Dashboard Activity Feed ----------
app.get("/dashboard/activity", requireAuth, async (req, res) => {
  try {
    const [deals, leads, tasks, companies, contacts] = await Promise.all([
      pool.query(`
        SELECT d.id, d.title, d.updated_at AS at, u.first_name, u.last_name
        FROM deals d LEFT JOIN users u ON u.id = d.assigned_to
        ORDER BY d.updated_at DESC LIMIT 5
      `),
      pool.query(`
        SELECT l.id, l.title, l.created_at AS at, u.first_name, u.last_name
        FROM leads l LEFT JOIN users u ON u.id = l.assigned_to
        ORDER BY l.created_at DESC LIMIT 5
      `),
      pool.query(`
        SELECT t.id, t.title, t.created_at AS at, u.first_name, u.last_name
        FROM tasks t LEFT JOIN users u ON u.id = t.assigned_to
        ORDER BY t.created_at DESC LIMIT 5
      `),
      pool.query(`
        SELECT co.id, co.name AS title, co.created_at AS at,
               NULL AS first_name, NULL AS last_name
        FROM companies co
        ORDER BY co.created_at DESC LIMIT 5
      `),
      pool.query(`
        SELECT c.id, CONCAT(c.first_name, ' ', c.last_name) AS title, c.created_at AS at,
               NULL AS first_name, NULL AS last_name
        FROM contacts c
        ORDER BY c.created_at DESC LIMIT 5
      `),
    ]);

    const userName = req.user.name || "Vous";

    const activity = [
      ...deals.rows.map(r => ({ id: r.id, type: "deal", action: "a mis à jour le deal", title: r.title, user: r.first_name ? `${r.first_name} ${r.last_name}` : userName, at: r.at })),
      ...leads.rows.map(r => ({ id: r.id, type: "lead", action: "a créé le lead", title: r.title, user: r.first_name ? `${r.first_name} ${r.last_name}` : userName, at: r.at })),
      ...tasks.rows.map(r => ({ id: r.id, type: "task", action: "a créé la tâche", title: r.title, user: r.first_name ? `${r.first_name} ${r.last_name}` : userName, at: r.at })),
      ...companies.rows.map(r => ({ id: r.id, type: "company", action: "a créé l'entreprise", title: r.title, user: userName, at: r.at })),
      ...contacts.rows.map(r => ({ id: r.id, type: "contact", action: "a créé le contact", title: r.title, user: userName, at: r.at })),
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 15);

    res.json(activity);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- Dashboard My Activity ----------
app.get("/dashboard/my-activity", requireAuth, async (req, res) => {
  try {
    const userId = req.user.sub;

    const [deals, leads, tasks, contacts] = await Promise.all([
      pool.query(`
        SELECT d.id, d.title, d.status, d.amount, d.updated_at
        FROM deals d WHERE d.assigned_to = $1
        ORDER BY d.updated_at DESC LIMIT 4
      `, [userId]),
      pool.query(`
        SELECT l.id, l.title, l.status, l.value_eur, l.created_at
        FROM leads l WHERE l.assigned_to = $1
        ORDER BY l.created_at DESC LIMIT 4
      `, [userId]),
      pool.query(`
        SELECT t.id, t.title, t.due_at, t.done
        FROM tasks t WHERE t.assigned_to = $1 AND t.done = false
        ORDER BY t.due_at ASC NULLS LAST LIMIT 4
      `, [userId]),
      pool.query(`
        SELECT id, first_name, last_name, created_at
        FROM contacts ORDER BY created_at DESC LIMIT 4
      `),
    ]);

    res.json({
      my_deals: deals.rows,
      my_leads: leads.rows,
      my_tasks: tasks.rows,
      my_contacts: contacts.rows,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- Users ----------
app.get("/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const r = await pool.query(`SELECT id, first_name, last_name, email, role, is_active, created_at FROM users ORDER BY created_at DESC`);
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch("/users/:id/role", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!["admin", "commercial", "user"].includes(role)) return res.status(400).json({ error: "Rôle invalide" });
    const r = await pool.query(
      `UPDATE users SET role=$1 WHERE id=$2 RETURNING id, first_name, last_name, email, role`,
      [role, req.params.id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: "Utilisateur introuvable" });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch("/users/:id/active", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { is_active } = req.body;
    const r = await pool.query(
      `UPDATE users SET is_active=$1 WHERE id=$2 RETURNING id, first_name, last_name, email, role, is_active`,
      [is_active, req.params.id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: "Utilisateur introuvable" });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/users/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    await pool.query(`DELETE FROM users WHERE id=$1`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/users/:id", requireAuth, async (req, res) => {
  try {
    if (req.user.sub !== req.params.id && req.user.role !== "admin") return res.status(403).json({ error: "Accès refusé" });
    const r = await pool.query(
      `SELECT id, first_name, last_name, email, role, phone, job_title, created_at FROM users WHERE id=$1`,
      [req.params.id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: "Introuvable" });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch("/users/:id", requireAuth, async (req, res) => {
  try {
    if (req.user.sub !== req.params.id && req.user.role !== "admin") return res.status(403).json({ error: "Accès refusé" });
    const { first_name, last_name, email, phone, job_title, password } = req.body;
    let hash = null;
    if (password) hash = await bcrypt.hash(password, 10);
    const r = await pool.query(
      `UPDATE users SET first_name=COALESCE($1,first_name), last_name=COALESCE($2,last_name), email=COALESCE($3,email), phone=$4, job_title=$5 ${hash ? ", password_hash=$6" : ""} WHERE id=$${hash ? "7" : "6"} RETURNING id, first_name, last_name, email, role, phone, job_title`,
      hash ? [first_name, last_name, email, phone || null, job_title || null, hash, req.params.id]
           : [first_name, last_name, email, phone || null, job_title || null, req.params.id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: "Introuvable" });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- Deals router ----------
const dealsRouter = require("./deals")(pool, requireAuth, sendDealWonEmail);
app.use("/deals", dealsRouter);

// ---------- Start ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ API running: http://localhost:${PORT}`);
  console.log("✅ DATABASE_URL exists =", !!process.env.DATABASE_URL);
  console.log("✅ DB host =", safeDbHost(DATABASE_URL));
});