import nodemailer from "nodemailer";

let transport;
function getTransport() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("Email isn't set up yet: add SMTP_USER and SMTP_PASS (Gmail App Password).");
  }
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transport;
}

export const emailDryRun = () => process.env.EMAIL_DRY_RUN === "1";

// message: { to, subject, html, text, unsubscribeUrl? }
export async function sendEmail(message) {
  const headers = {};
  if (message.unsubscribeUrl) {
    // Gmail's own "Unsubscribe" button: a true one-click opt-out (RFC 8058).
    headers["List-Unsubscribe"] = `<${message.unsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }
  if (emailDryRun()) {
    console.log(`\n--- EMAIL (dry run) to ${message.to}: ${message.subject}\n${message.text}\n---`);
    return;
  }
  const from = `"${process.env.EMAIL_FROM_NAME || "Meet-N-Eat"}" <${process.env.SMTP_USER}>`;
  await getTransport().sendMail({
    from, to: message.to, subject: message.subject, html: message.html, text: message.text, headers,
  });
}
