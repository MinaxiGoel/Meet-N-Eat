import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { sessionSecret } from "./config.js";

const mac = (body) => createHmac("sha256", sessionSecret()).update(body).digest("base64url");

// Signed, tamper-proof tokens (used for login cookies and email links).
export function sign(purpose, payload, ttlSeconds) {
  const body = Buffer.from(
    JSON.stringify({ ...payload, p: purpose, exp: Math.floor(Date.now() / 1000) + ttlSeconds }),
  ).toString("base64url");
  return `${body}.${mac(body)}`;
}

export function verify(purpose, token) {
  if (typeof token !== "string" || token.length > 4096) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = Buffer.from(mac(body));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  let data;
  try { data = JSON.parse(Buffer.from(body, "base64url").toString("utf8")); } catch { return null; }
  if (data.p !== purpose || typeof data.exp !== "number" || data.exp < Date.now() / 1000) return null;
  return data;
}

export const randomToken = (bytes = 24) => randomBytes(bytes).toString("base64url");

const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
export function referralCode(length = 8) {
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}
