import Link from "next/link";
import { redirect } from "next/navigation";
import AuthShell from "../components/AuthShell";
import LinkedInButton from "../components/LinkedInButton";
import Plate from "../components/Plate";
import { currentMemberId } from "@/lib/session";

export const metadata = { title: "Log in — Meet-N-Eat" };

export default async function LoginPage({ searchParams }) {
  if (await currentMemberId()) redirect("/app");
  const { error } = await searchParams;
  return (
    <AuthShell error={error}>
      <Plate className="auth-plate" />
      <h1>Welcome back <i>👋</i></h1>
      <p className="muted">Log in with your LinkedIn account. We never see your LinkedIn password.</p>
      <LinkedInButton intent="login" label="Log in with LinkedIn" />
      <p className="auth-switch">New here? <Link href="/register">Register</Link></p>
    </AuthShell>
  );
}
