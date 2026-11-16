import Link from "next/link";
import { redirect } from "next/navigation";
import AuthShell from "../components/AuthShell";
import LinkedInButton from "../components/LinkedInButton";
import Plate from "../components/Plate";
import SignupForm from "./SignupForm";
import { currentMemberId, pendingSignup } from "@/lib/session";

export const metadata = { title: "Register — Meet-N-Eat" };

export default async function RegisterPage({ searchParams }) {
  if (await currentMemberId()) redirect("/app");
  const { error } = await searchParams;
  const pending = await pendingSignup();

  if (pending) {
    return (
      <AuthShell error={error}>
        <h1>Almost there <i>✳</i></h1>
        <p className="muted">A few quick details, then you’re at the table.</p>
        <SignupForm
          initial={{ firstName: pending.firstName, lastName: pending.lastName, email: pending.email, picture: pending.picture }}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell error={error}>
      <Plate className="auth-plate" />
      <h1>Join <i>Meet-N-Eat</i></h1>
      <p className="muted">Meet one new person a month over a 30-minute coffee call.</p>
      <LinkedInButton intent="register" />
      <p className="small-print">
        You’ll sign in on LinkedIn with your usual LinkedIn email and password. We never see your password,
        and we never post on your behalf.
      </p>
      <p className="auth-switch">Already signed up? <Link href="/login">Log in</Link></p>
    </AuthShell>
  );
}
