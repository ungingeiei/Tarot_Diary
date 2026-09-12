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

  const handleReveal = () => {
    setRevealing(true);
    window.setTimeout(() => {

      const params = new URLSearchParams();
      if (category) {
        params.set("category", category);
      }
      if (period) {
        params.set("period", period);
      }
      router.push(`/reading?${params.toString()}`);

    }, 900);
  };

  return (
    <main className="app-page draw-page">
      <AppHeader />

      <section className="draw-hero">
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
