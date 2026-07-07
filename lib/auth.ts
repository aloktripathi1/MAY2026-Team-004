import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";

export type SessionMembership = { clubId: string; clubSlug: string; clubName: string; role: string };

export const authOptions: AuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.hashedPassword);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id;
      }
      if (token.userId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.userId as string },
          include: { memberships: { include: { club: true } } },
        });
        if (dbUser) {
          token.isFaculty = dbUser.isFaculty;
          token.memberships = dbUser.memberships.map((m) => ({
            clubId: m.clubId,
            clubSlug: m.club.slug,
            clubName: m.club.name,
            role: m.role,
          })) satisfies SessionMembership[];
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.isFaculty = Boolean(token.isFaculty);
        session.user.memberships = (token.memberships as SessionMembership[]) ?? [];
      }
      return session;
    },
  },
};
