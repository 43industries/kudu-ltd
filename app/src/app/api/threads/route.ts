import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import slugify from "slugify";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const PuzzleTypeEnum = z.enum([
  "TEXT_RIDDLE",
  "PASSWORD",
  "IMAGE_CLUE",
  "NUMERIC",
  "MULTIPLE_CHOICE",
  "CIPHER",
  "EXTERNAL",
]);

const LevelSchema = z.object({
  title: z.string().optional(),
  content: z.string().min(1, "Level content is required"),
  mediaUrls: z.array(z.string().url()).optional().default([]),
  revealHint: z.string().optional(),
  xpReward: z.number().int().positive().optional().default(50),
  puzzle: z.object({
    type: PuzzleTypeEnum,
    question: z.string().min(1),
    answer: z.string().min(1, "Answer is required to hash"),
    answerHints: z.array(z.string()).optional().default([]),
    caseSensitive: z.boolean().optional().default(false),
    maxAttempts: z.number().int().positive().optional(),
    timeLimit: z.number().int().positive().optional(),
    externalClueUrl: z.string().url().optional(),
  }),
});

const CreateThreadSchema = z.object({
  title: z.string().min(3).max(120),
  teaser: z.string().min(10).max(280),
  coverImageUrl: z.string().url().optional(),
  isSecret: z.boolean().optional().default(false),
  tags: z.array(z.string()).optional().default([]),
  levels: z.array(LevelSchema).min(1, "At least one level is required"),
});

// GET /api/threads — public feed (non-secret, active threads)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));
  const tag = searchParams.get("tag");

  const where = {
    isSecret: false,
    isActive: true,
    ...(tag ? { tags: { some: { tag } } } : {}),
  };

  const [threads, total] = await Promise.all([
    prisma.rabbitHoleThread.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true, rank: true } },
        tags: { select: { tag: true } },
        _count: { select: { levels: true, votes: true } },
      },
    }),
    prisma.rabbitHoleThread.count({ where }),
  ]);

  return NextResponse.json({ threads, total, page, limit });
}

// POST /api/threads — create a rabbit hole (auth required)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateThreadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { title, teaser, coverImageUrl, isSecret, tags, levels } = parsed.data;

  // Generate a unique slug
  const baseSlug = slugify(title, { lower: true, strict: true });
  const existing = await prisma.rabbitHoleThread.count({ where: { slug: { startsWith: baseSlug } } });
  const slug = existing === 0 ? baseSlug : `${baseSlug}-${existing}`;

  // Hash all puzzle answers before writing anything
  const hashedLevels = await Promise.all(
    levels.map(async (lvl) => {
      const { answer, caseSensitive, ...rest } = lvl.puzzle;
      const canonical = caseSensitive ? answer.trim() : answer.trim().toLowerCase();
      const answerHash = await bcrypt.hash(canonical, 10);
      return { ...lvl, puzzle: { ...rest, caseSensitive: caseSensitive ?? false, answerHash } };
    })
  );

  // Create thread + levels + puzzles in a single transaction
  const thread = await prisma.$transaction(async (tx) => {
    const newThread = await tx.rabbitHoleThread.create({
      data: {
        slug,
        title,
        teaser,
        coverImageUrl,
        isSecret,
        totalLevels: levels.length,
        authorId: session.user!.id!,
        tags: {
          create: tags.map((tag) => ({ tag })),
        },
      },
    });

    for (let i = 0; i < hashedLevels.length; i++) {
      const lvl = hashedLevels[i];
      await tx.level.create({
        data: {
          threadId: newThread.id,
          levelNumber: i + 1,
          title: lvl.title,
          content: lvl.content,
          mediaUrls: lvl.mediaUrls,
          revealHint: lvl.revealHint,
          xpReward: lvl.xpReward,
          puzzle: {
            create: {
              type: lvl.puzzle.type,
              question: lvl.puzzle.question,
              answerHash: lvl.puzzle.answerHash,
              answerHints: lvl.puzzle.answerHints,
              caseSensitive: lvl.puzzle.caseSensitive,
              maxAttempts: lvl.puzzle.maxAttempts,
              timeLimit: lvl.puzzle.timeLimit,
              externalClueUrl: lvl.puzzle.externalClueUrl,
            },
          },
        },
      });
    }

    return newThread;
  });

  return NextResponse.json({ thread }, { status: 201 });
}
