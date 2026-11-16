import Link from "next/link";
import Logo from "../components/Logo";

export const metadata = { title: "Privacy — Meet-N-Eat" };

// Placeholder: replace with a proper privacy policy before launch (PRD action items).
export default function Privacy() {
  return (
    <main className="auth">
      <header className="site-header wrap"><Logo /><Link className="header-login" href="/">Home</Link></header>
      <article className="legal">
        <h1>Privacy</h1>
        <p className="alert">Draft placeholder. A full privacy policy is needed before launch.</p>
        <p>We store the details you give us at sign-up (name, gender, role, company, LinkedIn link, fun facts, time zone) plus your LinkedIn email and photo.</p>
        <p>Your monthly match sees your photo, name, role, company, fun things and LinkedIn link. Never your email or gender.</p>
        <p>We send at most two emails a month. You can opt out anytime, and you can delete your account and data from Settings.</p>
        <p>We never see your LinkedIn password, never post on your behalf, and don’t keep your LinkedIn access token.</p>
      </article>
    </main>
  );
}
