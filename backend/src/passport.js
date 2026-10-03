import passport from "passport";
import OpenIDConnectStrategy from "passport-openidconnect";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { pool } from "./db.js";

const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
const callbackUrl = process.env.LINKEDIN_CALLBACK_URL || `${frontendUrl}/api/auth/linkedin/callback`;
const linkedinJwks = createRemoteJWKSet(new URL("https://www.linkedin.com/oauth/openid/jwks"));

export const linkedinEnabled = Boolean(
  process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET,
);

passport.serializeUser((member, done) => done(null, member.id));

passport.deserializeUser(async (id, done) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, first_name, last_name, gender_identity, email, email_verified, contact_email, photo_url, linkedin_url, preferred_language, interests, bio, email_consent, profile_completed, matching_frequency, opted_out_at
       FROM members WHERE id = $1`,
      [id],
    );
    done(null, rows[0] || false);
  } catch (error) {
    done(error);
  }
});

if (linkedinEnabled) {
  passport.use(
    "linkedin",
    new OpenIDConnectStrategy(
      {
        issuer: "https://www.linkedin.com",
        authorizationURL: "https://www.linkedin.com/oauth/v2/authorization",
        tokenURL: "https://www.linkedin.com/oauth/v2/accessToken",
        userInfoURL: "https://api.linkedin.com/v2/userinfo",
        clientID: process.env.LINKEDIN_CLIENT_ID,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
        callbackURL: callbackUrl,
        scope: ["profile", "email"],
        nonce: true,
        skipUserProfile: false,
      },
      async (issuer, profile, context, idToken, _accessToken, _refreshToken, _params, done) => {
        try {
          const { payload: claims } = await jwtVerify(idToken, linkedinJwks, {
            issuer: "https://www.linkedin.com",
            audience: process.env.LINKEDIN_CLIENT_ID,
            algorithms: ["RS256"],
          });
          if (context?.nonce && claims.nonce !== context.nonce) {
            return done(new Error("LinkedIn ID token nonce did not match the sign-in request."));
          }

          const subject = claims.sub;
          if (!subject) return done(new Error("LinkedIn did not return an account identifier."));

          const name = claims.name || profile.displayName || [profile.name?.givenName, profile.name?.familyName].filter(Boolean).join(" ") || "Meet & Eat member";
          const firstName = claims.given_name || profile.name?.givenName || "";
          const lastName = claims.family_name || profile.name?.familyName || "";
          const email = claims.email || profile.emails?.[0]?.value || null;
          const emailVerified = claims.email_verified === true || profile._json?.email_verified === true;
          const photoUrl = profile.photos?.[0]?.value || null;
          const { rows } = await pool.query(
            `INSERT INTO members (provider_subject, name, first_name, last_name, email, email_verified, photo_url, email_consent)
             VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)
             ON CONFLICT (provider_subject) DO UPDATE SET
               name = EXCLUDED.name,
               first_name = CASE WHEN members.profile_completed THEN members.first_name ELSE COALESCE(NULLIF(EXCLUDED.first_name, ''), members.first_name) END,
               last_name = CASE WHEN members.profile_completed THEN members.last_name ELSE COALESCE(NULLIF(EXCLUDED.last_name, ''), members.last_name) END,
               email = COALESCE(EXCLUDED.email, members.email),
               email_verified = CASE WHEN EXCLUDED.email IS NULL THEN members.email_verified ELSE EXCLUDED.email_verified END,
               photo_url = COALESCE(EXCLUDED.photo_url, members.photo_url),
               opted_out_at = NULL,
               is_paused = FALSE,
               updated_at = NOW()
            RETURNING id, name, first_name, last_name, gender_identity, email, email_verified, contact_email, photo_url, linkedin_url, preferred_language, interests, bio, email_consent, profile_completed, matching_frequency, opted_out_at`,
            [subject, name, firstName, lastName, email, emailVerified, photoUrl],
          );
          done(null, rows[0]);
        } catch (error) {
          done(error);
        }
      },
    ),
  );
}

export default passport;
