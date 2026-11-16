// Email copy (PRD section 15). Each function returns { subject, html, text }.
// The words still need the humanising pass with Skill Hunter (PRD action items).

const esc = (value) => String(value ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const COLORS = { ink: "#26352e", muted: "#73796e", paper: "#faf8f1", green: "#35483c", orange: "#d98258", line: "#e6e1d5" };

function layout(bodyHtml, footerHtml) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:${COLORS.paper};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.paper};">
<tr><td align="center" style="padding:28px 14px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fffdf8;border:1px solid ${COLORS.line};border-radius:14px;">
<tr><td style="padding:26px 28px 6px;font-family:Georgia,'Times New Roman',serif;font-size:21px;color:${COLORS.ink};">
🍽️ Meet-<span style="color:${COLORS.orange};font-style:italic;">N</span>-Eat</td></tr>
<tr><td style="padding:8px 28px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:${COLORS.ink};">
${bodyHtml}
</td></tr></table>
<p style="max-width:520px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:${COLORS.muted};margin:14px auto 0;">${footerHtml}</p>
</td></tr></table></body></html>`;
}

const button = (href, label, primary = true) =>
  `<a href="${esc(href)}" style="display:block;margin:0 0 10px;padding:13px 16px;border-radius:10px;text-decoration:none;text-align:center;font-weight:bold;font-size:14px;${
    primary ? `background:${COLORS.green};color:#ffffff;` : `background:#f1eee4;color:${COLORS.green};border:1px solid ${COLORS.line};`
  }">${label}</a>`;

const p = (html) => `<p style="margin:0 0 14px;">${html}</p>`;

// Email 1 — monthly check-in. links: { break, pause, leave, site }
export function checkinEmail({ firstName, month, links }) {
  const subject = `Are you in for ${month}? 🍽️`;
  const html = layout(
    p(`Hi ${esc(firstName)} 👋`)
    + p(`New month, new face to meet! We're plating up your ${esc(month)} match. 🍳`)
    + p(`<strong>Staying in? No action needed.</strong> Do nothing and you're in.`)
    + p(`Based on your responses, we'll start pairing everyone up soon, so expect your partner's details in your inbox next week. (Curious? You can peek on the site from the 8th 👀)`)
    + p(`Need some time out? Just pick one:`)
    + button(links.break, "☕ Take a break this month", false)
    + button(links.pause, "⏸️ Pause until I'm back", false)
    + button(links.leave, "👋 Opt out", false)
    + p(`<span style="font-size:13px;color:${COLORS.muted};">Each button opens a page where one tap confirms it. No login needed, and you can change your mind anytime in Settings.</span>`)
    + p(`See you at the table,<br>The Meet-N-Eat team`),
    `You're getting this because you're a Meet-N-Eat member. <a href="${esc(links.site)}" style="color:${COLORS.muted};">Open Meet-N-Eat</a>`,
  );
  const text = `Hi ${firstName},

New month, new face to meet! We're plating up your ${month} match.

Staying in? No action needed. Do nothing and you're in.

Based on your responses, we'll start pairing everyone up soon, so expect your partner's details in your inbox next week. (Curious? You can peek on the site from the 8th.)

Need some time out? Just pick one:
- Take a break this month: ${links.break}
- Pause until I'm back: ${links.pause}
- Opt out: ${links.leave}

Each link opens a page where one tap confirms it. No login needed, and you can change your mind anytime in Settings.

See you at the table,
The Meet-N-Eat team
${links.site}`;
  return { subject, html, text };
}

// Email 1 — version for paused members. links: { back, leave, site }
export function pausedCheckinEmail({ firstName, month, links }) {
  const subject = `Fancy jumping back in for ${month}? ☕`;
  const html = layout(
    p(`Hi ${esc(firstName)},`)
    + p(`You're on pause right now, and that's totally fine. If you'd like a match this month, tap below. If not, do nothing and you'll stay paused.`)
    + button(links.back, "✅ I'm back, count me in")
    + button(links.leave, "👋 Opt out", false)
    + p(`Hope you're doing well,<br>The Meet-N-Eat team`),
    `You're getting this because you're a Meet-N-Eat member on pause. <a href="${esc(links.site)}" style="color:${COLORS.muted};">Open Meet-N-Eat</a>`,
  );
  const text = `Hi ${firstName},

You're on pause right now, and that's totally fine. If you'd like a match this month, use the first link. If not, do nothing and you'll stay paused.

- I'm back, count me in: ${links.back}
- Opt out: ${links.leave}

Hope you're doing well,
The Meet-N-Eat team`;
  return { subject, html, text };
}

// Email 2 — your match. partner: { firstName, lastName, jobTitle, company, funFacts, linkedinUrl, photoUrl }
export function matchEmail({ firstName, month, partner, links }) {
  const fullName = `${partner.firstName} ${partner.lastName}`;
  const subject = `Meet ${partner.firstName}, your Meet-N-Eat match for ${month} ☕`;
  const photo = partner.photoUrl
    ? `<img src="${esc(partner.photoUrl)}" width="72" height="72" alt="" style="display:block;width:72px;height:72px;border-radius:50%;object-fit:cover;margin:0 auto 10px;">`
    : "";
  const card = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;background:#f5f3eb;border-radius:12px;">
<tr><td style="padding:20px;text-align:center;">${photo}
<div style="font-family:Georgia,serif;font-size:21px;color:${COLORS.ink};">${esc(fullName)}</div>
<div style="font-size:14px;color:${COLORS.muted};margin:2px 0 10px;">${esc(partner.jobTitle)} at ${esc(partner.company)}</div>
<div style="font-family:Georgia,serif;font-style:italic;font-size:15px;color:${COLORS.green};margin:0 0 14px;">“${esc(partner.funFacts)}”</div>
${button(partner.linkedinUrl, "Open LinkedIn profile ↗")}
</td></tr></table>`;
  const html = layout(
    p(`Hi ${esc(firstName)},`)
    + p(`The plate has turned. 🎉 Say hello to your match for ${esc(month)}:`)
    + card
    + p(`<strong>What's next?</strong> Send ${esc(partner.firstName)} a quick DM on LinkedIn and pick a 30-minute slot that works for you both, on Google Meet, Teams, Zoom or whatever you like.`)
    + p(`They're expecting your message, so go ahead and take the lead. 😉`)
    + p(`Not sure what to talk about? Try:<br>• a hobby you could talk about for hours<br>• where you live and what you love about it<br>• your favourite way to spend a free afternoon<br>• something you're quietly proud of`)
    + p(`Grab your coffee and a snack, get comfy, and enjoy getting to know each other. 🥐`)
    + p(`<span style="font-size:13px;color:${COLORS.muted};">A small note: our members come from all over the world, so chat in English. That way you can connect with anyone.</span>`)
    + button(links.site, "See your match on Meet-N-Eat", false)
    + p(`Happy chatting,<br>The Meet-N-Eat team`),
    `Need a break next month? You can change that anytime in <a href="${esc(links.settings)}" style="color:${COLORS.muted};">Settings</a>.`,
  );
  const text = `Hi ${firstName},

The plate has turned! Say hello to your match for ${month}:

${fullName}
${partner.jobTitle} at ${partner.company}
"${partner.funFacts}"
LinkedIn: ${partner.linkedinUrl}

What's next? Send ${partner.firstName} a quick DM on LinkedIn and pick a 30-minute slot that works for you both, on Google Meet, Teams, Zoom or whatever you like.

They're expecting your message, so go ahead and take the lead.

Not sure what to talk about? Try:
- a hobby you could talk about for hours
- where you live and what you love about it
- your favourite way to spend a free afternoon
- something you're quietly proud of

Grab your coffee and a snack, get comfy, and enjoy getting to know each other.

A small note: our members come from all over the world, so chat in English. That way you can connect with anyone.

Happy chatting,
The Meet-N-Eat team
${links.site}`;
  return { subject, html, text };
}

// Replaces Email 2 when someone who was in didn't get a partner.
export function noMatchEmail({ firstName, nextMonth, links }) {
  const subject = "No match this month, but you're first in line 💛";
  const body = `Hi ${firstName}, we couldn't find a brand-new person for you this month (sometimes the numbers just don't add up). You'll be first in line in ${nextMonth}. Thanks for your patience, and see you then! ☕`;
  const html = layout(p(esc(body)) + p(`The Meet-N-Eat team`), `<a href="${esc(links.site)}" style="color:${COLORS.muted};">Open Meet-N-Eat</a>`);
  return { subject, html, text: `${body}\n\nThe Meet-N-Eat team\n${links.site}` };
}
