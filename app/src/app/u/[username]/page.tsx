import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import FollowButton from "@/components/FollowButton";

const RANK_COLORS: Record<string, string> = {
  LURKER: "text-zinc-400",
  CURIOUS: "text-emerald-400",
  DIGGER: "text-yellow-400",
  TRUTH_SEEKER: "text-orange-400",
  DEEP_DIVER: "text-purple-400",
  RABBIT_MASTER: "text-red-400",
};

const RANK_XP: Record<string, number> = {
  LURKER: 0,
  CURIOUS: 100,
  DIGGER: 500,
  TRUTH_SEEKER: 1500,
  DEEP_DIVER: 5000,
  RABBIT_MASTER: 15000,
};

const BADGE_RARITY_COLORS: Record<string, string> = {
  COMMON: "border-zinc-700 bg-zinc-800/50",
  RARE: "border-blue-700 bg-blue-950/30",
  LEGENDARY: "border-yellow-600 bg-yellow-950/30",
};

interface Props {
  params: Promise<{ username: string }>;
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const session = await auth();

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/profile/${username}`,
    { next: { revalidate: 30 } }
  );

  if (!res.ok) notFound();
  const { user, isFollowing } = await res.json();

  const ranks = Object.keys(RANK_XP);
  const currentRankIndex = ranks.indexOf(user.rank);
  const nextRank = ranks[currentRankIndex + 1];
  const currentFloor = RANK_XP[user.rank] ?? 0;
  const nextFloor = nextRank ? RANK_XP[nextRank] : null;
  const xpProgress = nextFloor ? Math.min(100, ((user.xp - currentFloor) / (nextFloor - currentFloor)) * 100) : 100;

  const isOwnProfile = session?.user?.id === user.id;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Profile header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-5">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-20 h-20 rounded-2xl flex-shrink-0" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-purple-800 flex items-center justify-center text-3xl font-bold text-white flex-shrink-0">
              {user.username[0]?.toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-zinc-100">
                  {user.displayName ?? user.username}
                </h1>
                <p className="text-sm text-zinc-500">@{user.username}</p>
                {user.bio && <p className="mt-2 text-sm text-zinc-400">{user.bio}</p>}
              </div>
              {!isOwnProfile && (
                <FollowButton targetUserId={user.id} initialFollowing={isFollowing} />
              )}
            </div>

            {/* Rank badge */}
            <div className="mt-3 flex items-center gap-3">
              <span className={`text-sm font-semibold ${RANK_COLORS[user.rank] ?? "text-zinc-400"}`}>
                {user.rank.replace("_", " ")}
              </span>
              <span className="text-xs text-zinc-600">{user.xp.toLocaleString()} XP</span>
            </div>

            {/* XP progress bar */}
            {nextRank && (
              <div className="mt-2">
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden w-48">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all"
                    style={{ width: `${xpProgress}%` }}
                  />
                </div>
                <p className="text-xs text-zinc-600 mt-1">
                  {(nextFloor! - user.xp).toLocaleString()} XP to {nextRank.replace("_", " ")}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-5 pt-5 border-t border-zinc-800 grid grid-cols-4 gap-4 text-center">
          {[
            { label: "Levels Solved", value: user._count.unlocks },
            { label: "Holes Created", value: user._count.threads },
            { label: "Followers", value: user._count.followers },
            { label: "Following", value: user._count.following },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="text-xl font-bold text-zinc-100">{value}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Badges */}
        <div>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Badges</h2>
          {user.badges.length === 0 ? (
            <p className="text-sm text-zinc-600 bg-zinc-900 rounded-xl p-4">No badges yet.</p>
          ) : (
            <div className="space-y-2">
              {user.badges.map(({ badge, earnedAt }: { badge: { slug: string; name: string; description: string; rarity: string; iconUrl: string | null }; earnedAt: string }) => (
                <div
                  key={badge.slug}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${BADGE_RARITY_COLORS[badge.rarity] ?? "border-zinc-700"}`}
                >
                  <span className="text-xl">{badge.iconUrl ?? "🏅"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-200">{badge.name}</div>
                    <div className="text-xs text-zinc-500 truncate">{badge.description}</div>
                  </div>
                  <span className={`text-xs font-mono ${badge.rarity === "LEGENDARY" ? "text-yellow-400" : badge.rarity === "RARE" ? "text-blue-400" : "text-zinc-500"}`}>
                    {badge.rarity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent rabbit holes */}
        <div>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Rabbit Holes</h2>
          {user.threads.length === 0 ? (
            <p className="text-sm text-zinc-600 bg-zinc-900 rounded-xl p-4">No public holes yet.</p>
          ) : (
            <div className="space-y-2">
              {user.threads.map((thread: { slug: string; title: string; teaser: string; totalLevels: number; solveCount: number }) => (
                <Link
                  key={thread.slug}
                  href={`/hole/${thread.slug}`}
                  className="block bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-600 rounded-xl p-4 transition-all"
                >
                  <div className="text-sm font-semibold text-zinc-100 truncate">{thread.title}</div>
                  <div className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{thread.teaser}</div>
                  <div className="flex gap-3 mt-2 text-xs text-zinc-600">
                    <span>🕳️ {thread.totalLevels} levels</span>
                    <span>✅ {thread.solveCount} solved</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
