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

/* ─── Helper générique ─── */
async function sendEmail({ to, subject, html }) {
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
  }
}

/* ─────────────────────────────────────────────
   1. Email de bienvenue à l'inscription
───────────────────────────────────────────── */
async function sendWelcomeEmail({ email, first_name }) {
  await sendEmail({
    to: email,
    subject: "Bienvenue sur FormaPro CRM 🎉",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #059669; padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">FormaPro CRM</h1>
          <p style="color: #d1fae5; margin: 8px 0 0;">Marketing Digital</p>
        </div>
        <div style="background: #ffffff; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0;">
          <h2 style="color: #1e293b;">Bonjour ${first_name} 👋</h2>
          <p style="color: #64748b; line-height: 1.6;">
            Bienvenue sur <strong>FormaPro CRM</strong> ! Votre compte a été créé avec succès.
          </p>
          <p style="color: #64748b; line-height: 1.6;">
            Vous pouvez maintenant gérer vos contacts, suivre vos leads et piloter votre pipeline commercial.
          </p>
          <div style="margin: 24px 0; padding: 16px; background: #f0fdf4; border-radius: 8px; border-left: 4px solid #059669;">
            <p style="margin: 0; color: #065f46; font-weight: bold;">🚀 Pour commencer :</p>
            <ul style="color: #065f46; margin: 8px 0 0;">
              <li>Ajoutez vos premiers contacts</li>
              <li>Créez vos leads commerciaux</li>
              <li>Suivez votre pipeline de ventes</li>
            </ul>
          </div>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 32px;">
            © FormaPro CRM — Marketing Digital
          </p>
        </div>
      </div>
    `,
  });
}

/* ─────────────────────────────────────────────
   2. Email quand un deal est gagné
───────────────────────────────────────────── */
async function sendDealWonEmail({ email, first_name, deal_title, amount }) {
  await sendEmail({
    to: email,
    subject: `🏆 Deal gagné : ${deal_title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #059669; padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🏆 Deal Gagné !</h1>
        </div>
        <div style="background: #ffffff; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0;">
          <h2 style="color: #1e293b;">Félicitations ${first_name} !</h2>
          <p style="color: #64748b; line-height: 1.6;">
            Vous venez de remporter un nouveau deal. Voici le récapitulatif :
          </p>
          <div style="margin: 24px 0; padding: 20px; background: #f0fdf4; border-radius: 12px; border: 1px solid #bbf7d0; text-align: center;">
            <p style="margin: 0; color: #64748b; font-size: 14px;">Deal</p>
            <p style="margin: 4px 0; color: #1e293b; font-size: 20px; font-weight: bold;">${deal_title}</p>
            <p style="margin: 8px 0 0; color: #059669; font-size: 32px; font-weight: bold;">
              ${new Intl.NumberFormat("fr-FR").format(amount)} €
            </p>
          </div>
          <p style="color: #64748b; line-height: 1.6;">
            Continuez sur cette lancée ! Rendez-vous sur votre dashboard pour suivre vos performances.
          </p>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 32px;">
            © FormaPro CRM — Marketing Digital
          </p>
        </div>
      </div>
    `,
  });
}

/* ─────────────────────────────────────────────
   3. Email quand un lead est créé
───────────────────────────────────────────── */
async function sendNewLeadEmail({ email, first_name, lead_title, source }) {
  await sendEmail({
    to: email,
    subject: `🎯 Nouveau lead : ${lead_title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #2563eb; padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🎯 Nouveau Lead</h1>
        </div>
        <div style="background: #ffffff; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0;">
          <h2 style="color: #1e293b;">Bonjour ${first_name},</h2>
          <p style="color: #64748b; line-height: 1.6;">
            Un nouveau lead vient d'être ajouté à votre CRM :
          </p>
          <div style="margin: 24px 0; padding: 20px; background: #eff6ff; border-radius: 12px; border: 1px solid #bfdbfe;">
            <p style="margin: 0; color: #64748b; font-size: 14px;">Lead</p>
            <p style="margin: 4px 0; color: #1e293b; font-size: 20px; font-weight: bold;">${lead_title}</p>
            ${source ? `<p style="margin: 8px 0 0; color: #2563eb; font-size: 14px;">📌 Source : ${source}</p>` : ""}
          </div>
          <p style="color: #64748b; line-height: 1.6;">
            Pensez à qualifier ce lead rapidement pour maximiser vos chances de conversion !
          </p>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 32px;">
            © FormaPro CRM — Marketing Digital
          </p>
        </div>
      </div>
    `,
  });
}

/* ─────────────────────────────────────────────
   4. Email de rappel pour tâche en retard
───────────────────────────────────────────── */
async function sendOverdueTaskEmail({ email, first_name, task_title, due_at }) {
  const dateStr = due_at
    ? new Date(due_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
    : "date inconnue";

  await sendEmail({
    to: email,
    subject: `⚠️ Tâche en retard : ${task_title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Tâche en retard</h1>
        </div>
        <div style="background: #ffffff; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0;">
          <h2 style="color: #1e293b;">Bonjour ${first_name},</h2>
          <p style="color: #64748b; line-height: 1.6;">
            Une tâche n'a pas encore été effectuée et est maintenant en retard :
          </p>
          <div style="margin: 24px 0; padding: 20px; background: #fef2f2; border-radius: 12px; border: 1px solid #fecaca;">
            <p style="margin: 0; color: #64748b; font-size: 14px;">Tâche</p>
            <p style="margin: 4px 0; color: #1e293b; font-size: 20px; font-weight: bold;">${task_title}</p>
            <p style="margin: 8px 0 0; color: #dc2626; font-size: 14px;">📅 Échéance : ${dateStr}</p>
          </div>
          <p style="color: #64748b; line-height: 1.6;">
            Pensez à traiter cette tâche dès que possible ou à mettre à jour son échéance.
          </p>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 32px;">
            © FormaPro CRM — Marketing Digital
          </p>
        </div>
      </div>
    `,
  });
}
async function sendPasswordResetEmail({ email, code }) {
  await sendEmail({
    to: email,
    subject: "Votre code de réinitialisation 🔑",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px">
        <div style="background:#059669;padding:24px;border-radius:12px 12px 0 0;text-align:center">
          <h2 style="color:white;margin:0">FormaPro CRM</h2>
        </div>
        <div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-radius:0 0 12px 12px">
          <p>Voici votre code de réinitialisation :</p>
          <div style="font-size:36px;font-weight:bold;letter-spacing:12px;color:#059669;
                      background:#f0fdf4;border-radius:12px;padding:24px;text-align:center;margin:24px 0">
            ${code}
          </div>
          <p style="color:#64748b;font-size:14px">Ce code expire dans <strong>15 minutes</strong>.</p>
          <p style="color:#64748b;font-size:14px">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
        </div>
      </div>
    `,
  });
}

module.exports = { sendWelcomeEmail, sendDealWonEmail, sendNewLeadEmail, sendOverdueTaskEmail, sendPasswordResetEmail };

