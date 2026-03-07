// brevo.js
const Brevo = require("@getbrevo/brevo");

const apiInstance = new Brevo.TransactionalEmailsApi();
apiInstance.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

const SENDER = {
  name: process.env.BREVO_SENDER_NAME || "FormaPro CRM",
  email: process.env.BREVO_SENDER_EMAIL,
};

// Pool DB injecté depuis server.js pour logger les emails
let _pool = null;
function setPool(pool) { _pool = pool; }

/* ─── Logger en base ─── */
async function logEmail({ to, subject, type, contact_id = null, user_id = null, status = "sent" }) {
  if (!_pool) return;
  try {
    await _pool.query(
      `INSERT INTO emails_log (to_email, subject, type, contact_id, user_id, status, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())`,
      [to, subject, type, contact_id || null, user_id || null, status]
    );
  } catch (e) {
    console.error("❌ Erreur log email:", e.message);
  }
}

/* ─── Helper générique ─── */
async function sendEmail({ to, subject, html, type = "other", contact_id = null, user_id = null }) {
  let status = "sent";
  try {
    const email = new Brevo.SendSmtpEmail();
    email.sender = SENDER;
    email.to = [{ email: to }];
    email.subject = subject;
    email.htmlContent = html;
    await apiInstance.sendTransacEmail(email);
    console.log(`✅ Email envoyé à ${to} : ${subject}`);
  } catch (e) {
    console.error("❌ Erreur Brevo:", e?.response?.body || e.message);
    status = "failed";
  } finally {
    await logEmail({ to, subject, type, contact_id, user_id, status });
  }
}

/* ─────────────────────────────────────────────
   1. Bienvenue
───────────────────────────────────────────── */
async function sendWelcomeEmail({ email, first_name, user_id = null }) {
  await sendEmail({
    to: email, type: "welcome", user_id,
    subject: "Bienvenue sur FormaPro CRM 🎉",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#059669;padding:32px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="color:white;margin:0">FormaPro CRM</h1>
          <p style="color:#d1fae5;margin:8px 0 0">Marketing Digital</p>
        </div>
        <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
          <h2 style="color:#1e293b">Bonjour ${first_name} 👋</h2>
          <p style="color:#64748b;line-height:1.6">Bienvenue sur <strong>FormaPro CRM</strong> ! Votre compte a été créé avec succès.</p>
          <div style="margin:24px 0;padding:16px;background:#f0fdf4;border-radius:8px;border-left:4px solid #059669">
            <p style="margin:0;color:#065f46;font-weight:bold">🚀 Pour commencer :</p>
            <ul style="color:#065f46;margin:8px 0 0">
              <li>Ajoutez vos premiers contacts</li>
              <li>Créez vos leads commerciaux</li>
              <li>Suivez votre pipeline de ventes</li>
            </ul>
          </div>
          <p style="color:#94a3b8;font-size:12px;margin-top:32px">© FormaPro CRM</p>
        </div>
      </div>`,
  });
}

/* ─────────────────────────────────────────────
   2. Deal gagné
───────────────────────────────────────────── */
async function sendDealWonEmail({ email, first_name, deal_title, amount, user_id = null }) {
  await sendEmail({
    to: email, type: "deal_won", user_id,
    subject: `🏆 Deal gagné : ${deal_title}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#059669;padding:32px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="color:white;margin:0;font-size:28px">🏆 Deal Gagné !</h1>
        </div>
        <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
          <h2 style="color:#1e293b">Félicitations ${first_name} !</h2>
          <div style="margin:24px 0;padding:20px;background:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0;text-align:center">
            <p style="margin:0;color:#64748b;font-size:14px">Deal</p>
            <p style="margin:4px 0;color:#1e293b;font-size:20px;font-weight:bold">${deal_title}</p>
            <p style="margin:8px 0 0;color:#059669;font-size:32px;font-weight:bold">${new Intl.NumberFormat("fr-FR").format(amount)} €</p>
          </div>
          <p style="color:#94a3b8;font-size:12px;margin-top:32px">© FormaPro CRM</p>
        </div>
      </div>`,
  });
}

/* ─────────────────────────────────────────────
   3. Nouveau lead assigné
───────────────────────────────────────────── */
async function sendNewLeadEmail({ email, first_name, lead_title, source, user_id = null }) {
  await sendEmail({
    to: email, type: "new_lead", user_id,
    subject: `🎯 Nouveau lead : ${lead_title}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#2563eb;padding:32px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="color:white;margin:0;font-size:24px">🎯 Nouveau Lead</h1>
        </div>
        <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
          <h2 style="color:#1e293b">Bonjour ${first_name},</h2>
          <div style="margin:24px 0;padding:20px;background:#eff6ff;border-radius:12px;border:1px solid #bfdbfe">
            <p style="margin:0;color:#64748b;font-size:14px">Lead</p>
            <p style="margin:4px 0;color:#1e293b;font-size:20px;font-weight:bold">${lead_title}</p>
            ${source ? `<p style="margin:8px 0 0;color:#2563eb;font-size:14px">📌 Source : ${source}</p>` : ""}
          </div>
          <p style="color:#94a3b8;font-size:12px;margin-top:32px">© FormaPro CRM</p>
        </div>
      </div>`,
  });
}

/* ─────────────────────────────────────────────
   4. Tâche en retard
───────────────────────────────────────────── */
async function sendOverdueTaskEmail({ email, first_name, task_title, due_at, user_id = null }) {
  const dateStr = due_at
    ? new Date(due_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
    : "date inconnue";
  await sendEmail({
    to: email, type: "overdue_task", user_id,
    subject: `⚠️ Tâche en retard : ${task_title}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#dc2626;padding:32px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="color:white;margin:0;font-size:24px">⚠️ Tâche en retard</h1>
        </div>
        <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
          <h2 style="color:#1e293b">Bonjour ${first_name},</h2>
          <div style="margin:24px 0;padding:20px;background:#fef2f2;border-radius:12px;border:1px solid #fecaca">
            <p style="margin:0;color:#64748b;font-size:14px">Tâche</p>
            <p style="margin:4px 0;color:#1e293b;font-size:20px;font-weight:bold">${task_title}</p>
            <p style="margin:8px 0 0;color:#dc2626;font-size:14px">📅 Échéance : ${dateStr}</p>
          </div>
          <p style="color:#94a3b8;font-size:12px;margin-top:32px">© FormaPro CRM</p>
        </div>
      </div>`,
  });
}

/* ─────────────────────────────────────────────
   5. Reset password
───────────────────────────────────────────── */
async function sendPasswordResetEmail({ email, code }) {
  await sendEmail({
    to: email, type: "password_reset",
    subject: "Votre code de réinitialisation 🔑",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
        <div style="background:#059669;padding:24px;border-radius:12px 12px 0 0;text-align:center">
          <h2 style="color:white;margin:0">FormaPro CRM</h2>
        </div>
        <div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-radius:0 0 12px 12px">
          <p>Voici votre code de réinitialisation :</p>
          <div style="font-size:36px;font-weight:bold;letter-spacing:12px;color:#059669;background:#f0fdf4;border-radius:12px;padding:24px;text-align:center;margin:24px 0">
            ${code}
          </div>
          <p style="color:#64748b;font-size:14px">Ce code expire dans <strong>15 minutes</strong>.</p>
        </div>
      </div>`,
  });
}

/* ─────────────────────────────────────────────
   6. Lead converti
───────────────────────────────────────────── */
async function sendLeadConvertedEmail({ email, first_name, lead_title, value_eur, user_id = null }) {
  await sendEmail({
    to: email, type: "lead_converted", user_id,
    subject: `🎉 Lead converti : ${lead_title}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#059669;padding:32px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="color:white;margin:0;font-size:24px">🎉 Lead Converti !</h1>
        </div>
        <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
          <h2 style="color:#1e293b">Bravo ${first_name} !</h2>
          <div style="margin:24px 0;padding:20px;background:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0;text-align:center">
            <p style="margin:0;color:#64748b;font-size:14px">Lead converti</p>
            <p style="margin:4px 0;color:#1e293b;font-size:20px;font-weight:bold">${lead_title}</p>
            ${value_eur ? `<p style="margin:8px 0 0;color:#059669;font-size:20px;font-weight:bold">💰 ${new Intl.NumberFormat("fr-FR").format(value_eur)} €</p>` : ""}
          </div>
          <p style="color:#94a3b8;font-size:12px;margin-top:32px">© FormaPro CRM</p>
        </div>
      </div>`,
  });
}

/* ─────────────────────────────────────────────
   7. Tâche assignée
───────────────────────────────────────────── */
async function sendTaskAssignedEmail({ email, first_name, task_title, due_at, assigned_by, user_id = null }) {
  const dateStr = due_at
    ? new Date(due_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
    : null;
  await sendEmail({
    to: email, type: "task_assigned", user_id,
    subject: `📋 Nouvelle tâche assignée : ${task_title}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#7c3aed;padding:32px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="color:white;margin:0;font-size:24px">📋 Nouvelle Tâche</h1>
        </div>
        <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
          <h2 style="color:#1e293b">Bonjour ${first_name},</h2>
          <p style="color:#64748b;line-height:1.6">${assigned_by ? `<strong>${assigned_by}</strong> vous a assigné une tâche :` : "Une tâche vous a été assignée :"}</p>
          <div style="margin:24px 0;padding:20px;background:#f5f3ff;border-radius:12px;border:1px solid #ddd6fe">
            <p style="margin:0;color:#1e293b;font-size:20px;font-weight:bold">${task_title}</p>
            ${dateStr ? `<p style="margin:8px 0 0;color:#7c3aed;font-size:14px">📅 Échéance : ${dateStr}</p>` : ""}
          </div>
          <p style="color:#94a3b8;font-size:12px;margin-top:32px">© FormaPro CRM</p>
        </div>
      </div>`,
  });
}

/* ─────────────────────────────────────────────
   8. Rôle changé
───────────────────────────────────────────── */
async function sendRoleChangedEmail({ email, first_name, new_role, user_id = null }) {
  const roles = {
    admin:      { label: "Administrateur", color: "#7c3aed", icon: "👑", desc: "Accès complet + gestion utilisateurs." },
    commercial: { label: "Commercial",     color: "#2563eb", icon: "💼", desc: "Accès contacts, leads, deals et tâches." },
    user:       { label: "Utilisateur",    color: "#64748b", icon: "👤", desc: "Accès lecture + vos propres tâches." },
  };
  const r = roles[new_role] || roles["user"];
  await sendEmail({
    to: email, type: "role_changed", user_id,
    subject: `${r.icon} Votre rôle : ${r.label}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:${r.color};padding:32px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="color:white;margin:0;font-size:28px">${r.icon} Nouveau rôle</h1>
        </div>
        <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
          <h2 style="color:#1e293b">Bonjour ${first_name},</h2>
          <p style="color:#64748b">Votre rôle sur <strong>FormaPro CRM</strong> a été mis à jour.</p>
          <div style="margin:24px 0;padding:20px;border-radius:12px;border:2px solid ${r.color};text-align:center">
            <p style="margin:8px 0;color:${r.color};font-size:24px;font-weight:bold">${r.icon} ${r.label}</p>
            <p style="margin:0;color:#64748b;font-size:14px">${r.desc}</p>
          </div>
          <p style="color:#94a3b8;font-size:12px;margin-top:32px">© FormaPro CRM</p>
        </div>
      </div>`,
  });
}

/* ─────────────────────────────────────────────
   9. Compte activé/désactivé
───────────────────────────────────────────── */
async function sendAccountStatusEmail({ email, first_name, is_active, user_id = null }) {
  const s = is_active
    ? { label: "activé",    color: "#059669", icon: "✅", desc: "Vous pouvez vous connecter normalement." }
    : { label: "désactivé", color: "#dc2626", icon: "🔒", desc: "Contactez votre administrateur pour plus d'infos." };
  await sendEmail({
    to: email, type: "account_status", user_id,
    subject: `${s.icon} Votre compte a été ${s.label}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:${s.color};padding:32px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="color:white;margin:0;font-size:28px">${s.icon} Compte ${s.label}</h1>
        </div>
        <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
          <h2 style="color:#1e293b">Bonjour ${first_name},</h2>
          <p style="color:#64748b">Votre compte a été <strong>${s.label}</strong> par un administrateur.</p>
          <div style="margin:24px 0;padding:20px;background:${is_active ? "#f0fdf4" : "#fef2f2"};border-radius:12px;text-align:center">
            <p style="margin:0;font-size:40px">${s.icon}</p>
            <p style="margin:8px 0 0;color:${s.color};font-size:18px;font-weight:bold">Compte ${s.label}</p>
            <p style="margin:8px 0 0;color:#64748b;font-size:14px">${s.desc}</p>
          </div>
          <p style="color:#94a3b8;font-size:12px;margin-top:32px">© FormaPro CRM</p>
        </div>
      </div>`,
  });
}

// REMPLACE la dernière ligne module.exports par :
module.exports = {
  setPool,
  sendEmail,           // ← AJOUTER CETTE LIGNE
  sendWelcomeEmail,
  sendDealWonEmail,
  sendNewLeadEmail,
  sendOverdueTaskEmail,
  sendPasswordResetEmail,
  sendLeadConvertedEmail,
  sendTaskAssignedEmail,
  sendRoleChangedEmail,
  sendAccountStatusEmail,
};