import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import PuzzleForm from "@/components/PuzzleForm";
import CommentsSection from "@/components/CommentsSection";
import Link from "next/link";

interface Props {
  params: Promise<{ slug: string; number: string }>;
}

export default async function LevelPage({ params }: Props) {
  const { slug, number } = await params;
  const levelNumber = parseInt(number);
  if (isNaN(levelNumber) || levelNumber < 1) notFound();

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = session.user.id;

  const thread = await prisma.rabbitHoleThread.findUnique({ where: { slug } });
  if (!thread) notFound();

  const level = await prisma.level.findUnique({
    where: { threadId_levelNumber: { threadId: thread.id, levelNumber } },
    include: {
      puzzle: true,
      unlocks: { where: { userId }, select: { id: true } },
    },
  });
  if (!level) notFound();

  // Gate: user must have unlocked the previous level to access this one (except level 1)
  if (levelNumber > 1) {
    const prevUnlock = await prisma.levelUnlock.findFirst({
      where: { userId, level: { threadId: thread.id, levelNumber: levelNumber - 1 } },
    });
    if (!prevUnlock) {
      redirect(`/hole/${slug}`);
    }
  }

  const isUnlocked = level.unlocks.length > 0;

  // Count user's attempts on this puzzle
  const attemptCount = level.puzzle
    ? await prisma.puzzleAttempt.count({ where: { puzzleId: level.puzzle.id, userId } })
    : 0;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-zinc-500 mb-8">
        <Link href="/" className="hover:text-zinc-300">Home</Link>
        <span>/</span>
        <Link href={`/hole/${slug}`} className="hover:text-zinc-300">{thread.title}</Link>
        <span>/</span>
        <span className="text-zinc-300">Level {levelNumber}</span>
      </div>

      {/* Level header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-mono text-purple-400 bg-purple-950/40 border border-purple-800 px-2 py-0.5 rounded">
            LEVEL {levelNumber} / {thread.totalLevels}
          </span>
          {isUnlocked && (
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800 px-2 py-0.5 rounded">
              ✓ SOLVED
            </span>
          )}
        </div>
        {level.title && (
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">{level.title}</h1>
        )}
      </div>

      {/* Level content */}
      <article className="prose prose-invert prose-zinc max-w-none mb-10">
        <div
          className="text-zinc-300 leading-relaxed whitespace-pre-wrap text-base"
          dangerouslySetInnerHTML={{ __html: level.content.replace(/\n/g, "<br/>") }}
        />
      </article>

      {/* Media */}
      {level.mediaUrls.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-10">
          {level.mediaUrls.map((url: string, i: number) => (
            <img key={i} src={url} alt="" className="rounded-xl w-full object-cover" />
          ))}
        </div>
      )}

      {/* Puzzle */}
      {level.puzzle && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🧩</span>
            <span className="text-xs font-mono text-purple-400 uppercase tracking-widest">
              {level.puzzle.type.replace(/_/g, " ")}
            </span>
          </div>
          <p className="text-zinc-100 text-lg font-medium mb-6">{level.puzzle.question}</p>

          {level.puzzle.externalClueUrl && (
            <a
              href={level.puzzle.externalClueUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 mb-6 transition-colors"
            >
              🔗 External clue →
            </a>
          )}

          {isUnlocked ? (
            <div className="flex items-center gap-3 text-emerald-400">
              <span className="text-2xl">✓</span>
              <div>
                <div className="font-semibold">Solved!</div>
                <div className="text-sm text-emerald-600">You earned {level.xpReward} XP for this level.</div>
              </div>
            </div>
          ) : (
            <PuzzleForm
              puzzleId={level.puzzle.id}
              puzzleType={level.puzzle.type}
              attemptCount={attemptCount}
              maxAttempts={level.puzzle.maxAttempts}
              threadSlug={slug}
              levelNumber={levelNumber}
              totalLevels={thread.totalLevels}
            />
          )}
        </div>
      )}

      {/* Comments — only visible after solving */}
      {isUnlocked && level.puzzle && (
        <CommentsSection levelId={level.id} />
      )}
    </div>
  );
}
