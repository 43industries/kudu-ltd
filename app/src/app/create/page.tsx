"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PUZZLE_TYPES = [
  { value: "TEXT_RIDDLE", label: "Text Riddle" },
  { value: "PASSWORD", label: "Password" },
  { value: "IMAGE_CLUE", label: "Image Clue" },
  { value: "NUMERIC", label: "Numeric" },
  { value: "MULTIPLE_CHOICE", label: "Multiple Choice" },
  { value: "CIPHER", label: "Cipher" },
  { value: "EXTERNAL", label: "External Link" },
];

interface LevelDraft {
  title: string;
  content: string;
  xpReward: number;
  revealHint: string;
  puzzle: {
    type: string;
    question: string;
    answer: string;
    caseSensitive: boolean;
    maxAttempts: string;
    externalClueUrl: string;
    answerHints: string;
  };
}

const emptyLevel = (): LevelDraft => ({
  title: "",
  content: "",
  xpReward: 50,
  revealHint: "",
  puzzle: {
    type: "TEXT_RIDDLE",
    question: "",
    answer: "",
    caseSensitive: false,
    maxAttempts: "",
    externalClueUrl: "",
    answerHints: "",
  },
});

export default function CreatePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [teaser, setTeaser] = useState("");
  const [isSecret, setIsSecret] = useState(false);
  const [tags, setTags] = useState("");
  const [levels, setLevels] = useState<LevelDraft[]>([emptyLevel()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateLevel(index: number, patch: Partial<LevelDraft>) {
    setLevels((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function updatePuzzle(index: number, patch: Partial<LevelDraft["puzzle"]>) {
    setLevels((prev) =>
      prev.map((l, i) => (i === index ? { ...l, puzzle: { ...l.puzzle, ...patch } } : l))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      title,
      teaser,
      isSecret,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      levels: levels.map((l) => ({
        title: l.title || undefined,
        content: l.content,
        xpReward: l.xpReward,
        revealHint: l.revealHint || undefined,
        puzzle: {
          type: l.puzzle.type,
          question: l.puzzle.question,
          answer: l.puzzle.answer,
          caseSensitive: l.puzzle.caseSensitive,
          maxAttempts: l.puzzle.maxAttempts ? parseInt(l.puzzle.maxAttempts) : undefined,
          externalClueUrl: l.puzzle.externalClueUrl || undefined,
          answerHints: l.puzzle.answerHints
            ? l.puzzle.answerHints.split("\n").map((h) => h.trim()).filter(Boolean)
            : [],
        },
      })),
    };

    try {
      const res = await fetch("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(typeof data.error === "string" ? data.error : "Something went wrong.");
        setLoading(false);
        return;
      }

      const { thread } = await res.json();
      router.push(`/hole/${thread.slug}`);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-zinc-100 mb-2">Create a Rabbit Hole</h1>
      <p className="text-zinc-400 mb-8">Build a mystery. Lock it behind puzzles. Let the community dig.</p>

      <form onSubmit={handleSubmit} className="space-y-10">
        {/* Thread details */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-200 border-b border-zinc-800 pb-2">Hole Details</h2>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="The Vanishing Lighthouse"
              className="w-full bg-zinc-800 border border-zinc-700 focus:border-purple-500 focus:outline-none rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Teaser (shown on feed) *</label>
            <textarea
              value={teaser}
              onChange={(e) => setTeaser(e.target.value)}
              required
              rows={2}
              placeholder="In 1987, a lighthouse keeper disappeared. No body. No note. Only a locked journal."
              className="w-full bg-zinc-800 border border-zinc-700 focus:border-purple-500 focus:outline-none rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Tags (comma separated)</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="mystery, cold-case, cipher"
              className="w-full bg-zinc-800 border border-zinc-700 focus:border-purple-500 focus:outline-none rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 transition-colors"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isSecret}
              onChange={(e) => setIsSecret(e.target.checked)}
              className="w-4 h-4 accent-purple-500"
            />
            <span className="text-sm text-zinc-300">
              Secret hole <span className="text-zinc-500">(won&apos;t appear on the public feed)</span>
            </span>
          </label>
        </section>

        {/* Levels */}
        <section className="space-y-6">
          <h2 className="text-lg font-semibold text-zinc-200 border-b border-zinc-800 pb-2">
            Levels ({levels.length})
          </h2>

          {levels.map((level, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono text-purple-400 uppercase tracking-widest">Level {i + 1}</span>
                {levels.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setLevels((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-xs text-red-500 hover:text-red-400"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Level title (optional)</label>
                <input
                  value={level.title}
                  onChange={(e) => updateLevel(i, { title: e.target.value })}
                  placeholder="The First Clue"
                  className="w-full bg-zinc-800 border border-zinc-700 focus:border-purple-500 focus:outline-none rounded-xl px-4 py-2.5 text-zinc-100 placeholder-zinc-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Content / Story *</label>
                <textarea
                  value={level.content}
                  onChange={(e) => updateLevel(i, { content: e.target.value })}
                  required
                  rows={4}
                  placeholder="The keeper's journal begins: 'Day 1. The fog won't lift. Something is wrong with the light.'"
                  className="w-full bg-zinc-800 border border-zinc-700 focus:border-purple-500 focus:outline-none rounded-xl px-4 py-2.5 text-zinc-100 placeholder-zinc-500 transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">XP reward</label>
                  <input
                    type="number"
                    value={level.xpReward}
                    onChange={(e) => updateLevel(i, { xpReward: parseInt(e.target.value) || 50 })}
                    min={1}
                    className="w-full bg-zinc-800 border border-zinc-700 focus:border-purple-500 focus:outline-none rounded-xl px-4 py-2.5 text-zinc-100 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Reveal hint after N wrong answers</label>
                  <input
                    value={level.revealHint}
                    onChange={(e) => updateLevel(i, { revealHint: e.target.value })}
                    placeholder="This hint shows after 3 fails"
                    className="w-full bg-zinc-800 border border-zinc-700 focus:border-purple-500 focus:outline-none rounded-xl px-4 py-2.5 text-zinc-100 placeholder-zinc-500 transition-colors"
                  />
                </div>
              </div>

              {/* Puzzle */}
              <div className="border-t border-zinc-800 pt-4 space-y-4">
                <span className="text-sm font-semibold text-zinc-300">Puzzle</span>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Type *</label>
                    <select
                      value={level.puzzle.type}
                      onChange={(e) => updatePuzzle(i, { type: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 focus:border-purple-500 focus:outline-none rounded-xl px-4 py-2.5 text-zinc-100 transition-colors"
                    >
                      {PUZZLE_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Max attempts (blank = ∞)</label>
                    <input
                      type="number"
                      value={level.puzzle.maxAttempts}
                      onChange={(e) => updatePuzzle(i, { maxAttempts: e.target.value })}
                      min={1}
                      placeholder="∞"
                      className="w-full bg-zinc-800 border border-zinc-700 focus:border-purple-500 focus:outline-none rounded-xl px-4 py-2.5 text-zinc-100 placeholder-zinc-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Question / Prompt *</label>
                  <textarea
                    value={level.puzzle.question}
                    onChange={(e) => updatePuzzle(i, { question: e.target.value })}
                    required
                    rows={2}
                    placeholder="What was the keeper's last word before disappearing?"
                    className="w-full bg-zinc-800 border border-zinc-700 focus:border-purple-500 focus:outline-none rounded-xl px-4 py-2.5 text-zinc-100 placeholder-zinc-500 transition-colors resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Answer * (stored as hash — never shown)</label>
                  <input
                    value={level.puzzle.answer}
                    onChange={(e) => updatePuzzle(i, { answer: e.target.value })}
                    required
                    type="password"
                    placeholder="The correct answer"
                    className="w-full bg-zinc-800 border border-zinc-700 focus:border-purple-500 focus:outline-none rounded-xl px-4 py-2.5 text-zinc-100 placeholder-zinc-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Progressive hints (one per line)</label>
                  <textarea
                    value={level.puzzle.answerHints}
                    onChange={(e) => updatePuzzle(i, { answerHints: e.target.value })}
                    rows={2}
                    placeholder={"It's in the journal's first entry.\nLook at the first letter of each sentence."}
                    className="w-full bg-zinc-800 border border-zinc-700 focus:border-purple-500 focus:outline-none rounded-xl px-4 py-2.5 text-zinc-100 placeholder-zinc-500 transition-colors resize-none"
                  />
                </div>

                {level.puzzle.type === "EXTERNAL" && (
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">External clue URL</label>
                    <input
                      value={level.puzzle.externalClueUrl}
                      onChange={(e) => updatePuzzle(i, { externalClueUrl: e.target.value })}
                      type="url"
                      placeholder="https://..."
                      className="w-full bg-zinc-800 border border-zinc-700 focus:border-purple-500 focus:outline-none rounded-xl px-4 py-2.5 text-zinc-100 placeholder-zinc-500 transition-colors"
                    />
                  </div>
                )}

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={level.puzzle.caseSensitive}
                    onChange={(e) => updatePuzzle(i, { caseSensitive: e.target.checked })}
                    className="w-4 h-4 accent-purple-500"
                  />
                  <span className="text-sm text-zinc-300">Case-sensitive answer</span>
                </label>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setLevels((prev) => [...prev, emptyLevel()])}
            className="w-full py-3 rounded-xl border border-dashed border-zinc-700 text-zinc-500 hover:border-purple-700 hover:text-purple-400 transition-colors text-sm"
          >
            + Add Level
          </button>
        </section>

        {error && (
          <div className="bg-red-950/30 border border-red-800 rounded-xl px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-lg transition-colors"
        >
          {loading ? "Creating…" : "Create Rabbit Hole 🐇"}
        </button>
      </form>
    </div>
  );
}
