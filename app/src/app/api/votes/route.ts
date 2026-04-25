import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const VoteSchema = z.object({
  commentId: z.string().min(1),
  value: z.union([z.literal(1), z.literal(-1)]),
});

// POST /api/votes — idempotent: toggle off if same value, switch if different
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = VoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { commentId, value } = parsed.data;
  const userId = session.user.id;

  const existing = await prisma.vote.findUnique({
    where: { userId_commentId: { userId, commentId } },
  });

  if (existing) {
    if (existing.value === value) {
      // Same vote — remove it (toggle off)
      await prisma.vote.delete({ where: { userId_commentId: { userId, commentId } } });
      return NextResponse.json({ action: "removed", value: 0 });
    } else {
      // Different vote — switch it
      const updated = await prisma.vote.update({
        where: { userId_commentId: { userId, commentId } },
        data: { value },
      });
      return NextResponse.json({ action: "switched", value: updated.value });
    }
  }

  const vote = await prisma.vote.create({
    data: { userId, commentId, value },
  });

  return NextResponse.json({ action: "created", value: vote.value }, { status: 201 });
}
