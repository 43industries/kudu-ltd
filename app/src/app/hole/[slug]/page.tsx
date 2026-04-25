import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ThreadPage({ params }: Props) {
  const { slug } = await params;
  const session = await auth();

  const thread = await prisma.rabbitHoleThread.findUnique({
    where: { slug },
    include: {
      author: { select: { username: true, displayName: true, avatarUrl: true, rank: true } },
      tags: { select: { tag: true } },
      levels: {
        orderBy: { levelNumber: "asc" },
        include: {
          puzzle: { select: { id: true, question: true, type: true } },
          unlocks: session?.user?.id
            ? { where: { userId: session.user.id }, select: { id: true } }
            : { where: { userId: "__none__" }, select: { id: true } },
        },
      },
    },
  });

  if (!thread || (thread.isSecret && !session?.user)) {
    notFound();
  }

  // Increment view count (fire-and-forget)
  prisma.rabbitHoleThread.update({
    where: { id: thread.id },
    data: { viewCount: { increment: 1 } },
  }).catch(() => {});

  // Determine which level is the furthest the current user has unlocked
  const unlockedLevelNumbers = new Set<number>(
    thread.levels.filter((l) => l.unlocks.length > 0).map((l) => l.levelNumber)
  );
  const _nextLevelNumber = Math.max(1, ...Array.from(unlockedLevelNumbers)) + (unlockedLevelNumbers.size > 0 ? 1 : 0);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Cover */}
      {thread.coverImageUrl && (
        <div className="w-full h-56 rounded-2xl overflow-hidden mb-8">
          <img src={thread.coverImageUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2 mb-3">
          {thread.tags.map(({ tag }: { tag: string }) => (
            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-purple-300">
              {tag}
            </span>
          ))}
        </div>
        <h1 className="text-3xl font-bold text-zinc-100 mb-2">{thread.title}</h1>
        <p className="text-zinc-400 text-lg">{thread.teaser}</p>

        <div className="flex items-center gap-3 mt-4 text-sm text-zinc-500">
          {thread.author.avatarUrl && (
            <img src={thread.author.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
          )}
          <span>by {thread.author.displayName ?? thread.author.username}</span>
          <span>·</span>
          <span>{thread.solveCount} completed</span>
          <span>·</span>
          <span>{thread.viewCount + 1} views</span>
        </div>
      </div>

      {/* Levels */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-300 mb-4">
          {thread.totalLevels} Level{thread.totalLevels !== 1 ? "s" : ""}
        </h2>
        {thread.levels.map((level: typeof thread.levels[number]) => {
          const isUnlocked = unlockedLevelNumbers.has(level.levelNumber);
          const isAccessible = level.levelNumber === 1 || unlockedLevelNumbers.has(level.levelNumber - 1) || isUnlocked;

          return (
            <div key={level.id}>
              {isAccessible ? (
                <Link
                  href={`/hole/${slug}/level/${level.levelNumber}`}
                  className={`group flex items-center gap-4 p-5 rounded-2xl border transition-all ${
                    isUnlocked
                      ? "bg-emerald-950/30 border-emerald-800 hover:border-emerald-600"
                      : "bg-zinc-900 border-zinc-800 hover:border-purple-700 hover:bg-zinc-800"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0 ${
                    isUnlocked ? "bg-emerald-700 text-white" : "bg-zinc-800 text-zinc-300 group-hover:bg-purple-900"
                  }`}>
                    {isUnlocked ? "✓" : level.levelNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-zinc-100">
                      {level.title ?? `Level ${level.levelNumber}`}
                    </div>
                    {level.puzzle && (
                      <div className="text-xs text-zinc-500 mt-0.5 uppercase tracking-wide">
                        {level.puzzle.type.replace("_", " ")}
                      </div>
                    )}
                  </div>
                  <div className="text-zinc-500 group-hover:text-purple-400 transition-colors">→</div>
                </Link>
              ) : (
                <div className="flex items-center gap-4 p-5 rounded-2xl border border-zinc-800 bg-zinc-900/50 opacity-50 cursor-not-allowed">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500">
                    🔒
                  </div>
                  <div>
                    <div className="font-semibold text-zinc-400">
                      {level.title ?? `Level ${level.levelNumber}`}
                    </div>
                    <div className="text-xs text-zinc-600">Solve the previous level to unlock</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
