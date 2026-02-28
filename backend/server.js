require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const app = express();

// ✅ IMPORTANT : parser le JSON AVANT les routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: ["http://localhost:3001", "http://127.0.0.1:3001"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
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
  console.error(
    "❌ DATABASE_URL is missing. Create backend/.env with DATABASE_URL=... (Neon connection string)."
  );
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

// ---------- DB Pool (Neon) ----------
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Neon SSL
});
// Optional: log where DB points to (without exposing password)
function safeDbHost(url) {
  try {
    const u = new URL(url);
    return u.host;
  } catch {
    // fallback for non-URL parsers
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
    res.status(500).json({
      ok: false,
      error: "DB connection failed",
      detail: e.message,
      dbHost: safeDbHost(DATABASE_URL),
    });
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
      `SELECT id, email, role, password_hash FROM users WHERE email=$1`,
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

// middleware JWT
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
      [
        first_name.trim(),
        last_name.trim(),
        email.trim(),
        phone?.trim() || null,
        history?.trim() || null,
        company_id || null,
      ]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
// PUT /contacts/:id -> modifier un contact
app.put("/contacts/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id; // ✅ on garde en string

    console.log("PUT /contacts/:id -> id =", id);

    const { first_name, last_name, email, phone, history, company_id } = req.body || {};

    if (!id) return res.status(400).json({ error: "ID invalide" });
    if (!first_name?.trim() || !last_name?.trim() || !email?.trim()) {
      return res.status(400).json({ error: "first_name, last_name, email requis" });
    }

    const r = await pool.query(
      `UPDATE contacts
       SET first_name=$1,
           last_name=$2,
           email=$3,
           phone=$4,
           history=$5,
           company_id=$6
       WHERE id=$7
       RETURNING *`,
      [
        first_name.trim(),
        last_name.trim(),
        email.trim(),
        phone?.trim() || null,
        history?.trim() || null,
        company_id || null,
        id,
      ]
    );

    if (r.rowCount === 0) return res.status(404).json({ error: "Contact introuvable" });
    res.json(r.rows[0]);
  } catch (e) {
    // Si id doit être int et tu envoies "undefined", Postgres peut renvoyer une erreur de cast
    if (String(e.message || "").includes("invalid input syntax")) {
      return res.status(400).json({ error: "ID invalide" });
    }
    res.status(500).json({ error: e.message });
  }
});
app.delete("/contacts/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id; // UUID string

    const result = await pool.query(
      `DELETE FROM contacts WHERE id=$1 RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Contact introuvable" });
    }

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
      `INSERT INTO companies (name, website, city, sector)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [name, website || null, city || null, sector || null]
    );
    res.status(201).json(r.rows[0]);
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
// PUT /companies/:id  -> modifier une entreprise
app.put("/companies/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id; // ✅ UUID string
    const { name, website, city, sector } = req.body || {};

    if (!id) return res.status(400).json({ error: "ID invalide" });
    if (!name || !String(name).trim()) return res.status(400).json({ error: "Le nom est obligatoire" });

    const result = await pool.query(
      `UPDATE companies
       SET name=$1, website=$2, city=$3, sector=$4
       WHERE id=$5
       RETURNING id, name, website, city, sector, created_at`,
      [
        String(name).trim(),
        website?.trim() ? website.trim() : null,
        city?.trim() ? city.trim() : null,
        sector?.trim() ? sector.trim() : null,
        id,
      ]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: "Entreprise introuvable" });

    return res.json(result.rows[0]);
  } catch (e) {
    // Si jamais Postgres se plaint d'un cast
    if (String(e.message || "").includes("invalid input syntax")) {
      return res.status(400).json({ error: "ID invalide" });
    }
    return res.status(500).json({ error: e.message });
  }
});
// ---------- Leads ----------
app.get("/leads", requireAuth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT l.*,
             c.first_name, c.last_name, c.email AS contact_email,
             u.email AS assigned_email
      FROM leads l
      LEFT JOIN contacts c ON c.id = l.contact_id
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
    const r = await pool.query(
      `INSERT INTO leads (title, status, source, value_eur, contact_id, assigned_to)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [
        title,
        status || "nouveau",
        source || null,
        value_eur ?? null,
        contact_id || null,
        assigned_to || null,
      ]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// changer le statut (pipeline)
app.patch("/leads/:id/status", requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const r = await pool.query(
      `UPDATE leads SET status=$1 WHERE id=$2 RETURNING *`,
      [status, req.params.id]
    );
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
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
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
    res.json(r.rows[0]);
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

// ---------- Dashboard ----------
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

// ---------- Start ----------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ API running: http://localhost:${PORT}`);
  console.log("✅ DATABASE_URL exists =", !!process.env.DATABASE_URL);
  console.log("✅ DB host =", safeDbHost(DATABASE_URL));
});