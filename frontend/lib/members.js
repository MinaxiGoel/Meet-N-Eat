import { query } from "./db.js";
import { SITE_URL } from "./config.js";

export const MEMBER_COLUMNS = `id, email, first_name, last_name, gender, job_title, company, linkedin_url,
  fun_facts, timezone, status, referral_code, photo_key, (photo IS NOT NULL) AS has_photo, created_at`;

export function photoPath(row, absolute = false) {
  if (!row?.has_photo) return null;
  return `${absolute ? SITE_URL : ""}/api/photo/${row.photo_key}`;
}

export function toMember(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    gender: row.gender,
    jobTitle: row.job_title,
    company: row.company,
    linkedinUrl: row.linkedin_url,
    funFacts: row.fun_facts,
    timezone: row.timezone,
    status: row.status,
    referralCode: row.referral_code,
    photoUrl: photoPath(row),
  };
}

// What a match is allowed to see (never email or gender).
export function toPartner(row, absolute = false) {
  return {
    firstName: row.first_name,
    lastName: row.last_name,
    jobTitle: row.job_title,
    company: row.company,
    linkedinUrl: row.linkedin_url,
    funFacts: row.fun_facts,
    photoUrl: photoPath(row, absolute),
  };
}

export async function getMemberRow(id) {
  if (!id) return null;
  const { rows } = await query(`SELECT ${MEMBER_COLUMNS} FROM members WHERE id = $1`, [id]);
  return rows[0] || null;
}
