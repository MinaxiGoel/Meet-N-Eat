"use client";

import { useEffect, useMemo, useState } from "react";

const interestOptions = ["Movies", "Music", "Reading", "Cooking", "Travelling", "Art & design", "Technology", "Nature", "Sports", "Food", "Culture", "Entrepreneurship"];
const genderLabels = { man: "Man", woman: "Woman", non_binary: "Non-binary", prefer_not_to_say: "Prefer not to say" };
const frequencyLabels = { monthly: "Every month", every_two_months: "Every two months", quarterly: "Every three months", paused: "Pause matching" };

async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "That didn’t work. Please try again.");
  return data;
}

function monthName(period) {
  if (!period) return "next month";
  const [year, month] = period.split("-").map(Number);
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function initials(name = "") {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "ME";
}

function Brand() {
  return <a className="brand" href="#home" aria-label="Meet and Eat home"><span className="brand-mark"><i /><i /><i /></span><span>meet <em>&</em> eat</span></a>;
}

function LinkedinButton({ disabled = false }) {
  return <a className={`linkedin-button ${disabled ? "is-disabled" : ""}`} href={disabled ? undefined : "/api/auth/linkedin"} onClick={(event) => disabled && event.preventDefault()} aria-disabled={disabled}><span className="linkedin-in">in</span> Sign up with LinkedIn <span aria-hidden="true">↗</span></a>;
}

export default function Home() {
  const [member, setMember] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [linkedinReady, setLinkedinReady] = useState(false);
  const [profile, setProfile] = useState({ firstName: "", lastName: "", genderIdentity: "", contactEmail: "", linkedinUrl: "", interests: [], emailConsent: true, matchingFrequency: "monthly" });
  const [current, setCurrent] = useState(null);
  const [pastMatches, setPastMatches] = useState([]);
  const [revealed, setRevealed] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [settingsFrequency, setSettingsFrequency] = useState("monthly");
  const [settingsEmail, setSettingsEmail] = useState(true);
  const thisMonth = useMemo(() => new Intl.DateTimeFormat("en", { month: "long" }).format(new Date()), []);

  async function loadMemberData(signedInMember) {
    if (!signedInMember) return;
    const [profileData, currentData, historyData] = await Promise.all([request("/profile"), request("/matches/current"), request("/matches")]);
    setProfile({ ...profileData.profile, contactEmail: profileData.profile.contactEmail || profileData.profile.email || "" });
    setSettingsFrequency(profileData.profile.matchingFrequency || "monthly");
    setSettingsEmail(Boolean(profileData.profile.emailConsent));
    setCurrent(currentData);
    setPastMatches(historyData.matches || []);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("signin") === "failed") setNotice("LinkedIn sign-in didn’t finish. Please try again.");
    if (params.get("signin") === "unavailable") setNotice("LinkedIn sign-in is being connected. Please check back soon.");
    if (params.has("signin")) window.history.replaceState({}, "", window.location.pathname + window.location.hash);
    Promise.all([request("/auth/session"), request("/auth/status")])
      .then(async ([sessionData, authData]) => {
        setMember(sessionData.member);
        setLinkedinReady(Boolean(authData.linkedinEnabled));
        await loadMemberData(sessionData.member);
      })
      .catch((error) => setNotice(error.message || "Couldn’t connect to Meet & Eat."))
      .finally(() => setAuthReady(true));
  }, []);

  function update(field, value) { setProfile((previous) => ({ ...previous, [field]: value })); }
  function toggleInterest(item) {
    const selected = profile.interests.includes(item);
    update("interests", selected ? profile.interests.filter((interest) => interest !== item) : [...profile.interests, item]);
  }

  async function saveProfile(event) {
    event.preventDefault(); setBusy(true); setNotice("");
    try {
      const result = await request("/profile", { method: "PUT", body: JSON.stringify(profile) });
      setProfile(result.profile); setSettingsFrequency(result.profile.matchingFrequency || "monthly"); setSettingsEmail(Boolean(result.profile.emailConsent));
      const [currentData, historyData] = await Promise.all([request("/matches/current"), request("/matches")]);
      setCurrent(currentData); setPastMatches(historyData.matches || []);
      setNotice(`You’re on our list. We’ll email you on the 1st of ${monthName(currentData.nextPeriod)}.`);
    } catch (error) { setNotice(error.message); }
    finally { setBusy(false); }
  }

  async function saveSettings(event) {
    event.preventDefault(); setBusy(true); setNotice("");
    try {
      const result = await request("/settings", { method: "PATCH", body: JSON.stringify({ matchingFrequency: settingsFrequency, emailConsent: settingsEmail }) });
      update("matchingFrequency", result.matchingFrequency); update("emailConsent", result.emailConsent);
      const currentData = await request("/matches/current"); setCurrent(currentData);
      setNotice("Your settings are saved.");
    } catch (error) { setNotice(error.message); }
    finally { setBusy(false); }
  }

  async function logout() {
    setBusy(true);
    try { await request("/auth/logout", { method: "POST", body: JSON.stringify({}) }); setMember(null); setCurrent(null); setPastMatches([]); setRevealed(false); setNotice("You’re signed out."); }
    catch (error) { setNotice(error.message); }
    finally { setBusy(false); }
  }

  async function leaveProgram() {
    if (!window.confirm("Leave Meet & Eat? You will be opted out and signed out.")) return;
    setBusy(true);
    try {
      await request("/settings/leave", { method: "POST", body: JSON.stringify({}) });
      setMember(null); setCurrent(null); setPastMatches([]); setRevealed(false);
      setNotice("You’ve left Meet & Eat. You can sign up again whenever you like.");
    } catch (error) { setNotice(error.message); }
    finally { setBusy(false); }
  }

  const loggedIn = Boolean(member);
  const complete = Boolean(profile.profileCompleted);
  const partner = current?.match?.partner;

  return <main id="home">
    <header className="topbar wrap"><Brand /><nav className="top-nav">{loggedIn ? <><a href="#dashboard">My table</a><button className="text-button" onClick={logout} disabled={busy}>Log out</button></> : <><a href="#how-it-works">How it works</a><a className="nav-cta" href={linkedinReady ? "/api/auth/linkedin" : undefined} onClick={(event) => !linkedinReady && event.preventDefault()}>Sign up <span>↗</span></a></>}</nav></header>

    {notice && <div className="notice wrap" role="status">{notice}<button aria-label="Dismiss message" onClick={() => setNotice("")}>×</button></div>}

    {!authReady ? <section className="loading-state wrap"><span className="loader" /> Setting the table…</section> : !loggedIn ? <>
      <section className="hero wrap">
        <div className="hero-copy"><p className="eyebrow"><span /> {thisMonth} at the table</p><h1>Good things happen when we <i>meet</i> beyond our circles.</h1><p className="hero-lede">One thoughtful introduction. One 30-minute conversation. A fresh perspective you might not have found on your own.</p><LinkedinButton disabled={!linkedinReady} /><p className="hero-footnote">Sign up with LinkedIn · No posting on your behalf</p></div>
        <div className="hero-art"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="plate"><span className="plate-inner"/><span className="plate-leaf leaf-one">✳</span><span className="plate-leaf leaf-two">✳</span><span className="plate-note">a seat<br/>for you</span></div><span className="art-tag tag-top">new people, new stories</span><span className="art-tag tag-bottom">30 minutes · once a month</span><span className="hero-star">✳</span></div>
        <a className="scroll-cue" href="#how-it-works"><span /> See how it works</a>
      </section>
      <section className="how-section" id="how-it-works"><div className="wrap"><div className="section-intro"><p className="eyebrow">The short version</p><h2>Make room for a<br/><i>good conversation.</i></h2></div><div className="steps-grid"><article className="step-card"><span className="step-number">01</span><span className="step-icon">↗</span><h3>Join the table</h3><p>Sign up with LinkedIn, then tell us a little about yourself and what you enjoy.</p></article><article className="step-card"><span className="step-number">02</span><span className="step-icon">⌕</span><h3>We find your person</h3><p>We pair you with someone new from your gender identity group. We don’t repeat matches.</p></article><article className="step-card"><span className="step-number">03</span><span className="step-icon">☕</span><h3>Share 30 minutes</h3><p>Get an email when your match is ready. Say hello on LinkedIn and pick a time to talk.</p></article></div></div></section>
      <section className="plate-cta wrap"><div className="mini-plate"><span>✳</span></div><div><p className="eyebrow">There’s a place for you</p><h2>Your monthly match<br/>is <i>behind the plate.</i></h2></div><LinkedinButton disabled={!linkedinReady}/></section>
      <footer className="footer wrap"><Brand/><span>One new perspective, at your pace.</span><a href="mailto:hello@meetandeat.example">Say hello ↗</a></footer>
    </> : <>
      <section className="dashboard-heading wrap" id="dashboard"><div><p className="eyebrow">Your place at the table</p><h1>Welcome{profile.firstName ? `, ${profile.firstName}` : " back"}<i>.</i></h1><p>Your next good conversation starts here.</p></div><button className="outline-button heading-logout" onClick={logout} disabled={busy}>Log out ↗</button></section>
      <section className="dashboard wrap">
        <aside className="dashboard-panel past-panel"><div className="panel-heading"><p className="eyebrow">The people you’ve met</p><h2>Past matches</h2></div>{pastMatches.length ? <ul className="match-history">{pastMatches.map((item) => <li key={item.id}><span className="avatar-small">{initials(item.partner.name)}</span><div><strong>{item.partner.name}</strong><span>{monthName(item.period)}</span></div>{item.partner.linkedinUrl && <a href={item.partner.linkedinUrl} target="_blank" rel="noreferrer" aria-label={`Open ${item.partner.name} on LinkedIn`}>↗</a>}</li>)}</ul> : <div className="empty-history"><span>✳</span><p>Your introductions will find a home here after your first match.</p></div>}</aside>

        <section className="dashboard-panel reveal-panel"><div className="panel-heading"><p className="eyebrow">The next introduction</p><h2>Reveal your match</h2></div>
          {!complete ? <form className="profile-form" onSubmit={saveProfile}><p className="form-intro">A few details help us make a thoughtful introduction. Your profile is shared only with your match.</p><div className="name-fields"><label>First name<input required maxLength={80} value={profile.firstName} onChange={(e) => update("firstName", e.target.value)} autoComplete="given-name"/></label><label>Last name<input required maxLength={80} value={profile.lastName} onChange={(e) => update("lastName", e.target.value)} autoComplete="family-name"/></label></div><label>Which best describes your gender identity?<select required value={profile.genderIdentity} onChange={(e) => update("genderIdentity", e.target.value)}><option value="" disabled>Choose one</option>{Object.entries(genderLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><small>We use this to match within your selected group.</small></label><label>Email for monthly match updates<input required type="email" maxLength={254} value={profile.contactEmail} onChange={(e) => update("contactEmail", e.target.value)} autoComplete="email" placeholder="you@example.com"/><small>One email when your match is ready. No spam.</small></label><label>What are you interested in?<small>Choose a few things you’d enjoy talking about.</small></label><div className="interest-pills">{interestOptions.map((item) => <button type="button" key={item} className={profile.interests.includes(item) ? "selected" : ""} onClick={() => toggleInterest(item)} aria-pressed={profile.interests.includes(item)}>{item}</button>)}</div><label className="linkedin-url-field">LinkedIn profile URL <span>(optional)</span><input type="url" value={profile.linkedinUrl || ""} onChange={(e) => update("linkedinUrl", e.target.value)} placeholder="https://www.linkedin.com/in/you"/></label><button className="primary-button form-submit" disabled={busy || !profile.interests.length}>{busy ? "Saving…" : "Save my details"}<span>↗</span></button><p className="form-privacy">Monthly match updates only. You can change your settings any time.</p></form> : <>
            <div className="match-announce"><span className="announce-spark">✳</span>{current?.matchingFrequency === "paused" ? <><p className="eyebrow">Taking a pause</p><h3>Your place is saved.</h3><p>Turn matching back on in settings whenever you’re ready.</p></> : current?.match ? <><p className="eyebrow">Your {monthName(current.match.period)} introduction</p><h3>A new perspective<br/>is waiting.</h3><p>Set aside 30 minutes and bring your curiosity.</p></> : <><p className="eyebrow">You’re on our list</p><h3>We’ll pair you for<br/>{monthName(current?.nextPeriod)}.</h3><p>You’ll receive an email on the 1st of {monthName(current?.nextPeriod)}{profile.contactEmail ? ` at ${profile.contactEmail}` : ""}.</p></>}</div>
            {current?.match ? revealed && partner ? <div className="revealed-card"><div className="avatar-large">{initials(partner.name)}</div><p className="eyebrow">Your new connection</p><h3>{partner.name}</h3><p className="partner-interests">{partner.interests?.join(" · ")}</p>{partner.linkedinUrl ? <a className="primary-button" href={partner.linkedinUrl} target="_blank" rel="noreferrer">Connect on LinkedIn <span>↗</span></a> : <p className="small-note">Your match hasn’t added a LinkedIn profile link yet.</p>}<div className="icebreaker"><span>Try this ice-breaker</span><p>What’s something you’ve watched, read, or listened to lately that you’d recommend?</p></div></div> : <button className="primary-button reveal-button" onClick={() => setRevealed(true)}>Reveal this month’s match <span>✳</span></button> : null}
            {!current?.match && current?.matchingFrequency !== "paused" && <div className="waiting-plate"><span>✳</span><small>good things<br/>are gathering</small></div>}
          </>}
        </section>

        <aside className="dashboard-panel settings-panel"><div className="panel-heading"><p className="eyebrow">Make it yours</p><h2>Settings</h2></div>{complete ? <form className="settings-form" onSubmit={saveSettings}><label>How often would you like an introduction?<select value={settingsFrequency} onChange={(e) => setSettingsFrequency(e.target.value)}>{Object.entries(frequencyLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label className="email-toggle"><span><strong>Email reminders</strong><small>One message when your match is ready.</small></span><input type="checkbox" checked={settingsEmail} onChange={(e) => setSettingsEmail(e.target.checked)}/></label><button className="outline-button save-settings" type="submit" disabled={busy}>Save settings</button></form> : <p className="settings-hint">Your matching and email settings will appear here once your profile is complete.</p>}<div className="settings-divider"/><button className="logout-row" onClick={logout} disabled={busy}><span><strong>Log out</strong><small>Come back whenever you like.</small></span><span>↗</span></button><button className="leave-row" onClick={leaveProgram} disabled={busy}>Leave Meet &amp; Eat</button><a className="edit-profile-link" href="#dashboard" onClick={() => window.scrollTo({ top: document.getElementById("dashboard")?.offsetTop || 0, behavior: "smooth" })}>Your details are private and only shared with your match.</a></aside>
      </section><footer className="footer wrap"><Brand/><span>One new perspective, at your pace.</span><a href="mailto:hello@meetandeat.example">Say hello ↗</a></footer>
    </>}
  </main>;
}
