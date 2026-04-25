"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { useState } from "react";

const RANK_COLORS: Record<string, string> = {
  LURKER: "text-zinc-400",
  CURIOUS: "text-emerald-400",
  DIGGER: "text-yellow-400",
  TRUTH_SEEKER: "text-orange-400",
  DEEP_DIVER: "text-purple-400",
  RABBIT_MASTER: "text-red-400",
};

export default function Navbar() {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <span className="text-2xl">🐇</span>
          <span className="text-zinc-100">rabbit</span>
          <span className="text-purple-400">hole</span>
        </Link>

        {/* Nav links */}
        <div className="hidden sm:flex items-center gap-6 text-sm text-zinc-400">
          <Link href="/" className="hover:text-zinc-100 transition-colors">Feed</Link>
          <Link href="/create" className="hover:text-zinc-100 transition-colors">Create</Link>
        </div>

        {/* Auth */}
        <div className="flex items-center gap-3">
          {status === "loading" ? (
            <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse" />
          ) : session?.user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 text-sm"
              >
                {session.user.image ? (
                  <img src={session.user.image} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center font-bold text-white text-xs">
                    {session.user.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <span className="hidden sm:block text-zinc-300">{session.user.name}</span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-10 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl py-1 z-50">
                  <Link href="/profile" className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800" onClick={() => setMenuOpen(false)}>
                    Profile
                  </Link>
                  <button
                    onClick={() => { signOut(); setMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => signIn("github")}
              className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
