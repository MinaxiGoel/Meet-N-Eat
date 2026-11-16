import { redirect } from "next/navigation";
import ProfileView from "./ProfileView";
import TopBar from "../TopBar";
import { getMemberRow, toMember } from "@/lib/members";
import { currentMemberId } from "@/lib/session";
import { SITE_URL } from "@/lib/config";

export const metadata = { title: "My details — Meet-N-Eat" };

export default async function ProfilePage() {
  const me = toMember(await getMemberRow(await currentMemberId()));
  if (!me) redirect("/login");
  return (
    <div className="member">
      <TopBar me={me} referralLink={`${SITE_URL}/r/${me.referralCode}`} />
      <main className="profile-page">
        <ProfileView me={me} />
      </main>
    </div>
  );
}
