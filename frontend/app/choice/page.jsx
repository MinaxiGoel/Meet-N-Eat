import Link from "next/link";
import Logo from "../components/Logo";
import ChoiceConfirm from "./ChoiceConfirm";
import { verify } from "@/lib/tokens";
import { getMemberRow } from "@/lib/members";

export const metadata = { title: "Your choice — Meet-N-Eat", robots: { index: false } };

const COPY = {
  break: { title: "Take a break this month? ☕", text: "We’ll skip your match this month and check in again next month.", button: "Yes, take a break" },
  pause: { title: "Pause until you’re back? ⏸️", text: "No matches until you switch back on. We’ll still send a monthly check-in so you can jump back in.", button: "Yes, pause" },
  leave: { title: "Opt out of Meet-N-Eat? 👋", text: "No more matches or emails. Your past connects stay saved in case you come back.", button: "Yes, opt me out" },
  back: { title: "Jump back in? 🎉", text: "We’ll include you in the next pairing round.", button: "Yes, count me in" },
};

// Opened from the buttons in the check-in email. One tap confirms; no login needed.
export default async function ChoicePage({ searchParams }) {
  const { t = "", a = "" } = await searchParams;
  const token = verify("choice", t);
  const member = token ? await getMemberRow(token.m) : null;
  const copy = COPY[a];

  return (
    <main className="auth">
      <header className="site-header wrap"><Logo /></header>
      <section className="auth-card center">
        {!member || !copy ? (
          <>
            <h1>This link has expired</h1>
            <p className="muted">No worries, you can change this anytime in Settings.</p>
            <Link className="button primary" href="/app?tab=settings">Open Settings</Link>
          </>
        ) : (
          <>
            <p className="eyebrow">Hi {member.first_name}</p>
            <h1>{copy.title}</h1>
            <p className="muted">{copy.text}</p>
            <ChoiceConfirm token={t} action={a} label={copy.button} />
          </>
        )}
      </section>
    </main>
  );
}
