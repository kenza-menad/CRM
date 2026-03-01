require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const {
  sendWelcomeEmail,
  sendDealWonEmail,
  sendNewLeadEmail,
  sendOverdueTaskEmail,
} = require("./brevo");

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

// ---------- Env checks ----------
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is missing.");
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

// ---------- DB Pool ----------
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
    if (exists.rowCount > 0) {
      return res.status(409).json({ error: "email already used" });
    }

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

    // ✅ Email de bienvenue (après la réponse pour ne pas bloquer)
    sendWelcomeEmail({ email: user.email, first_name: user.first_name });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email/password required" });
    }

    const r = await pool.query(
      `SELECT id, email, role, password_hash, first_name FROM users WHERE email=$1`,
      [email]
    );

    const user = r.rows[0];
    if (!user) return res.status(401).json({ error: "invalid credentials" });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "invalid credentials" });

    const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
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
      where.push(`
        (LOWER(c.first_name) LIKE $${i}
         OR LOWER(c.last_name) LIKE $${i}
         OR LOWER(c.email) LIKE $${i}
         OR COALESCE(c.phone,'') LIKE $${i})
      `);
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

app.post("/contacts", requireAuth, async (req, res) => {
  try {
    const { first_name, last_name, email, phone, history, company_id } = req.body;

    if (!first_name?.trim() || !last_name?.trim() || !email?.trim()) {
      return res.status(400).json({ error: "first_name, last_name, email requis" });
    }

    const r = await pool.query(
      `INSERT INTO contacts (first_name, last_name, email, phone, history, company_id)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
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
    const { first_name, last_name, email, phone, history, company_id } = req.body || {};

    if (!id) return res.status(400).json({ error: "ID invalide" });
    if (!first_name?.trim() || !last_name?.trim() || !email?.trim()) {
      return res.status(400).json({ error: "first_name, last_name, email requis" });
    }

    const r = await pool.query(
      `UPDATE contacts SET first_name=$1, last_name=$2, email=$3, phone=$4, history=$5, company_id=$6
       WHERE id=$7 RETURNING *`,
      [first_name.trim(), last_name.trim(), email.trim(), phone?.trim() || null, history?.trim() || null, company_id || null, id]
    );

    if (r.rowCount === 0) return res.status(404).json({ error: "Contact introuvable" });
    res.json(r.rows[0]);
  } catch (e) {
    if (String(e.message || "").includes("invalid input syntax")) {
      return res.status(400).json({ error: "ID invalide" });
    }
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
    const { name, website, city, sector } = req.body || {};

    if (!id) return res.status(400).json({ error: "ID invalide" });
    if (!name || !String(name).trim()) return res.status(400).json({ error: "Le nom est obligatoire" });

    const result = await pool.query(
      `UPDATE companies SET name=$1, website=$2, city=$3, sector=$4 WHERE id=$5
       RETURNING id, name, website, city, sector, created_at`,
      [String(name).trim(), website?.trim() || null, city?.trim() || null, sector?.trim() || null, id]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: "Entreprise introuvable" });
    return res.json(result.rows[0]);
  } catch (e) {
    if (String(e.message || "").includes("invalid input syntax")) {
      return res.status(400).json({ error: "ID invalide" });
    }
    return res.status(500).json({ error: e.message });
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
      SELECT l.*,
             c.first_name, c.last_name, c.email AS contact_email,
             co.name AS company_name,
             u.email AS assigned_email
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
    if (!ALLOWED_LEAD_STATUSES.includes(finalStatus)) {
      return res.status(400).json({ error: "Statut invalide" });
    }

    const r = await pool.query(
      `INSERT INTO leads (title, status, source, value_eur, contact_id, assigned_to)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [title.trim(), finalStatus, source?.trim() || null, value_eur ?? null, contact_id || null, assigned_to || null]
    );

    res.status(201).json(r.rows[0]);

    // ✅ Email nouveau lead au commercial assigné
    if (assigned_to) {
      try {
        const u = await pool.query(`SELECT email, first_name FROM users WHERE id=$1`, [assigned_to]);
        if (u.rows[0]) {
          sendNewLeadEmail({
            email: u.rows[0].email,
            first_name: u.rows[0].first_name,
            lead_title: r.rows[0].title,
            source: r.rows[0].source,
          });
        }
      } catch (emailErr) {
        console.error("Erreur email lead:", emailErr.message);
      }
    }

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch("/leads/:id/status", requireAuth, async (req, res) => {
  try {
    const { status } = req.body;

    if (!ALLOWED_LEAD_STATUSES.includes(status)) {
      return res.status(400).json({ error: "Statut invalide" });
    }

    const r = await pool.query(
      `UPDATE leads SET status=$1 WHERE id=$2 RETURNING *`,
      [status, req.params.id]
    );

    if (r.rowCount === 0) return res.status(404).json({ error: "Lead introuvable" });
    res.json(r.rows[0]);

    if (status === "converti") {
  console.log("Lead converti → possibilité d'envoyer un email");
}
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
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assigned_to
      ORDER BY t.created_at DESC
    `);
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/tasks", requireAuth, async (req, res) => {
  try {
    const { title, due_at, done, contact_id, lead_id, assigned_to } = req.body;
    const r = await pool.query(
      `INSERT INTO tasks (title, due_at, done, contact_id, lead_id, assigned_to)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [title, due_at || null, done || false, contact_id || null, lead_id || null, assigned_to || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch("/tasks/:id", requireAuth, async (req, res) => {
  try {
    const { title, due_at, done } = req.body;

    const r = await pool.query(
      `UPDATE tasks
       SET title = COALESCE($1, title),
           due_at = COALESCE($2, due_at),
           done = COALESCE($3, done)
       WHERE id=$4
       RETURNING *`,
      [title ?? null, due_at ?? null, done ?? null, req.params.id]
    );

    if (r.rowCount === 0) {
      return res.status(404).json({ error: "Task introuvable" });
    }

    const task = r.rows[0];

    res.json(task);

    // ✅ Vérification tâche en retard
    if (
      task.assigned_to &&
      !task.done &&
      task.due_at &&
      new Date(task.due_at) < new Date()
    ) {
      try {
        const user = await pool.query(
          `SELECT email, first_name FROM users WHERE id=$1`,
          [task.assigned_to]
        );

        if (user.rows[0]) {
          sendOverdueTaskEmail({
            email: user.rows[0].email,
            first_name: user.rows[0].first_name,
            task_title: task.title,
          });
        }
      } catch (emailErr) {
        console.error("Erreur email overdue task:", emailErr.message);
      }
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

// ---------- Dashboard Pipeline ----------
app.get("/dashboard/pipeline", requireAuth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT status,
             COUNT(*)::int as total,
             COALESCE(SUM(value_eur),0)::numeric as total_value
      FROM leads
      GROUP BY status
    `);
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- Dashboard Stats ----------
app.get("/dashboard/stats", requireAuth, async (req, res) => {
  try {
    const [
      dealsStats,
      leadsStats,
      taskStats,
      recentDeals,
      recentLeads,
      todayTasks,
      dealsByMonth,
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
        FROM deals
      `),
      pool.query(`
        SELECT
          COUNT(*)::int AS total_leads,
          COUNT(CASE WHEN status='nouveau' THEN 1 END)::int AS leads_nouveau,
          COUNT(CASE WHEN status='en_cours' THEN 1 END)::int AS leads_en_cours,
          COUNT(CASE WHEN status='converti' THEN 1 END)::int AS leads_converti,
          COUNT(CASE WHEN status='perdu' THEN 1 END)::int AS leads_perdu
        FROM leads
      `),
      pool.query(`
        SELECT
          COUNT(*)::int AS total_tasks,
          COUNT(CASE WHEN done = false THEN 1 END)::int AS tasks_todo,
          COUNT(CASE WHEN done = false AND due_at < now() THEN 1 END)::int AS tasks_overdue
        FROM tasks
      `),
      pool.query(`
        SELECT d.id, d.title, d.status, d.amount, c.first_name, c.last_name
        FROM deals d
        LEFT JOIN contacts c ON c.id = d.contact_id
        ORDER BY d.updated_at DESC
        LIMIT 5
      `),
      pool.query(`
        SELECT l.id, l.title, l.status, l.value_eur, c.first_name, c.last_name
        FROM leads l
        LEFT JOIN contacts c ON c.id = l.contact_id
        ORDER BY l.created_at DESC
        LIMIT 5
      `),
      pool.query(`
        SELECT t.id, t.title, t.due_at, t.done
        FROM tasks t
        WHERE t.done = false AND t.due_at::date <= CURRENT_DATE
        ORDER BY t.due_at ASC
        LIMIT 5
      `),
      pool.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', closed_at), 'YYYY-MM') AS month,
          COUNT(*)::int AS count,
          COALESCE(SUM(amount), 0)::numeric AS total
        FROM deals
        WHERE status = 'gagne'
          AND closed_at IS NOT NULL
          AND closed_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', closed_at)
        ORDER BY DATE_TRUNC('month', closed_at)
      `),
    ]);

    const d = dealsStats.rows[0];
    const l = leadsStats.rows[0];
    const t = taskStats.rows[0];

    const tauxConversion = l.total_leads > 0
      ? Math.round((d.deals_gagnes / l.total_leads) * 100)
      : 0;

    res.json({
      kpi: {
        ca_gagne: d.ca_gagne,
        pipeline_total: d.pipeline_total,
        total_leads: l.total_leads,
        taux_conversion: tauxConversion,
        tasks_todo: t.tasks_todo,
        tasks_overdue: t.tasks_overdue,
      },
      deals_by_status: {
        prospect:      d.deals_prospect,
        qualification: d.deals_qualification,
        proposition:   d.deals_proposition,
        negociation:   d.deals_negociation,
        gagne:         d.deals_gagnes,
        perdu:         d.deals_perdus,
      },
      leads_by_status: {
        nouveau:  l.leads_nouveau,
        en_cours: l.leads_en_cours,
        converti: l.leads_converti,
        perdu:    l.leads_perdu,
      },
      recent_deals:  recentDeals.rows,
      recent_leads:  recentLeads.rows,
      today_tasks:   todayTasks.rows,
      monthly_sales: dealsByMonth.rows,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// ---------- Users ----------
app.get("/users", requireAuth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT id, first_name, last_name, email, role, created_at
      FROM users
      ORDER BY created_at DESC
    `);
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch("/users/:id/role", requireAuth, async (req, res) => {
  try {
    const { role } = req.body;
    if (!["admin", "commercial", "user"].includes(role)) {
      return res.status(400).json({ error: "Rôle invalide" });
    }
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

app.delete("/users/:id", requireAuth, async (req, res) => {
  try {
    await pool.query(`DELETE FROM users WHERE id=$1`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
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