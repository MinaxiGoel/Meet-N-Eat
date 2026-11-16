"use client";

import { useState } from "react";

export default function ChoiceConfirm({ token, action, label }) {
  const [state, setState] = useState({ busy: false, done: "", error: "" });

  async function confirm() {
    setState({ busy: true, done: "", error: "" });
    try {
      const response = await fetch("/api/choice", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: token, a: action }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Something went wrong.");
      setState({ busy: false, done: data.message, error: "" });
    } catch (e) {
      setState({ busy: false, done: "", error: e.message });
    }
  }

  if (state.done) {
    return (
      <div className="done">
        <p className="success" role="status">{state.done}</p>
        <a className="link" href="/app?tab=settings">Changed your mind? Open Settings</a>
      </div>
    );
  }
  return (
    <>
      {state.error && <p className="alert" role="alert">{state.error}</p>}
      <button className="button primary wide" onClick={confirm} disabled={state.busy}>{state.busy ? "Saving…" : label}</button>
      <p className="small-print">Staying in? Just close this page. No action needed.</p>
    </>
  );
}
