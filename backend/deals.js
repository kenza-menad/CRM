// deals.js
const express = require("express");

const ALLOWED_STATUSES = [
  "prospect",
  "qualification",
  "proposition",
  "negociation",
  "gagne",
  "perdu",
];

module.exports = function (pool, requireAuth) {
  const router = express.Router();

  // ---------- GET /deals ----------
  router.get("/", requireAuth, async (req, res) => {
    try {
      const { status, assigned_to, q } = req.query;

      const where = [];
      const params = [];
      let i = 1;

      if (status && ALLOWED_STATUSES.includes(status)) {
        params.push(status);
        where.push(`d.status = $${i++}`);
      }

      if (assigned_to) {
        params.push(assigned_to);
        where.push(`d.assigned_to = $${i++}`);
      }

      if (q) {
        params.push(`%${q.toLowerCase()}%`);
        where.push(`LOWER(d.title) LIKE $${i++}`);
      }

      const sql = `
        SELECT 
          d.*,
          c.first_name,
          c.last_name,
          c.email AS contact_email,
          co.name AS company_name,
          u.first_name AS assigned_first_name,
          u.last_name  AS assigned_last_name
        FROM deals d
        LEFT JOIN contacts c   ON c.id  = d.contact_id
        LEFT JOIN companies co ON co.id = d.company_id
        LEFT JOIN users u      ON u.id  = d.assigned_to
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY d.created_at DESC
      `;

      const r = await pool.query(sql, params);
      res.json(r.rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ---------- GET /deals/stats ----------
  router.get("/stats", requireAuth, async (req, res) => {
    try {
      const r = await pool.query(`
        SELECT
          COUNT(*)::int                                        AS total_deals,
          COALESCE(SUM(amount), 0)::numeric                   AS total_value,
          COALESCE(SUM(weighted_amount), 0)::numeric          AS weighted_value,
          COALESCE(SUM(CASE WHEN status='gagne' THEN amount END), 0)::numeric AS won_value,
          COUNT(CASE WHEN status NOT IN ('gagne','perdu') THEN 1 END)::int    AS active_deals
        FROM deals
      `);

      const byStatus = await pool.query(`
        SELECT status,
               COUNT(*)::int AS count,
               COALESCE(SUM(amount),0)::numeric AS total
        FROM deals
        GROUP BY status
        ORDER BY ARRAY_POSITION(
          ARRAY['prospect','qualification','proposition','negociation','gagne','perdu'],
          status::text
        )
      `);

      res.json({
        summary: r.rows[0],
        by_status: byStatus.rows,
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ---------- GET /deals/:id ----------
  router.get("/:id", requireAuth, async (req, res) => {
    try {
      const r = await pool.query(`
        SELECT 
          d.*,
          c.first_name, c.last_name, c.email AS contact_email,
          co.name AS company_name,
          u.first_name AS assigned_first_name,
          u.last_name  AS assigned_last_name
        FROM deals d
        LEFT JOIN contacts c   ON c.id  = d.contact_id
        LEFT JOIN companies co ON co.id = d.company_id
        LEFT JOIN users u      ON u.id  = d.assigned_to
        WHERE d.id = $1
      `, [req.params.id]);

      if (r.rowCount === 0) return res.status(404).json({ error: "Deal introuvable" });
      res.json(r.rows[0]);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ---------- POST /deals ----------
  router.post("/", requireAuth, async (req, res) => {
    try {
      const {
        title, description, status,
        amount, contact_id, company_id,
        assigned_to, expected_close_date,
      } = req.body;

      if (!title?.trim()) return res.status(400).json({ error: "Titre requis" });

      const finalStatus = status || "prospect";
      if (!ALLOWED_STATUSES.includes(finalStatus)) {
        return res.status(400).json({ error: "Statut invalide" });
      }

      const r = await pool.query(`
        INSERT INTO deals 
          (title, description, status, amount, contact_id, company_id, assigned_to, expected_close_date)
        VALUES ($1, $2, $3::deal_status, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        title.trim(),
        description?.trim() || null,
        finalStatus,
        amount ?? 0,
        contact_id || null,
        company_id || null,
        assigned_to || null,
        expected_close_date || null,
      ]);

      res.status(201).json(r.rows[0]);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ---------- PUT /deals/:id ----------
  router.put("/:id", requireAuth, async (req, res) => {
    try {
      const {
        title, description, status,
        amount, contact_id, company_id,
        assigned_to, expected_close_date,
      } = req.body;

      if (!title?.trim()) return res.status(400).json({ error: "Titre requis" });
      if (status && !ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({ error: "Statut invalide" });
      }

      const finalStatus = status || "prospect";

      const r = await pool.query(`
        UPDATE deals SET
          title               = $1,
          description         = $2,
          status              = $3::deal_status,
          amount              = $4,
          contact_id          = $5,
          company_id          = $6,
          assigned_to         = $7,
          expected_close_date = $8,
          closed_at           = CASE 
            WHEN $3::deal_status IN ('gagne','perdu') THEN now() 
            ELSE NULL 
          END
        WHERE id = $9
        RETURNING *
      `, [
        title.trim(),
        description?.trim() || null,
        finalStatus,
        amount ?? 0,
        contact_id || null,
        company_id || null,
        assigned_to || null,
        expected_close_date || null,
        req.params.id,
      ]);

      if (r.rowCount === 0) return res.status(404).json({ error: "Deal introuvable" });
      res.json(r.rows[0]);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ---------- PATCH /deals/:id/status ----------
  router.patch("/:id/status", requireAuth, async (req, res) => {
    try {
      const { status } = req.body;

      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({ error: "Statut invalide" });
      }

      const r = await pool.query(`
        UPDATE deals SET
          status    = $1::deal_status,
          closed_at = CASE 
            WHEN $1::deal_status IN ('gagne','perdu') THEN now() 
            ELSE NULL 
          END
        WHERE id = $2
        RETURNING *
      `, [status, req.params.id]);

      if (r.rowCount === 0) return res.status(404).json({ error: "Deal introuvable" });
      res.json(r.rows[0]);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ---------- DELETE /deals/:id ----------
  router.delete("/:id", requireAuth, async (req, res) => {
    try {
      const r = await pool.query(`DELETE FROM deals WHERE id=$1 RETURNING *`, [req.params.id]);
      if (r.rowCount === 0) return res.status(404).json({ error: "Deal introuvable" });
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
};
