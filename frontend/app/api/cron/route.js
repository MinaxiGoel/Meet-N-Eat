import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runScheduler } from "@/lib/jobs";

export const maxDuration = 60;

function authorised(request) {
  const secret = process.env.CRON_SECRET || "";
  if (secret.length < 16) return false;
  const header = request.headers.get("authorization") || "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : request.nextUrl.searchParams.get("key") || "";
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Called by cron-job.org every 15 minutes: runs pairing when due and sends due emails.
async function handle(request) {
  if (!authorised(request)) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  return NextResponse.json(await runScheduler());
}
export const GET = handle;
export const POST = handle;
