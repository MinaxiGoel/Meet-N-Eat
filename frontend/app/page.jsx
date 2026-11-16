import Link from "next/link";
import { redirect } from "next/navigation";
import Logo from "./components/Logo";
import Plate from "./components/Plate";
import { MatchShot, RevealShot, SignupShot } from "./components/PhoneShots";
import { currentMemberId } from "@/lib/session";

export default async function Landing() {
  if (await currentMemberId()) redirect("/app");
  const month = new Intl.DateTimeFormat("en", { month: "long" }).format(new Date());

  return (
    <main className="landing">
      <header className="site-header wrap">
        <Logo />
        <Link className="header-login" href="/login">Log in</Link>
      </header>

      <section className="hero">
        <div className="hero-media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/meet-and-eat-hero.png" alt="People from different countries chatting over coffee and food" />
        </div>
        <div className="hero-copy">
          <p className="eyebrow"><span className="dot" /> {month} at the table</p>
          <h1>Your monthly match is <i>behind the plate.</i></h1>
          <p className="hero-lede">Meet one new person a month over a 30-minute coffee call.</p>
          <div className="hero-actions">
            <Link className="plate-button" href="/register" aria-label="Register for Meet-N-Eat">
              <Plate label="Register" />
            </Link>
            <p className="login-line">Already signed up? <Link href="/login">Log in</Link></p>
          </div>
          <p className="hero-facts">2 emails a month · LinkedIn-verified · Opt out anytime</p>
        </div>
      </section>

      <section className="how" id="how-it-works">
        <div className="wrap">
          <p className="eyebrow center">How it works</p>
          <h2 className="section-title">Three small steps to a <i>good conversation.</i></h2>
          <ol className="steps">
            <li className="step">
              <span className="step-num">01</span>
              <h3>Join with LinkedIn</h3>
              <p>One tap with LinkedIn, then a few quick details.</p>
              <SignupShot />
            </li>
            <li className="step">
              <span className="step-num">02</span>
              <h3>Reveal your match</h3>
              <p>On the 8th, flip the plate to meet them.</p>
              <RevealShot />
            </li>
            <li className="step">
              <span className="step-num">03</span>
              <h3>Grab coffee, connect</h3>
              <p>DM them on LinkedIn and set up 30 minutes.</p>
              <MatchShot />
            </li>
          </ol>
        </div>
      </section>

      <section className="emails wrap">
        <h2 className="section-title">Two emails a month. <i>No spam.</i></h2>
        <div className="email-cards">
          <div className="email-card">
            <span className="email-when">From the 3rd</span>
            <p>A quick check-in. Do nothing to stay in, or take a break, pause or opt out in one tap.</p>
          </div>
          <div className="email-card">
            <span className="email-when">From the 10th</span>
            <p>Your match’s details, ready for a hello on LinkedIn.</p>
          </div>
        </div>
      </section>

      <footer className="site-footer wrap">
        <Logo small />
        <span>One new person a month, at your pace.</span>
        <nav><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></nav>
      </footer>
    </main>
  );
}
