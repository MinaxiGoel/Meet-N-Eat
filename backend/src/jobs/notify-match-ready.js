import "dotenv/config";
import { pool, initializeDatabase } from "../db.js";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM;
const siteUrl = (process.env.PUBLIC_SITE_URL || process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");

function escapeHtml(value = "") {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

async function main() {
  if (!apiKey || !from) throw new Error("RESEND_API_KEY and EMAIL_FROM are required to send match emails.");
  await initializeDatabase();
  const period = new Date().toISOString().slice(0, 7);
  const monthLabel = new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${period}-01T00:00:00Z`));
  const { rows } = await pool.query(
    `SELECT m.id AS match_id, m.period, member.id AS member_id, member.first_name, member.contact_email
     FROM monthly_matches m
     JOIN members member ON member.id = m.member_one OR member.id = m.member_two
     JOIN members partner ON partner.id = CASE WHEN member.id = m.member_one THEN m.member_two ELSE m.member_one END
     WHERE m.period = $1 AND member.email_consent = TRUE AND member.contact_email IS NOT NULL
       AND member.opted_out_at IS NULL AND partner.opted_out_at IS NULL
     ORDER BY member.id`,
    [period],
  );

  let sent = 0;
  let failed = 0;
  for (const recipient of rows) {
    const claim = await pool.query(
      `INSERT INTO email_deliveries (match_id, member_id, period, status)
       VALUES ($1, $2, $3, 'pending')
       ON CONFLICT (match_id, member_id) DO UPDATE SET status = 'pending', created_at = NOW()
       WHERE email_deliveries.status = 'failed'
          OR (email_deliveries.status = 'pending' AND email_deliveries.created_at < NOW() - INTERVAL '15 minutes')
       RETURNING id`,
      [recipient.match_id, recipient.member_id, period],
    );
    if (!claim.rowCount) continue;

    const firstName = escapeHtml(recipient.first_name || "there");
    const html = `<div style="background:#fbf8f1;padding:36px 16px;font-family:Arial,sans-serif;color:#27352f"><div style="max-width:560px;margin:auto;background:#fffdf8;padding:36px;border:1px solid #e6e0d4"><p style="color:#637b64;font-size:11px;letter-spacing:2px;text-transform:uppercase">Meet &amp; Eat · ${escapeHtml(monthLabel)}</p><h1 style="font-family:Georgia,serif;font-weight:normal;font-size:34px;line-height:1.1">Your new perspective is ready.</h1><p style="color:#777d72;line-height:1.8">Hi ${firstName}, your ${escapeHtml(monthLabel)} match is waiting. Set aside 30 minutes, say hello on LinkedIn, and bring a little curiosity.</p><p style="margin:28px 0"><a href="${siteUrl}/#dashboard" style="display:inline-block;background:#27352f;color:#fffdf8;text-decoration:none;padding:14px 19px">Reveal your match ↗</a></p><p style="color:#777d72;font-size:13px;line-height:1.7">A small ice-breaker for your chat: What’s a meal that always feels like home to you?</p><hr style="border:0;border-top:1px solid #e6e0d4;margin:28px 0"><p style="color:#8b8d83;font-size:11px">One thoughtful introduction at your chosen pace. You can pause matching in settings.<br>You’re receiving this because you opted in to match emails.</p></div></div>`;
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `meet-and-eat-${recipient.match_id}-${recipient.member_id}`,
        },
        body: JSON.stringify({
          from,
          to: [recipient.contact_email],
          subject: `Your ${monthLabel} Meet & Eat match is ready`,
          html,
          text: `Hi ${recipient.first_name || "there"}, your ${monthLabel} match is ready. Reveal them at ${siteUrl}/#dashboard. Set aside 30 minutes and ask: What’s a meal that always feels like home to you? You can pause matching in your Meet & Eat settings.`,
        }),
      });
      if (!response.ok) throw new Error(`Resend returned ${response.status}: ${await response.text()}`);
      await pool.query("UPDATE email_deliveries SET status = 'sent', sent_at = NOW() WHERE id = $1", [claim.rows[0].id]);
      sent += 1;
    } catch (error) {
      await pool.query("UPDATE email_deliveries SET status = 'failed' WHERE id = $1", [claim.rows[0].id]);
      console.error(`Could not email member ${recipient.member_id}:`, error.message);
      failed += 1;
    }
  }
  console.log(`Match email run for ${period}: ${sent} sent, ${failed} failed, ${rows.length - sent - failed} already sent or not eligible.`);
  if (failed) process.exitCode = 1;
}

try { await main(); } finally { await pool.end(); }
