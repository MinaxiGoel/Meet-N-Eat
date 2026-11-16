// Small phone "snapshots" for the How it works steps. Pure decoration.
function Phone({ children, label }) {
  return (
    <div className="phone" role="img" aria-label={label}>
      <div className="phone-notch" />
      <div className="phone-screen">{children}</div>
    </div>
  );
}

export function SignupShot() {
  return (
    <Phone label="Sign-up screen preview">
      <div className="shot-title">Almost there</div>
      <div className="shot-field" /><div className="shot-field" />
      <div className="shot-chips"><span className="on">Woman</span><span>Man</span><span>Non-binary</span></div>
      <div className="shot-field short" />
      <div className="shot-note">“I’m a pet lover &amp; a coffee person ☕”</div>
      <div className="shot-button">Sign up</div>
    </Phone>
  );
}

export function RevealShot() {
  return (
    <Phone label="Reveal screen preview">
      <div className="shot-title">Your match is ready</div>
      <div className="shot-plate flipping"><span>✳</span></div>
      <div className="shot-button">Reveal your match</div>
    </Phone>
  );
}

export function MatchShot() {
  return (
    <Phone label="Match card preview">
      <div className="shot-avatar">AK</div>
      <div className="shot-name">Aiko K.</div>
      <div className="shot-role">Product Designer · Lumen</div>
      <div className="shot-note">“Weekend baker, amateur birder 🐦”</div>
      <div className="shot-button blue">Open LinkedIn ↗</div>
      <div className="shot-hint">Take the lead, send a DM 😉</div>
    </Phone>
  );
}
