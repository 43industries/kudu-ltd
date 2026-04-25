import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const FollowSchema = z.object({
  targetUserId: z.string().min(1),
});

// POST /api/follows — toggle follow/unfollow
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = FollowSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const followerId = session.user.id;
  const { targetUserId: followingId } = parsed.data;

  if (followerId === followingId) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  });

  if (existing) {
    await prisma.follow.delete({ where: { followerId_followingId: { followerId, followingId } } });
    return NextResponse.json({ following: false });
  }

  await prisma.follow.create({ data: { followerId, followingId } });

  // Notify the followed user (fire-and-forget)
  prisma.notification.create({
    data: {
      type: "NEW_FOLLOWER",
      message: "Someone started following you",
      userId: followingId,
      actorId: followerId,
    },
  }).catch(() => {});

  return NextResponse.json({ following: true }, { status: 201 });
}
