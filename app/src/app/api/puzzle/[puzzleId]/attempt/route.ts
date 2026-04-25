import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { normalizeAnswer, computeRank } from "@/lib/answer";

const AttemptSchema = z.object({
  answer: z.string().min(1, "Answer cannot be empty"),
});

// Badge award logic — checked after every correct solve
async function checkAndAwardBadges(userId: string, tx: Prisma.TransactionClient) {
  const unlockCount = await tx.levelUnlock.count({ where: { userId } });
  const badgesToCheck: { slug: string; threshold: number }[] = [
    { slug: "first-unlock", threshold: 1 },
    { slug: "ten-unlocks", threshold: 10 },
    { slug: "fifty-unlocks", threshold: 50 },
  ];

  for (const { slug, threshold } of badgesToCheck) {
    if (unlockCount >= threshold) {
      const badge = await tx.badge.findUnique({ where: { slug } });
      if (!badge) continue;
      const alreadyHas = await tx.userBadge.findUnique({ where: { userId_badgeId: { userId, badgeId: badge.id } } });
      if (!alreadyHas) {
        await tx.userBadge.create({ data: { userId, badgeId: badge.id } });
      }
    }
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ puzzleId: string }> }
) {
  // 1. Auth check
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const { puzzleId } = await params;

  // 2. Validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = AttemptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { answer } = parsed.data;

  // 3. Load puzzle + level
  const puzzle = await prisma.puzzle.findUnique({
    where: { id: puzzleId },
    include: {
      level: {
        include: {
          thread: { select: { id: true, totalLevels: true } },
        },
      },
    },
  });

  if (!puzzle) {
    return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
  }

  // 4. Check if user already unlocked this level
  const existingUnlock = await prisma.levelUnlock.findUnique({
    where: { userId_levelId: { userId, levelId: puzzle.levelId } },
  });

  if (existingUnlock) {
    return NextResponse.json({ status: "already_unlocked" }, { status: 200 });
  }

  // 5. Count prior attempts for this user+puzzle
  const attemptCount = await prisma.puzzleAttempt.count({
    where: { puzzleId, userId },
  });

  if (puzzle.maxAttempts !== null && attemptCount >= puzzle.maxAttempts) {
    const hint = puzzle.answerHints[0] ?? null;
    return NextResponse.json(
      { status: "attempts_exhausted", hint, attemptCount, maxAttempts: puzzle.maxAttempts },
      { status: 429 }
    );
  }

  // 6. Normalize and compare answer
  const normalized = normalizeAnswer(answer, puzzle.caseSensitive);
  const isCorrect = await bcrypt.compare(normalized, puzzle.answerHash);

  // 7. Record the attempt
  await prisma.puzzleAttempt.create({
    data: { puzzleId, userId, answer, isCorrect },
  });

  const newAttemptCount = attemptCount + 1;

  // 8. Wrong answer
  if (!isCorrect) {
    const hintThreshold = 3;
    const hint =
      newAttemptCount >= hintThreshold && puzzle.answerHints.length > 0
        ? puzzle.answerHints[Math.min(Math.floor(newAttemptCount / hintThreshold) - 1, puzzle.answerHints.length - 1)]
        : null;

    return NextResponse.json({
      status: "wrong",
      attemptCount: newAttemptCount,
      maxAttempts: puzzle.maxAttempts,
      hint,
    });
  }

  // 9. Correct — run unlock flow in a transaction
  const { level } = puzzle;
  const thread = level.thread;
  const isLastLevel = level.levelNumber === thread.totalLevels;

  const result = await prisma.$transaction(async (tx) => {
    // Create the unlock record
    await tx.levelUnlock.create({
      data: {
        userId,
        levelId: level.id,
        threadId: thread.id,
        xpEarned: level.xpReward,
      },
    });

    // Award XP and recompute rank
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { xp: { increment: level.xpReward } },
    });
    const newRank = computeRank(updatedUser.xp);
    if (newRank !== updatedUser.rank) {
      await tx.user.update({ where: { id: userId }, data: { rank: newRank } });
    }

    // Increment solveCount if this is the final level
    if (isLastLevel) {
      await tx.rabbitHoleThread.update({
        where: { id: thread.id },
        data: { solveCount: { increment: 1 } },
      });
    }

    // Check badge awards
    await checkAndAwardBadges(userId, tx);

    // Fetch next level content (if exists)
    const nextLevel = isLastLevel
      ? null
      : await tx.level.findUnique({
          where: { threadId_levelNumber: { threadId: thread.id, levelNumber: level.levelNumber + 1 } },
          include: { puzzle: { select: { id: true, type: true, question: true, maxAttempts: true, timeLimit: true, externalClueUrl: true, answerHints: true } } },
        });

    return { updatedUser, newRank, nextLevel };
  });

  return NextResponse.json({
    status: "correct",
    xpEarned: level.xpReward,
    totalXp: result.updatedUser.xp,
    rank: result.newRank,
    isLastLevel,
    nextLevel: result.nextLevel,
  });
}
