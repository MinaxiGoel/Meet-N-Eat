import Link from "next/link";
import Logo from "../components/Logo";

export const metadata = { title: "Terms — Meet-N-Eat" };

// Placeholder: replace with proper terms before launch (PRD action items).
export default function Terms() {
  return (
    <main className="auth">
      <header className="site-header wrap"><Logo /><Link className="header-login" href="/">Home</Link></header>
      <article className="legal">
        <h1>Terms</h1>
        <p className="alert">Draft placeholder. Full terms are needed before launch.</p>
        <p>You must be 18 or older to join Meet-N-Eat.</p>
        <p>Be kind and respectful to your matches. Report anything that makes you uncomfortable using “Share feedback” → safety concern.</p>
        <p>We may remove members who break these rules.</p>
      </article>
    </main>
  );
}
