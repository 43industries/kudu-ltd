"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";

export default function Navbar() {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => setUnread(d.unreadCount ?? 0))
      .catch(() => {});
  }, [session]);

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
            <>
              {/* Notification bell */}
              <Link
                href="/notifications"
                className="relative p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                onClick={() => setUnread(0)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-purple-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>

              {/* Avatar menu */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 text-sm"
                >
                  {session.user.image ? (
                    <img src={session.user.image} alt="" className="w-8 h-8 rounded-full ring-2 ring-transparent hover:ring-purple-500 transition-all" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center font-bold text-white text-xs">
                      {session.user.name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  <span className="hidden sm:block text-zinc-300">{session.user.name}</span>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-10 w-52 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl py-1 z-50">
                    <div className="px-4 py-2 border-b border-zinc-800">
                      <p className="text-xs text-zinc-500 truncate">{session.user.email}</p>
                    </div>
                    <Link
                      href={`/u/${(session.user as { username?: string }).username ?? session.user.name?.toLowerCase().replace(/\s+/g, "") ?? "me"}`}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                      onClick={() => setMenuOpen(false)}
                    >
                      <span>👤</span> Profile
                    </Link>
                    <Link
                      href="/notifications"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                      onClick={() => { setMenuOpen(false); setUnread(0); }}
                    >
                      <span>🔔</span> Notifications
                      {unread > 0 && (
                        <span className="ml-auto text-xs bg-purple-600 text-white px-1.5 py-0.5 rounded-full">{unread}</span>
                      )}
                    </Link>
                    <Link
                      href="/create"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors sm:hidden"
                      onClick={() => setMenuOpen(false)}
                    >
                      <span>➕</span> Create
                    </Link>
                    <div className="border-t border-zinc-800 mt-1 pt-1">
                      <button
                        onClick={() => { signOut(); setMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
                      >
                        <span>↩</span> Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
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
