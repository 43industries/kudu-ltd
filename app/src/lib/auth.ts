import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GitHub from "next-auth/providers/github";
import { prisma } from "./prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // Pull username from DB and attach to session
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { username: true },
        });
        (session.user as typeof session.user & { username?: string }).username = dbUser?.username;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Auto-generate username from name or email on first sign-in
      if (!user.id) return;
      const base = (user.name ?? user.email?.split("@")[0] ?? "user")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 20);
      let username = base || "user";
      let attempts = 0;
      while (attempts < 10) {
        const exists = await prisma.user.findUnique({ where: { username } });
        if (!exists) break;
        username = `${base}${Math.floor(Math.random() * 9000) + 1000}`;
        attempts++;
      }
      await prisma.user.update({ where: { id: user.id }, data: { username } });
    },
  },
  pages: {
    signIn: "/login",
  },
});
