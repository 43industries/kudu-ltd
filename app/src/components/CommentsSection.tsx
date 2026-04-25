"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

const RANK_COLORS: Record<string, string> = {
  LURKER: "text-zinc-400",
  CURIOUS: "text-emerald-400",
  DIGGER: "text-yellow-400",
  TRUTH_SEEKER: "text-orange-400",
  DEEP_DIVER: "text-purple-400",
  RABBIT_MASTER: "text-red-400",
};

interface Author {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  rank: string;
}

interface VoteRecord {
  userId: string;
  value: number;
}

interface Comment {
  id: string;
  content: string;
  isTheory: boolean;
  createdAt: string;
  author: Author;
  votes: VoteRecord[];
  replies: Comment[];
}

function voteScore(votes: VoteRecord[]) {
  return votes.reduce((sum, v) => sum + v.value, 0);
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function VoteButtons({ comment, userId }: { comment: Comment; userId?: string }) {
  const [votes, setVotes] = useState<VoteRecord[]>(comment.votes);
  const [loading, setLoading] = useState(false);

  const myVote = userId ? votes.find((v) => v.userId === userId)?.value ?? 0 : 0;
  const score = voteScore(votes);

  async function vote(value: 1 | -1) {
    if (!userId || loading) return;
    setLoading(true);
    const res = await fetch("/api/votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId: comment.id, value }),
    });
    if (res.ok) {
      const data = await res.json();
      setVotes((prev) => {
        const filtered = prev.filter((v) => v.userId !== userId);
        if (data.value !== 0) filtered.push({ userId: userId!, value: data.value });
        return filtered;
      });
    }
    setLoading(false);
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => vote(1)}
        disabled={!userId || loading}
        className={`text-xs px-1.5 py-0.5 rounded transition-colors ${myVote === 1 ? "text-emerald-400 bg-emerald-950/40" : "text-zinc-500 hover:text-emerald-400"}`}
      >
        ▲
      </button>
      <span className={`text-xs font-mono min-w-[1.5rem] text-center ${score > 0 ? "text-emerald-400" : score < 0 ? "text-red-400" : "text-zinc-500"}`}>
        {score}
      </span>
      <button
        onClick={() => vote(-1)}
        disabled={!userId || loading}
        className={`text-xs px-1.5 py-0.5 rounded transition-colors ${myVote === -1 ? "text-red-400 bg-red-950/40" : "text-zinc-500 hover:text-red-400"}`}
      >
        ▼
      </button>
    </div>
  );
}

function CommentCard({
  comment,
  userId,
  levelId,
  onDelete,
  depth = 0,
}: {
  comment: Comment;
  userId?: string;
  levelId: string;
  onDelete: (id: string) => void;
  depth?: number;
}) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replies, setReplies] = useState<Comment[]>(comment.replies);
  const [submitting, setSubmitting] = useState(false);

  async function submitReply() {
    if (!replyText.trim() || submitting) return;
    setSubmitting(true);
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ levelId, content: replyText.trim(), parentId: comment.id }),
    });
    if (res.ok) {
      const data = await res.json();
      setReplies((prev) => [...prev, data.comment]);
      setReplyText("");
      setShowReply(false);
    }
    setSubmitting(false);
  }

  async function deleteComment() {
    const res = await fetch(`/api/comments/${comment.id}`, { method: "DELETE" });
    if (res.ok) onDelete(comment.id);
  }

  return (
    <div className={`${depth > 0 ? "ml-6 border-l border-zinc-800 pl-4" : ""}`}>
      <div className={`group rounded-xl p-4 ${comment.isTheory ? "bg-purple-950/20 border border-purple-800/40" : "bg-zinc-900/60"}`}>
        {comment.isTheory && (
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-xs font-mono text-purple-400 bg-purple-950/50 border border-purple-800/50 px-2 py-0.5 rounded-full">
              🧠 theory
            </span>
          </div>
        )}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {comment.author.avatarUrl ? (
              <img src={comment.author.avatarUrl} alt="" className="w-6 h-6 rounded-full flex-shrink-0" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-purple-800 flex-shrink-0" />
            )}
            <div className="flex items-center gap-1.5 min-w-0">
              <a href={`/u/${comment.author.username}`} className="text-sm font-medium text-zinc-200 hover:text-purple-300 transition-colors truncate">
                {comment.author.displayName ?? comment.author.username}
              </a>
              <span className={`text-xs ${RANK_COLORS[comment.author.rank] ?? "text-zinc-500"} hidden sm:block`}>
                · {comment.author.rank.replace("_", " ")}
              </span>
              <span className="text-xs text-zinc-600">{timeAgo(comment.createdAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <VoteButtons comment={comment} userId={userId} />
            {userId === comment.author.id && (
              <button
                onClick={deleteComment}
                className="text-xs text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
              >
                delete
              </button>
            )}
          </div>
        </div>

        <p className="mt-2 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{comment.content}</p>

        {userId && depth === 0 && (
          <button
            onClick={() => setShowReply((v) => !v)}
            className="mt-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            {showReply ? "cancel" : "reply"}
          </button>
        )}
      </div>

      {showReply && (
        <div className="mt-2 ml-6 flex gap-2">
          <input
            autoFocus
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitReply(); } }}
            placeholder="Write a reply…"
            className="flex-1 bg-zinc-800 border border-zinc-700 focus:border-purple-500 focus:outline-none rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
          />
          <button
            onClick={submitReply}
            disabled={submitting || !replyText.trim()}
            className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-medium"
          >
            {submitting ? "…" : "Reply"}
          </button>
        </div>
      )}

      {replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {replies.map((reply) => (
            <CommentCard
              key={reply.id}
              comment={reply}
              userId={userId}
              levelId={levelId}
              onDelete={(id) => setReplies((prev) => prev.filter((r) => r.id !== id))}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  levelId: string;
}

export default function CommentsSection({ levelId }: Props) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "theories">("all");
  const [content, setContent] = useState("");
  const [isTheory, setIsTheory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    const res = await fetch(`/api/comments?levelId=${levelId}`);
    if (res.ok) {
      const data = await res.json();
      setComments(data.comments);
    }
    setLoading(false);
  }, [levelId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  async function submitComment() {
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ levelId, content: content.trim(), isTheory }),
    });
    if (res.ok) {
      const data = await res.json();
      setComments((prev) => [...prev, { ...data.comment, replies: [] }]);
      setContent("");
      setIsTheory(false);
    } else {
      const data = await res.json();
      setError(typeof data.error === "string" ? data.error : "Failed to post");
    }
    setSubmitting(false);
  }

  const filtered = tab === "theories" ? comments.filter((c) => c.isTheory) : comments;
  const theoriesCount = comments.filter((c) => c.isTheory).length;

  return (
    <div className="mt-12 border-t border-zinc-800 pt-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-zinc-200">Discussion</h2>
        <div className="flex rounded-lg overflow-hidden border border-zinc-800 text-sm">
          <button
            onClick={() => setTab("all")}
            className={`px-3 py-1.5 transition-colors ${tab === "all" ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            All ({comments.length})
          </button>
          <button
            onClick={() => setTab("theories")}
            className={`px-3 py-1.5 transition-colors ${tab === "theories" ? "bg-purple-900 text-purple-200" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            🧠 Theories ({theoriesCount})
          </button>
        </div>
      </div>

      {/* Composer */}
      {session?.user ? (
        <div className="mb-6 space-y-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            placeholder={isTheory ? "Share your theory about this level…" : "Share a comment, clue, or observation…"}
            className={`w-full bg-zinc-900 border focus:outline-none rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 transition-colors resize-none ${isTheory ? "border-purple-700 focus:border-purple-500" : "border-zinc-700 focus:border-zinc-500"}`}
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                onClick={() => setIsTheory((v) => !v)}
                className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${isTheory ? "bg-purple-600" : "bg-zinc-700"}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isTheory ? "translate-x-4" : "translate-x-0"}`} />
              </div>
              <span className="text-sm text-zinc-400">Post as theory</span>
            </label>
            <div className="flex items-center gap-3">
              {error && <span className="text-xs text-red-400">{error}</span>}
              <button
                onClick={submitComment}
                disabled={submitting || !content.trim()}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-medium transition-colors"
              >
                {submitting ? "Posting…" : "Post"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-zinc-500 mb-6">Sign in to join the discussion.</p>
      )}

      {/* Comments list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-zinc-900 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-zinc-600 text-center py-8">
          {tab === "theories" ? "No theories yet. Be the first to share one." : "No comments yet. Be the first to break the silence."}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              userId={session?.user?.id}
              levelId={levelId}
              onDelete={(id) => setComments((prev) => prev.filter((c) => c.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
