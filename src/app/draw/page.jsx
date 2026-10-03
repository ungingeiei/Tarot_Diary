"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "../../components/Header";
import { TarotCard, SparkleIcon } from "../../components/TarotVisual";

const CARD_WIDTHS = ["145px", "175px", "215px", "175px", "145px"];
const DRAWN_INDEX = 2; // the center card is the one already drawn for the user

function DrawContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = searchParams.get("category") || "";
  const period = searchParams.get("period") || "";

  const [revealing, setRevealing] = useState(false);
  const [error, setError] = useState("");

  // Revealing a card is a purchase now, not a 900ms animation: POST
  // /api/draw gives the first reading of each period free and charges
  // coins after that, recording both in draw_history. Only once the
  // server agrees does the reading page open.
  const handleReveal = async () => {
    setRevealing(true);
    setError("");
    try {
      const res = await fetch("/api/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Exactly one of the two. Sending both made a Daily time
        // reading and a Love category reading the same row, so taking
        // one consumed the other's free draw.
        body: JSON.stringify(period ? { period } : { category }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setError(
          data.reason === "NOT_ENOUGH_COINS"
            ? "You don't have enough coins for another reading."
            : res.status === 401
              ? "Please sign in to draw a card."
              : data.message || "Could not draw a card. Please try again."
        );
        setRevealing(false);
        return;
      }

      const params = new URLSearchParams();
      if (category) {
        params.set("category", category);
      }
      if (period) {
        params.set("period", period);
      }
      router.push(`/reading?${params.toString()}`);
    } catch {
      setError("Could not draw a card. Please try again.");
      setRevealing(false);
    }
  };

  return (
    <main className="app-page draw-page">
      <AppHeader />

      <section className="draw-hero">

        {error && <p className="login-error">{error}</p>}
        <div className="card-row" role="img" aria-label="Your card has been drawn">
          {CARD_WIDTHS.map((width, i) => (
            <div key={i} className={`card-pick${i === DRAWN_INDEX ? " is-selected" : ""}`}>
              <TarotCard style={{ width }} />
            </div>
          ))}
        </div>

        <div className="category-divider narrow" aria-hidden="true">
          <span />
          <SparkleIcon />
          <span />
        </div>
        <p className="draw-subtitle">Focus your thoughts, trust your intuition, and let the cards reveal new possibilities</p>

        <button type="button" className="gold-button-lg" onClick={handleReveal} disabled={revealing}>
          {revealing ? "Revealing…" : "Reveal Your Cards"}
        </button>
      </section>
    </main>
  );
}

export default function DrawPage() {
  return (
    <Suspense fallback={null}>
      <DrawContent />
    </Suspense>
  );
}