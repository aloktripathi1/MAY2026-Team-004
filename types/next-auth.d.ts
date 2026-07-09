import type { DefaultSession } from "next-auth";
import type { SessionMembership } from "@/lib/mock-session";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isFaculty: boolean;
      memberships: SessionMembership[];
    } & DefaultSession["user"];
  }
}
