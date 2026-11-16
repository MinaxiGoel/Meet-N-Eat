import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { SITE_URL } from "@/lib/config";
import { query } from "@/lib/db";
import { currentPeriod, nextPeriod, monthLabel } from "@/lib/dates";
import { sendEmail } from "@/lib/email";
import { photoPath } from "@/lib/members";
import { checkinEmail, matchEmail, noMatchEmail, pausedCheckinEmail } from "@/lib/templates";
import { sign } from "@/lib/tokens";

// Admin-only: send ONE sample email to ONE member, to check how it looks.
// /api/test-email?key=<CRON_SECRET>&email=<member email>&type=checkin|paused|match|no_match
// Nothing is logged and nobody else is emailed. Choice links in the sample really work for that member.
export async function GET(request) {
  const params = request.nextUrl.searchParams;
  const secret = Buffer.from(process.env.CRON_SECRET || "");
  const given = Buffer.from(params.get("key") || "");
  if (secret.length < 16 || given.length !== secret.length || !timingSafeEqual(given, secret)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }
  const type = params.get("type") || "checkin";
  const { rows: [member] } = await query(
    "SELECT id, email, first_name, last_name, job_title, company, linkedin_url, fun_facts, photo_key, (photo IS NOT NULL) AS has_photo FROM members WHERE email = $1",
    [params.get("email") || ""],
  );
  if (!member) return NextResponse.json({ error: "No member with that email." }, { status: 404 });

  const period = currentPeriod();
  const month = monthLabel(period);
  const token = sign("choice", { m: member.id, per: period }, 60 * 60 * 24 * 7);
  const link = (a) => `${SITE_URL}/choice?t=${encodeURIComponent(token)}&a=${a}`;
  const links = {
    break: link("break"), pause: link("pause"), leave: link("leave"), back: link("back"),
    site: SITE_URL, settings: `${SITE_URL}/app?tab=settings`,
  };
  // For the match sample, the "partner" is the member themself (so no one else's details are shared).
  const partner = {
    firstName: member.first_name, lastName: member.last_name, jobTitle: member.job_title,
    company: member.company, linkedinUrl: member.linkedin_url, funFacts: member.fun_facts,
    photoUrl: photoPath(member, true),
  };
  const content = {
    checkin: () => checkinEmail({ firstName: member.first_name, month, links }),
    paused: () => pausedCheckinEmail({ firstName: member.first_name, month, links }),
    match: () => matchEmail({ firstName: member.first_name, month, partner, links }),
    no_match: () => noMatchEmail({ firstName: member.first_name, nextMonth: monthLabel(nextPeriod(period)), links }),
  }[type];
  if (!content) return NextResponse.json({ error: "type must be checkin, paused, match or no_match" }, { status: 400 });

  const email = content();
  try {
    await sendEmail({ to: member.email, ...email, subject: `[TEST] ${email.subject}` });
  } catch (error) {
    return NextResponse.json({ error: `Sending failed: ${error.message}` }, { status: 500 });
  }
  return NextResponse.json({ ok: true, sentTo: member.email, type });
}
