import { prisma } from "@/lib/prisma";
import Link from "next/link";

type UserRank = "LURKER" | "CURIOUS" | "DIGGER" | "TRUTH_SEEKER" | "DEEP_DIVER" | "RABBIT_MASTER";

const RANK_LABELS: Record<UserRank, string> = {
  LURKER: "Lurker",
  CURIOUS: "Curious",
  DIGGER: "Digger",
  TRUTH_SEEKER: "Truth Seeker",
  DEEP_DIVER: "Deep Diver",
  RABBIT_MASTER: "Rabbit Master",
};

const RANK_COLORS: Record<UserRank, string> = {
  LURKER: "text-zinc-400",
  CURIOUS: "text-emerald-400",
  DIGGER: "text-yellow-400",
  TRUTH_SEEKER: "text-orange-400",
  DEEP_DIVER: "text-purple-400",
  RABBIT_MASTER: "text-red-400",
};

export const revalidate = 60;

export default async function FeedPage() {
  const threads = await prisma.rabbitHoleThread.findMany({
    where: { isSecret: false, isActive: true },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      author: { select: { username: true, displayName: true, avatarUrl: true, rank: true } },
      tags: { select: { tag: true } },
      _count: { select: { levels: true } },
    },
  });

  return (
    <div>
      {/* Hero */}
      <div className="text-center py-16 mb-12">
        <div className="text-6xl mb-4">🐇</div>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-100 mb-3">
          Go <span className="text-purple-400">deeper</span>.
        </h1>
        <p className="text-zinc-400 max-w-md mx-auto text-lg">
          Mystery threads. Puzzle-locked levels. Community theories. How far down will you go?
        </p>
        <Link
          href="/create"
          className="mt-8 inline-block px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold transition-colors"
        >
          Create a Rabbit Hole
        </Link>
      </div>

      {/* Feed */}
      {threads.length === 0 ? (
        <p className="text-center text-zinc-500 py-12">No rabbit holes yet. Be the first to dig one.</p>
      ) : (
        <div className="grid gap-4">
          {threads.map((thread) => (
            <Link
              key={thread.id}
              href={`/hole/${thread.slug}`}
              className="group block bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-600 rounded-2xl p-6 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {thread.tags.map(({ tag }: { tag: string }) => (
                      <span key={tag} className="text-xs px-2 py-0.5 bg-zinc-800 group-hover:bg-zinc-700 rounded-full text-purple-300 border border-zinc-700">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h2 className="text-xl font-bold text-zinc-100 group-hover:text-purple-300 transition-colors truncate">
                    {thread.title}
                  </h2>
                  <p className="text-zinc-400 mt-1 text-sm line-clamp-2">{thread.teaser}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <span>🕳️</span> {thread._count.levels} level{thread._count.levels !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <span>✅</span> {thread.solveCount} solved
                    </span>
                    <span className="flex items-center gap-1">
                      <span>👁️</span> {thread.viewCount} views
                    </span>
                  </div>
                </div>
                {thread.coverImageUrl && (
                  <img
                    src={thread.coverImageUrl}
                    alt=""
                    className="w-24 h-24 rounded-xl object-cover flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity"
                  />
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center gap-2 text-xs text-zinc-500">
                {thread.author.avatarUrl ? (
                  <img src={thread.author.avatarUrl} alt="" className="w-5 h-5 rounded-full" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-purple-800" />
                )}
                <span>{thread.author.displayName ?? thread.author.username}</span>
                <span className={`font-medium ${RANK_COLORS[thread.author.rank]}`}>
                  · {RANK_LABELS[thread.author.rank]}
                </span>
                <span className="ml-auto">{new Date(thread.createdAt).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
