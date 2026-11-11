/**
 * Lightweight Resend mailer for Crafthand Market notifications.
 * Configure on Vercel / .env:
 * - RESEND_API_KEY
 * - EMAIL_FROM (e.g. "Crafthand Market <onboarding@resend.dev>")
 * - ADMIN_EMAIL (receives new workshop applications)
 */

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY)
}

export async function sendEmail({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM || "Crafthand Market <onboarding@resend.dev>"

  if (!apiKey) {
    return {
      ok: false,
      skipped: true,
      reason: "RESEND_API_KEY is not configured",
    }
  }

  if (!to) {
    return { ok: false, skipped: true, reason: "Missing recipient" }
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, " "),
    }),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    return {
      ok: false,
      skipped: false,
      reason: payload?.message || `Email provider error (${response.status})`,
      payload,
    }
  }

  return { ok: true, skipped: false, id: payload.id }
}

export function storeSubmittedEmail({ store, appUrl }) {
  const dashboardHint = `${appUrl}/store`
  const approveHint = `${appUrl}/admin/approve`
  return {
    artisan: {
      to: store.email,
      subject: `We received your Crafthand Market application (@${store.username})`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #292524;">
          <h2>Thanks for registering, ${store.name}!</h2>
          <p>Your workshop application for <strong>@${store.username}</strong> is now <strong>pending admin review</strong>.</p>
          <p>Workshop: ${store.name}<br/>Email: ${store.email}<br/>Contact: ${store.contact}</p>
          <p>After approval, your seller dashboard will be ready at:<br/>
          <a href="${dashboardHint}">${dashboardHint}</a></p>
          <p>— Crafthand Market</p>
        </div>
      `,
    },
    admin: {
      to: process.env.ADMIN_EMAIL,
      subject: `New artisan application: ${store.name} (@${store.username})`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #292524;">
          <h2>New workshop application</h2>
          <p><strong>${store.name}</strong> (@${store.username}) just applied.</p>
          <p>${store.description}</p>
          <p>Email: ${store.email}<br/>Phone: ${store.contact}<br/>Address: ${store.address}</p>
          <p>Review and approve here:<br/><a href="${approveHint}">${approveHint}</a></p>
        </div>
      `,
    },
  }
}

export function storeDecisionEmail({ store, status, appUrl }) {
  const approved = status === "approved"
  return {
    to: store.email,
    subject: approved
      ? `Your Crafthand Market store @${store.username} is approved`
      : `Update on your Crafthand Market application (@${store.username})`,
    html: approved
      ? `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #292524;">
          <h2>Congratulations, ${store.name}!</h2>
          <p>Your workshop <strong>@${store.username}</strong> has been <strong>approved</strong>.</p>
          <p>Open your seller dashboard and start listing products:<br/>
          <a href="${appUrl}/store">${appUrl}/store</a></p>
          <p>— Crafthand Market</p>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #292524;">
          <h2>Application update</h2>
          <p>Your workshop application for <strong>@${store.username}</strong> was <strong>rejected</strong>.</p>
          <p>You can contact the Crafthand Market team for next steps.</p>
        </div>
      `,
  }
}
