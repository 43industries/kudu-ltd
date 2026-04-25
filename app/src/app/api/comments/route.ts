import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const CreateCommentSchema = z.object({
  levelId: z.string().min(1),
  content: z.string().min(1).max(2000),
  isTheory: z.boolean().optional().default(false),
  parentId: z.string().optional(),
});

// GET /api/comments?levelId=xxx
export async function GET(req: NextRequest) {
  const levelId = req.nextUrl.searchParams.get("levelId");
  if (!levelId) {
    return NextResponse.json({ error: "levelId required" }, { status: 400 });
  }

  const comments = await prisma.comment.findMany({
    where: { levelId, parentId: null },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { id: true, username: true, displayName: true, avatarUrl: true, rank: true } },
      votes: { select: { userId: true, value: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { id: true, username: true, displayName: true, avatarUrl: true, rank: true } },
          votes: { select: { userId: true, value: true } },
        },
      },
    },
  });

  return NextResponse.json({ comments });
}

// POST /api/comments
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateCommentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { levelId, content, isTheory, parentId } = parsed.data;

  // Verify level exists and user has unlocked it (required to comment)
  const level = await prisma.level.findUnique({
    where: { id: levelId },
    include: { unlocks: { where: { userId: session.user.id }, select: { id: true } } },
  });

  if (!level) {
    return NextResponse.json({ error: "Level not found" }, { status: 404 });
  }

  if (level.unlocks.length === 0) {
    return NextResponse.json({ error: "Solve this level first to comment" }, { status: 403 });
  }

  const comment = await prisma.comment.create({
    data: {
      content,
      isTheory: isTheory ?? false,
      authorId: session.user.id,
      levelId,
      parentId: parentId ?? null,
    },
    include: {
      author: { select: { id: true, username: true, displayName: true, avatarUrl: true, rank: true } },
      votes: { select: { userId: true, value: true } },
      replies: [],
    },
  });

  // Notify thread author if someone comments (fire-and-forget)
  if (!parentId) {
    prisma.level.findUnique({
      where: { id: levelId },
      include: { thread: { include: { author: { select: { id: true } } } } },
    }).then(async (lvl) => {
      if (lvl && lvl.thread.authorId !== session.user!.id) {
        await prisma.notification.create({
          data: {
            type: "NEW_COMMENT",
            message: `Someone commented on level ${lvl.levelNumber} of "${lvl.thread.title}"`,
            userId: lvl.thread.authorId,
            threadId: lvl.threadId,
            commentId: comment.id,
            actorId: session.user!.id,
          },
        });
      }
    }).catch(() => {});
  } else {
    // Notify parent comment author of reply
    prisma.comment.findUnique({ where: { id: parentId }, select: { authorId: true } }).then(async (parent) => {
      if (parent && parent.authorId !== session.user!.id) {
        await prisma.notification.create({
          data: {
            type: "NEW_REPLY",
            message: "Someone replied to your comment",
            userId: parent.authorId,
            commentId: comment.id,
            actorId: session.user!.id,
          },
        });
      }
    }).catch(() => {});
  }

  return NextResponse.json({ comment }, { status: 201 });
}
