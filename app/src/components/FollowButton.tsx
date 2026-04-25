"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

interface Props {
  targetUserId: string;
  initialFollowing: boolean;
}

export default function FollowButton({ targetUserId, initialFollowing }: Props) {
  const { data: session } = useSession();
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  if (!session?.user || session.user.id === targetUserId) return null;

  async function toggle() {
    if (loading) return;
    setLoading(true);
    const res = await fetch("/api/follows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId }),
    });
    if (res.ok) {
      const data = await res.json();
      setFollowing(data.following);
    }
    setLoading(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
        following
          ? "bg-zinc-700 hover:bg-red-950 hover:text-red-400 text-zinc-300 border border-zinc-600"
          : "bg-purple-600 hover:bg-purple-500 text-white"
      } disabled:opacity-50`}
    >
      {loading ? "…" : following ? "Following" : "Follow"}
    </button>
  );
}
