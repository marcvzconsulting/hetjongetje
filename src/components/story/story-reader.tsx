"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface StoryPage {
  pageNumber: number;
  text: string;
  illustrationUrl: string | null;
  illustrationDescription: string | null;
}

interface Props {
  storyId: string;
  title: string;
  subtitle: string | null;
  childName: string;
  childId: string;
  pages: StoryPage[];
  isFavorite: boolean;
}

export function StoryReader({ storyId, title: initialTitle, subtitle, childName, childId, pages, isFavorite: initialFavorite }: Props) {
  const [currentPage, setCurrentPage] = useState(-1); // -1 = title page
  const [direction, setDirection] = useState(1);
  const [storyTitle, setStoryTitle] = useState(initialTitle);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(initialTitle);
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [saving, setSaving] = useState(false);
  const totalPages = pages.length;

  async function saveTitle() {
    if (!editValue.trim() || editValue === storyTitle) {
      setIsEditing(false);
      setEditValue(storyTitle);
      return;
    }
    setSaving(true);
    try {
      await fetch(`/api/stories/${storyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editValue.trim() }),
      });
      setStoryTitle(editValue.trim());
    } catch { /* ignore */ }
    setSaving(false);
    setIsEditing(false);
  }

  async function toggleFavorite() {
    const newValue = !isFavorite;
    setIsFavorite(newValue);
    try {
      await fetch(`/api/stories/${storyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: newValue }),
      });
    } catch {
      setIsFavorite(!newValue);
    }
  }

  const nextPage = useCallback(() => {
    if (currentPage < totalPages - 1) {
      setDirection(1);
      setCurrentPage((p) => p + 1);
    }
  }, [currentPage, totalPages]);

  const prevPage = useCallback(() => {
    if (currentPage > -1) {
      setDirection(-1);
      setCurrentPage((p) => p - 1);
    }
  }, [currentPage]);

  const isFirstPage = currentPage === -1;
  const isLastPage = currentPage === totalPages - 1;
  const page = currentPage >= 0 ? pages[currentPage] : null;

  // Swipe handling for touch devices
  const [touchStart, setTouchStart] = useState<number | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    setTouchStart(e.touches[0].clientX);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextPage();
      else prevPage();
    }
    setTouchStart(null);
  }

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-[#fdf6e3]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#fdf6e3]/90 backdrop-blur-sm border-b border-amber-200/50 z-10">
        <Link
          href="/dashboard"
          className="text-sm text-amber-800/60 hover:text-amber-900 transition-colors"
        >
          &larr; Terug
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFavorite}
            className="text-lg transition-transform hover:scale-110"
            title={isFavorite ? "Uit bibliotheek verwijderen" : "Opslaan in bibliotheek"}
          >
            {isFavorite ? "❤️" : "🤍"}
          </button>
          <span className="text-xs text-amber-800/40">
            {isFirstPage
              ? storyTitle
              : `${currentPage + 1} / ${totalPages}`}
          </span>
        </div>
        <Link
          href={`/generate/${childId}`}
          className="text-sm text-primary font-medium hover:text-primary-light transition-colors"
        >
          + Nieuw verhaal
        </Link>
      </div>

      {/* Book area */}
      <div
        className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentPage}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "tween", duration: 0.35, ease: "easeInOut" }}
            className="w-full h-full max-w-2xl max-h-[calc(100vh-120px)] flex flex-col"
          >
            {isFirstPage ? (
              /* ===== Title page ===== */
              <div className="flex-1 flex flex-col items-center justify-center text-center rounded-3xl bg-white shadow-lg border border-amber-100 p-8 sm:p-12">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <span className="text-5xl sm:text-6xl">📖</span>
                </div>
                {isEditing ? (
                  <div className="flex flex-col items-center gap-2 mb-3 w-full max-w-md">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveTitle();
                        if (e.key === "Escape") { setIsEditing(false); setEditValue(storyTitle); }
                      }}
                      autoFocus
                      className="w-full text-center text-2xl sm:text-3xl font-extrabold text-amber-900 bg-amber-50 rounded-xl px-4 py-2 border-2 border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={saveTitle}
                        disabled={saving}
                        className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-white hover:bg-primary-light disabled:opacity-50"
                      >
                        {saving ? "Opslaan..." : "Opslaan"}
                      </button>
                      <button
                        onClick={() => { setIsEditing(false); setEditValue(storyTitle); }}
                        className="rounded-lg border border-amber-300 px-4 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-50"
                      >
                        Annuleren
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="group mb-3"
                    title="Klik om de titel te wijzigen"
                  >
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-amber-900 leading-tight group-hover:text-primary transition-colors">
                      {storyTitle}
                    </h1>
                    <span className="text-xs text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      ✏️ Klik om te hernoemen
                    </span>
                  </button>
                )}
                {subtitle && (
                  <p className="text-lg sm:text-xl text-amber-700/70 italic mb-6">
                    {subtitle}
                  </p>
                )}
                <div className="w-16 h-0.5 bg-amber-300 mb-6" />
                <p className="text-base sm:text-lg text-amber-800/60">
                  Een verhaal voor <strong className="text-amber-900">{childName}</strong>
                </p>
              </div>
            ) : page ? (
              /* ===== Story page ===== */
              <div className="flex-1 flex flex-col rounded-3xl bg-white shadow-lg border border-amber-100 overflow-hidden">
                {/* Illustration */}
                <div className="flex-1 min-h-0 bg-amber-50 flex items-center justify-center p-4">
                  {page.illustrationUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={page.illustrationUrl}
                      alt={page.illustrationDescription || "Illustratie"}
                      className="max-w-full max-h-full rounded-2xl object-contain"
                    />
                  ) : (
                    <div className="w-full h-full max-h-72 sm:max-h-96 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-50 border-2 border-dashed border-amber-200 flex items-center justify-center">
                      <div className="text-center">
                        <span className="text-5xl sm:text-6xl block mb-2">🎨</span>
                        <span className="text-xs text-amber-400">Illustratie komt hier</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Text */}
                <div className="px-6 py-5 sm:px-10 sm:py-8">
                  <p className="text-lg sm:text-xl md:text-2xl leading-relaxed sm:leading-relaxed text-amber-950 font-medium text-center">
                    {page.text}
                  </p>
                </div>
              </div>
            ) : null}

            {/* Last page extra */}
            {isLastPage && (
              <div className="mt-4 text-center">
                <p className="text-lg font-bold text-primary">Einde ✨</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom navigation */}
      <div className="flex items-center justify-between px-6 py-3 bg-[#fdf6e3]/90 backdrop-blur-sm border-t border-amber-200/50">
        <button
          onClick={prevPage}
          disabled={isFirstPage}
          className="flex items-center gap-1 rounded-full px-5 py-2.5 text-sm font-medium text-amber-800 transition-all hover:bg-amber-100 disabled:opacity-0 disabled:cursor-default"
        >
          &larr; Vorige
        </button>

        {/* Page dots */}
        <div className="flex gap-1.5 items-center">
          {[-1, ...pages.map((_, i) => i)].map((i) => (
            <button
              key={i}
              onClick={() => {
                setDirection(i > currentPage ? 1 : -1);
                setCurrentPage(i);
              }}
              className={`rounded-full transition-all ${
                i === currentPage
                  ? "w-6 h-2.5 bg-primary"
                  : "w-2.5 h-2.5 bg-amber-300 hover:bg-amber-400"
              }`}
            />
          ))}
        </div>

        {isLastPage ? (
          <Link
            href={`/generate/${childId}`}
            className="flex items-center gap-1 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-light"
          >
            Nog een verhaal ✨
          </Link>
        ) : (
          <button
            onClick={nextPage}
            className="flex items-center gap-1 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-light"
          >
            Volgende &rarr;
          </button>
        )}
      </div>
    </div>
  );
}
