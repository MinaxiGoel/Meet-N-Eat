import "dotenv/config";
import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool, initializeDatabase } from "./db.js";
import passport, { linkedinEnabled } from "./passport.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const isProduction = process.env.NODE_ENV === "production";
const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
const PgSession = connectPgSimple(session);
const genderOptions = new Set(["man", "woman", "non_binary", "prefer_not_to_say"]);
const frequencyMonths = { monthly: 1, every_two_months: 2, quarterly: 3 };

if (isProduction && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)) {
  throw new Error("In production, SESSION_SECRET must be set to a random value of at least 32 characters.");
}

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));
app.use(session({
  store: new PgSession({ pool, createTableIfMissing: true }),
  name: "meetandeat.sid",
  secret: process.env.SESSION_SECRET || "local-only-change-this-session-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: isProduction, sameSite: "lax", maxAge: 1000 * 60 * 60 * 24 * 30 },
}));
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
  const origin = req.get("origin");
  if (!origin) return next();
  try {
    if (new URL(origin).origin !== new URL(frontendUrl).origin) {
      return res.status(403).json({ error: "Request origin is not allowed." });
    }
  } catch {
    return res.status(403).json({ error: "Request origin is not allowed." });
  }
  next();
});

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const requireMember = (req, res, next) => {
  if (!req.isAuthenticated?.() || req.user?.opted_out_at) return res.status(401).json({ error: "Sign in to continue." });
  next();
};

function formatMember(member) {
  if (!member) return null;
  return {
    id: member.id,
    firstName: member.first_name,
    lastName: member.last_name,
    name: [member.first_name, member.last_name].filter(Boolean).join(" ") || member.name,
    email: member.email,
    contactEmail: member.contact_email,
    genderIdentity: member.gender_identity,
    photoUrl: member.photo_url,
    linkedinUrl: member.linkedin_url,
    interests: member.interests || [],
    emailConsent: Boolean(member.email_consent),
    profileCompleted: Boolean(member.profile_completed),
    matchingFrequency: member.matching_frequency || "monthly",
    optedOut: Boolean(member.opted_out_at),
  };
}

function monthIndex(period) {
  const [year, month] = period.split("-").map(Number);
  return year * 12 + month - 1;
}

function periodFromIndex(index) {
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

app.get("/health", (_req, res) => res.json({ ok: true, service: "meet-and-eat-api" }));
app.get("/auth/status", (_req, res) => res.json({ linkedinEnabled }));
app.get("/auth/session", (req, res) => res.json({ member: formatMember(req.user) }));

app.get("/auth/linkedin", (req, res, next) => {
  if (!linkedinEnabled) return res.status(503).json({ error: "LinkedIn sign-in is not configured yet." });
  passport.authenticate("linkedin")(req, res, next);
});

app.get("/auth/linkedin/callback", (req, res, next) => {
  if (!linkedinEnabled) return res.redirect(`${frontendUrl}/?signin=unavailable`);
  passport.authenticate("linkedin", { failureRedirect: `${frontendUrl}/?signin=failed` })(req, res, next);
}, (req, res, next) => req.session.save((error) => error ? next(error) : res.redirect(`${frontendUrl}/?signin=success`)));

app.post("/auth/logout", (req, res, next) => {
  req.logout((error) => {
    if (error) return next(error);
    req.session.destroy((sessionError) => {
      if (sessionError) return next(sessionError);
      res.clearCookie("meetandeat.sid", { httpOnly: true, secure: isProduction, sameSite: "lax" });
      res.status(204).end();
    });
  });
});

app.get("/profile", requireMember, asyncRoute(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name, first_name, last_name, gender_identity, email, contact_email, linkedin_url,
            interests, email_consent, profile_completed, matching_frequency, opted_out_at
     FROM members WHERE id = $1`,
    [req.user.id],
  );
  res.json({ profile: formatMember(rows[0]) });
}));

app.put("/profile", requireMember, asyncRoute(async (req, res) => {
  const firstName = typeof req.body.firstName === "string" ? req.body.firstName.trim() : "";
  const lastName = typeof req.body.lastName === "string" ? req.body.lastName.trim() : "";
  const genderIdentity = typeof req.body.genderIdentity === "string" ? req.body.genderIdentity : "";
  const contactEmail = typeof req.body.contactEmail === "string" ? req.body.contactEmail.trim().toLowerCase() : "";
  const linkedinUrl = typeof req.body.linkedinUrl === "string" ? req.body.linkedinUrl.trim() : "";
  const interests = Array.isArray(req.body.interests)
    ? [...new Set(req.body.interests.filter((item) => typeof item === "string").map((item) => item.trim()).filter(Boolean))].slice(0, 15)
    : [];

  if (firstName.length < 1 || firstName.length > 80) return res.status(400).json({ error: "Enter your first name." });
  if (lastName.length < 1 || lastName.length > 80) return res.status(400).json({ error: "Enter your last name." });
  if (!genderOptions.has(genderIdentity)) return res.status(400).json({ error: "Choose a gender identity." });
  if (contactEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return res.status(400).json({ error: "Enter a valid email address for your monthly match details." });
  }
  if (linkedinUrl) {
    try {
      const parsed = new URL(linkedinUrl);
      if (!/^https?:$/.test(parsed.protocol) || !/(^|\.)linkedin\.com$/i.test(parsed.hostname)) throw new Error("invalid LinkedIn URL");
    } catch {
      return res.status(400).json({ error: "Add a valid LinkedIn profile URL, or leave it blank." });
    }
  }
  if (!interests.length) return res.status(400).json({ error: "Choose at least one interest." });
  if (interests.some((interest) => interest.length > 50)) return res.status(400).json({ error: "Each interest must be 50 characters or fewer." });

  const { rows } = await pool.query(
    `UPDATE members SET first_name = $2, last_name = $3, gender_identity = $4, contact_email = $5,
       linkedin_url = $6, interests = $7, email_consent = TRUE, profile_completed = TRUE, updated_at = NOW()
     WHERE id = $1
     RETURNING id, name, first_name, last_name, gender_identity, email, contact_email, linkedin_url,
               interests, email_consent, profile_completed, matching_frequency, opted_out_at`,
    [req.user.id, firstName, lastName, genderIdentity, contactEmail, linkedinUrl || null, interests],
  );
  req.user = { ...req.user, ...rows[0] };
  res.json({ profile: formatMember(rows[0]) });
}));

app.get("/matches/current", requireMember, asyncRoute(async (req, res) => {
  const currentPeriod = new Date().toISOString().slice(0, 7);
  const { rows: currentRows } = await pool.query(
    `SELECT m.id, m.period, p.first_name AS partner_first_name, p.last_name AS partner_last_name,
            p.name AS partner_name, p.photo_url AS partner_photo, p.linkedin_url AS partner_linkedin,
            p.interests AS partner_interests, p.gender_identity AS partner_gender
     FROM monthly_matches m
     JOIN members p ON p.id = CASE WHEN m.member_one = $1 THEN m.member_two ELSE m.member_one END
     WHERE (m.member_one = $1 OR m.member_two = $1) AND m.period = $2 AND p.opted_out_at IS NULL
     LIMIT 1`,
    [req.user.id, currentPeriod],
  );

  const current = currentRows[0];
  const member = req.user;
  const frequency = member.matching_frequency || "monthly";
  let nextPeriod = null;
  if (frequency !== "paused") {
    const { rows: lastRows } = await pool.query(
      `SELECT MAX(period) AS last_period FROM monthly_matches WHERE member_one = $1 OR member_two = $1`,
      [member.id],
    );
    const lastPeriod = lastRows[0]?.last_period;
    const currentIndex = monthIndex(currentPeriod);
    const cadence = frequencyMonths[frequency] || 1;
    const candidateIndex = lastPeriod ? monthIndex(lastPeriod) + cadence : currentIndex + 1;
    nextPeriod = periodFromIndex(candidateIndex > currentIndex ? candidateIndex : currentIndex + 1);
  }

  res.json({
    match: current ? {
      id: current.id,
      period: current.period,
      partner: {
        name: [current.partner_first_name, current.partner_last_name].filter(Boolean).join(" ") || current.partner_name,
        photoUrl: current.partner_photo,
        linkedinUrl: current.partner_linkedin,
        genderIdentity: current.partner_gender,
        interests: current.partner_interests || [],
      },
    } : null,
    nextPeriod,
    emailDate: nextPeriod ? `${nextPeriod}-01` : null,
    matchingFrequency: frequency,
  });
}));

app.get("/matches", requireMember, asyncRoute(async (req, res) => {
  const currentPeriod = new Date().toISOString().slice(0, 7);
  const { rows } = await pool.query(
    `SELECT m.id, m.period, p.first_name AS partner_first_name, p.last_name AS partner_last_name,
            p.name AS partner_name, p.photo_url AS partner_photo, p.linkedin_url AS partner_linkedin,
            p.interests AS partner_interests
     FROM monthly_matches m
     JOIN members p ON p.id = CASE WHEN m.member_one = $1 THEN m.member_two ELSE m.member_one END
     WHERE (m.member_one = $1 OR m.member_two = $1) AND m.period < $2 AND p.opted_out_at IS NULL
     ORDER BY m.period DESC`,
    [req.user.id, currentPeriod],
  );
  res.json({ matches: rows.map((row) => ({
    id: row.id,
    period: row.period,
    partner: {
      name: [row.partner_first_name, row.partner_last_name].filter(Boolean).join(" ") || row.partner_name,
      photoUrl: row.partner_photo,
      linkedinUrl: row.partner_linkedin,
      interests: row.partner_interests || [],
    },
  })) });
}));

app.post("/matches/:matchId/feedback", requireMember, asyncRoute(async (req, res) => {
  const { kind } = req.body;
  if (!["connected", "report"].includes(kind)) return res.status(400).json({ error: "Unsupported feedback." });
  const { rows } = await pool.query(
    `INSERT INTO match_feedback (match_id, member_id, kind)
     SELECT m.id, $2, $3 FROM monthly_matches m
     WHERE m.id = $1 AND (m.member_one = $2 OR m.member_two = $2)
     ON CONFLICT (match_id, member_id, kind) DO NOTHING RETURNING id`,
    [req.params.matchId, req.user.id, kind],
  );
  if (!rows.length) {
    const exists = await pool.query("SELECT 1 FROM monthly_matches WHERE id = $1", [req.params.matchId]);
    if (!exists.rowCount) return res.status(404).json({ error: "Match not found." });
  }
  res.status(201).json({ saved: true });
}));

app.patch("/settings", requireMember, asyncRoute(async (req, res) => {
  const { matchingFrequency, emailConsent } = req.body;
  if (!Object.hasOwn(frequencyMonths, matchingFrequency) && matchingFrequency !== "paused") {
    return res.status(400).json({ error: "Choose monthly, every two months, every three months, or pause." });
  }
  if (typeof emailConsent !== "boolean") return res.status(400).json({ error: "Choose whether to receive match emails." });
  const { rows } = await pool.query(
    `UPDATE members SET matching_frequency = $2, email_consent = $3, updated_at = NOW()
     WHERE id = $1 RETURNING matching_frequency, email_consent`,
    [req.user.id, matchingFrequency, emailConsent],
  );
  req.user.matching_frequency = rows[0].matching_frequency;
  req.user.email_consent = rows[0].email_consent;
  res.json({ matchingFrequency: rows[0].matching_frequency, emailConsent: rows[0].email_consent });
}));

app.post("/settings/leave", requireMember, (req, res, next) => {
  pool.query("UPDATE members SET opted_out_at = NOW(), updated_at = NOW() WHERE id = $1", [req.user.id])
    .then(() => req.logout((error) => {
      if (error) return next(error);
      req.session.destroy((sessionError) => {
        if (sessionError) return next(sessionError);
        res.clearCookie("meetandeat.sid", { httpOnly: true, secure: isProduction, sameSite: "lax" });
        res.status(204).end();
      });
    }))
    .catch(next);
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Something went wrong. Please try again." });
});

await initializeDatabase();
app.listen(port, "0.0.0.0", () => console.log(`Meet & Eat API listening on ${port}`));
