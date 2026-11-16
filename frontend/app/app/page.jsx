import { redirect } from "next/navigation";
import MemberApp from "./MemberApp";
import { buildMemberView } from "@/lib/view";
import { currentMemberId } from "@/lib/session";
import { SITE_URL } from "@/lib/config";

export const metadata = { title: "Meet-N-Eat" };

export default async function AppPage({ searchParams }) {
  const memberId = await currentMemberId();
  if (!memberId) redirect("/login");
  const view = await buildMemberView(memberId);
  if (!view) redirect("/login");
  const { tab, welcome, notice } = await searchParams;
  return (
    <MemberApp
      view={view}
      initialTab={["connects", "settings"].includes(tab) ? tab : "reveal"}
      welcome={welcome === "1"}
      notice={notice === "exists" ? "You already have an account with this email, so we’ve logged you in. 🙂" : ""}
      referralLink={`${SITE_URL}/r/${view.me.referralCode}`}
    />
  );
}
