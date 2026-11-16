"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "./TopBar";
import Avatar from "../components/Avatar";
import Plate from "../components/Plate";

async function post(url, body) {
  const response = await fetch(url, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

// ------------------------------------------------------------------ icons for the bottom menu
const Icon = {
  connects: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.2" /><circle cx="17" cy="9.5" r="2.4" /><path d="M3.5 19c.7-3.2 3-5 5.5-5s4.8 1.8 5.5 5M14.5 15.2c.8-.6 1.6-.9 2.5-.9 2 0 3.6 1.4 4 3.7" /></svg>,
  reveal: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="5" /><path d="M12 9.5v5M9.5 12h5" /></svg>,
  settings: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></svg>,
};

// ------------------------------------------------------------------ match card
export function MatchCard({ partner }) {
  return (
    <article className="match-card">
      <Avatar person={partner} size={84} className="match-photo" />
      <p className="eyebrow">Your new connection</p>
      <h3>{partner.firstName} {partner.lastName}</h3>
      <p className="match-role">{partner.jobTitle} at {partner.company}</p>
      <blockquote>“{partner.funFacts}”</blockquote>
      <a className="button linkedin wide" href={partner.linkedinUrl} target="_blank" rel="noopener noreferrer">
        Open LinkedIn profile ↗
      </a>
      <p className="take-lead">Send them a DM to set a time. They’re expecting you, so <strong>take the lead!</strong> 😉</p>
      <div className="starters">
        <span>Not sure what to talk about?</span>
        <ul>
          <li>A hobby you could talk about for hours</li>
          <li>Where you live and what you love about it</li>
          <li>Your favourite way to spend a free afternoon</li>
          <li>Something you’re quietly proud of</li>
        </ul>
      </div>
      <p className="coffee">Grab your coffee and snack, and enjoy getting to know each other ☕</p>
    </article>
  );
}

// ------------------------------------------------------------------ Reveal Match
function RevealPanel({ view, onChanged }) {
  const { reveal, month, nextMonth } = view;
  const [partner, setPartner] = useState(reveal.partner || null);
  const [flipped, setFlipped] = useState(reveal.state === "revealed");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function doReveal() {
    setBusy(true); setError("");
    try {
      const data = await post("/api/reveal");
      setPartner(data.partner);
      requestAnimationFrame(() => setFlipped(true));
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function act(action) {
    setBusy(true); setError("");
    try { await post("/api/participation", { action }); onChanged(); }
    catch (e) { setError(e.message); setBusy(false); }
  }

  let body;
  switch (reveal.state) {
    case "ready":
    case "revealed":
      body = (
        <div className={`flip${flipped ? " flipped" : ""}`}>
          <div className="flip-inner">
            <div className="flip-front" aria-hidden={flipped}>
              <h2>Your {month} match is ready 🎉</h2>
              <p className="muted">It’s behind the plate. Go on, take a peek.</p>
              <Plate className="reveal-plate" />
              <button className="button primary" onClick={doReveal} disabled={busy || flipped}>
                {busy ? "Turning the plate…" : "Reveal your match"}
              </button>
            </div>
            <div className="flip-back" aria-hidden={!flipped}>
              {partner && <MatchCard partner={partner} />}
            </div>
          </div>
        </div>
      );
      break;
    case "round2Pending":
      body = <Message title="Your match is on its way 🍳" text="It’ll be ready to reveal on the 11th. Thanks for your patience!" plate />;
      break;
    case "noMatch":
      body = <Message title="No match this month, we’re sorry!" text={`We couldn’t find a new person for you this time. You’re first in line in ${nextMonth} 💛`} />;
      break;
    case "break":
      body = <Message title="Enjoy your break ☕" text="You’ll get our check-in again next month. Changed your mind? Switch back in Settings." />;
      break;
    case "paused":
      body = (
        <Message title="You’re on pause." text="Ready to jump back in? We’ll pair you up in the next round.">
          <button className="button primary" onClick={() => act("back")} disabled={busy}>Count me in</button>
        </Message>
      );
      break;
    case "left":
      body = (
        <Message title="You’ve left Meet-N-Eat." text="Your past connects are still here. Want to come back?">
          <button className="button primary" onClick={() => act("stay")} disabled={busy}>Rejoin</button>
        </Message>
      );
      break;
    case "newMember":
      body = <Message title="You’re in! 🎉" text={`Your first match arrives in ${nextMonth}. We’ll check in with you by email from the 3rd.`} plate />;
      break;
    default:
      body = <Message title="Check back on the 8th 🍽️" text={`Your match’s details unlock on the 8th of ${month}. Stay tuned!`} plate />;
  }

  return (
    <>
      <div className="panel-head"><p className="eyebrow">{month}</p><h2 className="panel-title">Reveal Match</h2></div>
      {body}
      {error && <p className="alert" role="alert">{error}</p>}
      <p className="english-note">
        Members join from all over the world, so chat in English. Your match may not speak your language,
        and English helps you connect with more people.
      </p>
    </>
  );
}

function Message({ title, text, plate = false, children }) {
  return (
    <div className="message">
      {plate && <Plate className="waiting-plate" />}
      <h2>{title}</h2>
      <p className="muted">{text}</p>
      {children}
    </div>
  );
}

// ------------------------------------------------------------------ Past Connects + feedback
function ConnectsPanel({ history }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ matchId: "", met: "", rating: 0, comment: "", isConcern: false });
  const [state, setState] = useState({ busy: false, done: false, error: "" });
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  async function send(event) {
    event.preventDefault();
    setState({ busy: true, done: false, error: "" });
    try {
      await post("/api/feedback", { ...form, rating: form.rating || undefined, matchId: form.matchId || undefined });
      setState({ busy: false, done: true, error: "" });
      setForm({ matchId: "", met: "", rating: 0, comment: "", isConcern: false });
    } catch (e) { setState({ busy: false, done: false, error: e.message }); }
  }

  return (
    <>
      <div className="panel-head"><p className="eyebrow">The people you’ve met</p><h2 className="panel-title">Past Connects</h2></div>
      {history.length ? (
        <ul className="connects">
          {history.map((item) => (
            <li key={item.matchId}>
              <Avatar person={item.partner} size={42} />
              <span className="connect-text">
                <strong>{item.partner.firstName} {item.partner.lastName}</strong>
                <small>{item.partner.jobTitle} · {item.partner.company}</small>
                <small className="connect-month">{item.month}</small>
              </span>
              <a href={item.partner.linkedinUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${item.partner.firstName}’s LinkedIn`}>↗</a>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty"><span>✳</span><p>Your past connects will show up here after your first match.</p></div>
      )}

      {!open ? (
        <button className="button ghost wide" onClick={() => { setOpen(true); setState({ busy: false, done: false, error: "" }); }}>
          Share feedback
        </button>
      ) : state.done ? (
        <div className="thanks"><p>Thank you! We read every note 💛</p><button className="link" onClick={() => setOpen(false)}>Close</button></div>
      ) : (
        <form className="feedback form" onSubmit={send}>
          <h3>How are your connects going?</h3>
          {history.length > 0 && (
            <label className="field">
              <span className="field-label">About</span>
              <select value={form.matchId} onChange={(e) => set("matchId", e.target.value)}>
                <option value="">Meet-N-Eat in general</option>
                {history.map((item) => <option key={item.matchId} value={item.matchId}>{item.partner.firstName} ({item.month})</option>)}
              </select>
            </label>
          )}
          <fieldset className="field">
            <legend className="field-label">Did you two meet?</legend>
            <div className="chips">
              {[["yes", "Yes"], ["not_yet", "Not yet"], ["could_not", "Couldn’t connect"]].map(([value, label]) => (
                <label key={value} className={`chip${form.met === value ? " on" : ""}`}>
                  <input type="radio" name="met" checked={form.met === value} onChange={() => set("met", value)} />{label}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="field">
            <legend className="field-label">How did it go?</legend>
            <div className="rating">
              {["😕", "😐", "🙂", "😊", "🤩"].map((emoji, i) => (
                <button type="button" key={emoji} className={form.rating === i + 1 ? "on" : ""} onClick={() => set("rating", i + 1)} aria-label={`${i + 1} out of 5`} aria-pressed={form.rating === i + 1}>{emoji}</button>
              ))}
            </div>
          </fieldset>
          <label className="field">
            <span className="field-label">Anything you’d like to tell us, or ideas to make Meet-N-Eat better?</span>
            <textarea rows={3} maxLength={2000} value={form.comment} onChange={(e) => set("comment", e.target.value)} />
          </label>
          <label className="check">
            <input type="checkbox" checked={form.isConcern} onChange={(e) => set("isConcern", e.target.checked)} />
            <span>This is a safety concern I’d like to report.</span>
          </label>
          {state.error && <p className="alert" role="alert">{state.error}</p>}
          <div className="form-actions">
            <button type="button" className="link" onClick={() => setOpen(false)}>Cancel</button>
            <button className="button primary" disabled={state.busy}>{state.busy ? "Sending…" : "Send feedback"}</button>
          </div>
        </form>
      )}
    </>
  );
}

// ------------------------------------------------------------------ Settings
const OPTIONS = [
  { value: "stay", title: "Stay in", text: "Keep matching me every month." },
  { value: "break", title: "Take a break this month", text: "Skip this month. I’ll be back next month." },
  { value: "pause", title: "Pause until I’m back", text: "No matches until I switch back on. I’ll still get the monthly check-in." },
  { value: "leave", title: "Opt out", text: "Leave Meet-N-Eat. No more matches or emails." },
];

function SettingsPanel({ view, onChanged }) {
  const { participation: p, month, nextMonth } = view;
  const breakChoice = p.isBeforePairing ? p.thisMonth : p.nextMonth;
  const current = p.status === "left" ? "leave" : p.status === "paused" ? "pause" : breakChoice === "break" ? "break" : "stay";
  const [choice, setChoice] = useState(current);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [state, setState] = useState({ busy: false, message: "", error: "" });

  let status;
  if (p.status === "left") status = "You’ve opted out.";
  else if (p.status === "paused") status = "You’re on pause.";
  else if (p.thisMonth === "break") status = `You’re taking a break in ${month}.`;
  else status = `You’re in for ${month}.`;
  if (p.status === "active" && !p.isBeforePairing && p.nextMonth === "break") status += ` Break booked for ${nextMonth}.`;

  async function save(event) {
    event.preventDefault();
    if (choice === "leave" && !confirmLeave) { setConfirmLeave(true); return; }
    setState({ busy: true, message: "", error: "" });
    try {
      const result = await post("/api/participation", { action: choice });
      setState({ busy: false, message: result.message, error: "" });
      setConfirmLeave(false);
      onChanged();
    } catch (e) { setState({ busy: false, message: "", error: e.message }); }
  }

  async function deleteAccount() {
    setState({ busy: true, message: "", error: "" });
    try { await post("/api/account/delete"); window.location.href = "/"; }
    catch (e) { setState({ busy: false, message: "", error: e.message }); }
  }

  return (
    <>
      <div className="panel-head"><p className="eyebrow">Settings</p><h2 className="panel-title">We respect your availability.</h2></div>
      <p className="status-line">{status}</p>
      <form className="options" onSubmit={save}>
        {OPTIONS.map((option) => (
          <label key={option.value} className={`option${choice === option.value ? " on" : ""}${option.value === "leave" ? " danger" : ""}`}>
            <input type="radio" name="participation" value={option.value} checked={choice === option.value}
              onChange={() => { setChoice(option.value); setConfirmLeave(false); setState((s) => ({ ...s, message: "" })); }} />
            <span><strong>{option.title}</strong><small>{option.text}</small></span>
          </label>
        ))}
        <p className="timing">Changes made before pairing on the 7th count for that month. Right now, changes apply from <strong>{p.changesApplyFrom}</strong>.</p>
        {confirmLeave && <p className="alert">Are you sure? We won’t send you any more matches or emails. Your past connects stay saved in case you come back. Tap again to confirm.</p>}
        {state.message && <p className="success" role="status">{state.message}</p>}
        {state.error && <p className="alert" role="alert">{state.error}</p>}
        <button className="button primary wide" disabled={state.busy || (choice === current && !confirmLeave)}>
          {state.busy ? "Saving…" : confirmLeave ? "Yes, opt me out" : "Save"}
        </button>
      </form>

      <div className="danger-zone">
        {!confirmDelete
          ? <button className="link" onClick={() => setConfirmDelete(true)}>Delete my account and data</button>
          : (
            <p>
              This permanently deletes your profile, photo and past connects.{" "}
              <button className="link danger" onClick={deleteAccount} disabled={state.busy}>Delete forever</button>{" · "}
              <button className="link" onClick={() => setConfirmDelete(false)}>Keep my account</button>
            </p>
          )}
      </div>
    </>
  );
}

// ------------------------------------------------------------------ the app shell
const TABS = [
  { id: "connects", label: "Past Connects" },
  { id: "reveal", label: "Reveal Match" },
  { id: "settings", label: "Settings" },
];

export default function MemberApp({ view, initialTab, welcome, notice, referralLink }) {
  const router = useRouter();
  const [tab, setTab] = useState(initialTab);
  const [banner, setBanner] = useState(
    welcome ? `Welcome to the table, ${view.me.firstName}! 🎉` : notice,
  );
  const refresh = () => router.refresh();

  function choose(id) {
    setTab(id);
    window.history.replaceState(null, "", id === "reveal" ? "/app" : `/app?tab=${id}`);
    window.scrollTo({ top: 0 });
  }

  return (
    <div className="member">
      <TopBar me={view.me} referralLink={referralLink} />
      {banner && (
        <div className="banner" role="status">
          <span>{banner}</span>
          <button onClick={() => setBanner("")} aria-label="Dismiss">×</button>
        </div>
      )}
      <main className="panels">
        <section className={`panel panel-connects${tab === "connects" ? " active" : ""}`} aria-label="Past Connects">
          <ConnectsPanel history={view.history} />
        </section>
        <section className={`panel panel-reveal${tab === "reveal" ? " active" : ""}`} aria-label="Reveal Match">
          <RevealPanel key={view.reveal.state} view={view} onChanged={refresh} />
        </section>
        <section className={`panel panel-settings${tab === "settings" ? " active" : ""}`} aria-label="Settings">
          <SettingsPanel key={`${view.participation.status}-${view.participation.thisMonth}-${view.participation.nextMonth}`} view={view} onChanged={refresh} />
        </section>
      </main>
      <nav className="bottom-nav" aria-label="Main">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => choose(t.id)} aria-current={tab === t.id ? "page" : undefined}>
            {Icon[t.id]}<span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
