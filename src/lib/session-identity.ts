import type { Session } from "next-auth";
import type { SessionIdentity } from "@/lib/report-drafts";

export function getSessionIdentity(session: Session | null): SessionIdentity | null {
  const user = session?.user;
  const email = user?.email?.trim();
  if (!email) return null;

  return {
    email,
    name: user?.name ?? null,
    image: user?.image ?? null,
  };
}
