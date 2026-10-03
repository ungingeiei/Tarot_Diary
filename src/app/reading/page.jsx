"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "../../components/Header";
import { TarotCard } from "../../components/TarotVisual";
import { ShareReadingModal } from "../../components/ShareReadingModal";

import { fetchDailyCard, fetchTimeCard } from "../../data/cardsClient";

import { isSignedIn } from "../../lib/auth";
import { saveDiaryEntry } from "../../lib/diary";

function ReadingContent() {
  const router = useRouter();
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

    const fetchCard = period
      ? fetchTimeCard(period)
      : fetchDailyCard(category);

    fetchCard
      .then((result) => {
        if (!cancelled) setCard(result);
      })
      .catch((err) => {
        if (cancelled) return;
        // Landing here without having drawn — a bookmarked /reading URL,
        // or a window that has since rolled over. The card now belongs to
        // a paid draw, so send them to the screen that makes one instead
        // of quietly handing out a free reading.
        if (err?.reason === "NO_DRAW") {
          const params = new URLSearchParams();
          if (category) params.set("category", category);
          if (period) params.set("period", period);
          router.replace(`/draw?${params.toString()}`);
          return;
        }
        setToast({
          type: "error",
          message: err?.message || "Could not load your reading. Please try again.",
        });
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

    // Only the card and which reading it was: the server joins the text
    // back from card_meanings, so nothing is duplicated into the save.
    saveDiaryEntry({
      cardId: card.id,
      scope: card.scope,
      topic: card.topic,
    }).then((ok) => {
      if (ok) {
        setSaved(true);
        setToast({ type: "success", message: "Reading saved successfully" });
      } else {
        setToast({ type: "error", message: "Could not save this reading. Please try again." });
      }
    });
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
