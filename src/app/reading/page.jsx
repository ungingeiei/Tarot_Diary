"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppHeader } from "../../components/Header";
import { TarotCard } from "../../components/TarotVisual";
import { ShareReadingModal } from "../../components/ShareReadingModal";
import { fetchDailyCard, fetchTimeCard } from "../../data/cards";
import { isSignedIn } from "../../lib/auth";
import { saveDiaryEntry } from "../../lib/diary";

function ReadingContent() {
  const searchParams = useSearchParams();
  const category = searchParams.get("category") || "";
  const period = searchParams.get("period") || "";

  const [card, setCard] = useState(null);
  const [saved, setSaved] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [toast, setToast] = useState(null); // { type: "success" | "error", message }

  useEffect(() => {
    let cancelled = false;
    setCard(null);
    setSaved(false);

    // Stand-in for: fetch(`/api/cards/daily?category=${category}`)
    const fetchCard = period
      ? fetchTimeCard(period)
      : fetchDailyCard(category);

    fetchCard.then((result) => {
      if (!cancelled) setCard(result);
    });

    return () => {
      cancelled = true;
    };
  }, [category, period]);

  // Auto-dismiss the save toast.
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleSave = () => {
    if (!card) return;

    // Stand-in for: POST /api/diary  (server would 401 if the session is missing)
    if (!isSignedIn()) {
      setToast({
        type: "error",
        message: "Please sign in to save this reading to your Tarot Diary",
      });
      return;
    }

    saveDiaryEntry({
      cardId: card.id,
      cardName: card.name,
      image: card.image,
      imageAlt: card.imageAlt,
      category: category || "love",
      categoryLabel: card.diaryLabel,
      text: card.summary.join(" "),
      adviceTitle: card.adviceTitle,
      advice: card.advice,
    });

    setSaved(true);
    setToast({ type: "success", message: "Reading saved successfully" });
  };

  return (
    <main className="app-page reading-page">
      <AppHeader />

      {toast && (
        <div className={`save-toast save-toast-${toast.type}`} role="status">
          {toast.message}
        </div>
      )}

      <section className={`reading-panel${!card ? " is-loading" : ""}`}>
        <div className="reading-card-col">
          {card ? (
            <div className="reading-card-frame">
              <img src={card.image} alt={card.imageAlt} className="reading-card-img" />
            </div>
          ) : (
            <>
              <TarotCard className="reading-card" />
              <p className="reading-loading">Drawing your card…</p>
            </>
          )}
        </div>

        {card && (
          <div className="reading-content">
            <div className="reading-title-row">
              <h1>{card.name}</h1>
              <span className="diary-pill">{card.diaryLabel}</span>
            </div>

            <div className="reading-body">
              {card.summary.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>

            <div className="reading-advice">
              <h2>{card.adviceTitle}</h2>
              <p>{card.advice}</p>
            </div>

            <div className="reading-actions">
              <button type="button" className="gold-button-md" onClick={handleSave}>
                {saved ? "Saved" : "Save Reading"}
              </button>
              <button type="button" className="gold-button-md" onClick={() => setShareOpen(true)}>
                Share Reading
              </button>
            </div>
          </div>
        )}
      </section>

      {shareOpen && card && (
        <ShareReadingModal
          card={card}
          categoryLabel={card.diaryLabel}
          onClose={() => setShareOpen(false)}
        />
      )}
    </main>
  );
}

export default function ReadingPage() {
  return (
    <Suspense fallback={null}>
      <ReadingContent />
    </Suspense>
  );
}
