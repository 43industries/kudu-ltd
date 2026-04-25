"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface PuzzleFormProps {
  puzzleId: string;
  puzzleType: string;
  attemptCount: number;
  maxAttempts: number | null;
  threadSlug: string;
  levelNumber: number;
  totalLevels: number;
}

export default function PuzzleForm({
  puzzleId,
  puzzleType,
  attemptCount: initialAttemptCount,
  maxAttempts,
  threadSlug,
  levelNumber,
  totalLevels,
}: PuzzleFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [answer, setAnswer] = useState("");
  const [attemptCount, setAttemptCount] = useState(initialAttemptCount);
  const [hint, setHint] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | "exhausted" | null>(null);
  const [xpEarned, setXpEarned] = useState<number | null>(null);
  const [isLastLevel, setIsLastLevel] = useState(false);

  const attemptsLeft = maxAttempts !== null ? maxAttempts - attemptCount : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim() || isPending) return;

    const res = await fetch(`/api/puzzle/${puzzleId}/attempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer }),
    });

    const data = await res.json();

    if (data.status === "correct" || data.status === "already_unlocked") {
      setFeedback("correct");
      setXpEarned(data.xpEarned ?? 0);
      setIsLastLevel(data.isLastLevel ?? false);
      startTransition(() => {
        // Wait a beat then navigate
        setTimeout(() => {
          if (data.isLastLevel) {
            router.push(`/hole/${threadSlug}`);
          } else {
            router.push(`/hole/${threadSlug}/level/${levelNumber + 1}`);
          }
          router.refresh();
        }, 1500);
      });
    } else if (data.status === "attempts_exhausted") {
      setFeedback("exhausted");
      setHint(data.hint);
    } else {
      setFeedback("wrong");
      setAttemptCount(data.attemptCount ?? attemptCount + 1);
      if (data.hint) setHint(data.hint);
    }
  }

  if (feedback === "correct") {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="text-4xl animate-bounce">🐇</div>
        <div className="text-emerald-400 font-bold text-xl">Correct!</div>
        {xpEarned !== null && (
          <div className="text-emerald-600 text-sm">+{xpEarned} XP earned</div>
        )}
        <div className="text-zinc-500 text-sm">
          {isLastLevel ? "You've completed this rabbit hole!" : "Loading next level…"}
        </div>
      </div>
    );
  }

  if (feedback === "exhausted") {
    return (
      <div className="space-y-3">
        <div className="text-red-400 font-semibold">Attempts exhausted.</div>
        {hint && (
          <div className="bg-yellow-950/30 border border-yellow-800 rounded-xl p-4 text-yellow-300 text-sm">
            <span className="font-semibold">Hint:</span> {hint}
          </div>
        )}
        <p className="text-zinc-500 text-sm">You&apos;ve used all your attempts for this puzzle.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Attempts indicator */}
      {attemptsLeft !== null && (
        <div className="text-xs text-zinc-500">
          {attemptsLeft} attempt{attemptsLeft !== 1 ? "s" : ""} remaining
        </div>
      )}

      {/* Wrong feedback */}
      {feedback === "wrong" && (
        <div className="bg-red-950/30 border border-red-800 rounded-xl px-4 py-3 text-red-400 text-sm font-medium">
          Wrong answer. Try again.
        </div>
      )}

      {/* Hint */}
      {hint && (
        <div className="bg-yellow-950/30 border border-yellow-800 rounded-xl p-4 text-yellow-300 text-sm">
          <span className="font-semibold">Hint:</span> {hint}
        </div>
      )}

      <div className="flex gap-3">
        <input
          type={puzzleType === "NUMERIC" ? "number" : "text"}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Enter your answer…"
          className="flex-1 bg-zinc-800 border border-zinc-700 focus:border-purple-500 focus:outline-none rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 transition-colors"
          disabled={isPending}
          autoFocus
        />
        <button
          type="submit"
          disabled={isPending || !answer.trim()}
          className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
        >
          {isPending ? "…" : "Submit"}
        </button>
      </div>

      {attemptCount > 0 && (
        <div className="text-xs text-zinc-600">{attemptCount} attempt{attemptCount !== 1 ? "s" : ""} so far</div>
      )}
    </form>
  );
}
