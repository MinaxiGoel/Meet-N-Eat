"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Avatar from "../components/Avatar";
import Logo from "../components/Logo";

// Logo on the left (not clickable); "My profile" circle on the right.
export default function TopBar({ me, referralLink }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menu = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (!menu.current?.contains(event.target)) setOpen(false); };
    const escape = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, [open]);

  async function refer() {
    const text = "I’m meeting one new person every month on Meet-N-Eat. Come join me ☕";
    try {
      if (navigator.share) { await navigator.share({ title: "Meet-N-Eat", text, url: referralLink }); return; }
      await navigator.clipboard.writeText(`${text} ${referralLink}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* closed the share sheet */ }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <header className="app-bar">
      <Logo />
      <div className="profile-menu" ref={menu}>
        <button className="profile-button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" aria-label="My profile">
          <Avatar person={me} size={38} />
        </button>
        {open && (
          <div className="menu" role="menu">
            <div className="menu-head">
              <Avatar person={me} size={44} />
              <span><strong>{me.firstName} {me.lastName}</strong><small>{me.jobTitle} · {me.company}</small></span>
            </div>
            <Link role="menuitem" href="/app/profile" className="menu-item">My details <span>›</span></Link>
            <button role="menuitem" className="menu-item" onClick={refer}>
              {copied ? "Link copied! ✅" : "Refer a friend"} <span>↗</span>
            </button>
            <button role="menuitem" className="menu-item quiet" onClick={logout}>Log out</button>
          </div>
        )}
      </div>
    </header>
  );
}
