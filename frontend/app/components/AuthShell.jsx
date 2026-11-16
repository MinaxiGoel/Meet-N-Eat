import Link from "next/link";
import Logo from "./Logo";

export const AUTH_ERRORS = {
  not_configured: "LinkedIn sign-in isn’t switched on yet. Please check back soon.",
  linkedin_cancelled: "LinkedIn sign-in was cancelled. Try again whenever you’re ready.",
  linkedin_failed: "We couldn’t reach LinkedIn just now. Please try again.",
  expired: "That took a little too long. Please try again.",
  no_email: "LinkedIn didn’t share a verified email. Please verify your email on LinkedIn, then try again.",
  email_taken: "This email already has an account. You can only create one account per email. Try logging in instead.",
};

export default function AuthShell({ children, error }) {
  return (
    <main className="auth">
      <header className="site-header wrap">
        <Logo />
        <Link className="header-login" href="/">Home</Link>
      </header>
      <section className="auth-card">
        {error && AUTH_ERRORS[error] && <p className="alert" role="alert">{AUTH_ERRORS[error]}</p>}
        {children}
      </section>
    </main>
  );
}
