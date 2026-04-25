import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

const TYPE_ICON: Record<string, string> = {
  NEW_COMMENT: "💬",
  NEW_REPLY: "↩️",
  NEW_FOLLOWER: "👤",
  LEVEL_SOLVED: "✅",
  BADGE_EARNED: "🏅",
};

function timeAgo(date: Date) {
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Mark all as read
  await prisma.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: { isRead: true },
  });

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-100">Notifications</h1>
        <span className="text-sm text-zinc-500">{notifications.length} total</span>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <div className="text-4xl mb-3">🔔</div>
          <p>Nothing yet. Go deeper and things will happen.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const href = n.threadId ? `/hole/${n.threadId}` : null;
            const content = (
              <div className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${
                !n.isRead ? "bg-zinc-900 border-zinc-700" : "bg-zinc-900/40 border-zinc-800"
              }`}>
                <span className="text-xl flex-shrink-0 mt-0.5">
                  {TYPE_ICON[n.type] ?? "🔔"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200">{n.message}</p>
                  <p className="text-xs text-zinc-500 mt-1">{timeAgo(new Date(n.createdAt))}</p>
                </div>
                {!n.isRead && (
                  <div className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0 mt-1.5" />
                )}
              </div>
            );

            return href ? (
              <Link key={n.id} href={href}>{content}</Link>
            ) : (
              <div key={n.id}>{content}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
