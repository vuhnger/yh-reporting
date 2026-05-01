import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { HomePageContent } from "@/components/home/home-page-content";

export default async function NewReportPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin?callbackUrl=%2Fnew");
  }

  return <HomePageContent />;
}
