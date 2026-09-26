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

  const handleReveal = async () => {
    if (!period || !category) {
      alert("Please select a period and category.");
      return;
    }

    setRevealing(true);

    try {
      const response = await fetch("/api/draw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        //using accountId: 1 as a test
        body: JSON.stringify({
          accountId: 1,
          period,
          category,
        }),
      });

      const data = await response.json();

      console.log("Draw API response:", data);

      if (!response.ok) {
        if (data.reason === "NOT_ENOUGH_COINS") {
          setRevealing(false);

          alert("Not enough coins.");
          return;
        }

        throw new Error(data.message || "Draw failed");
      }

      const params = new URLSearchParams();
      params.set("period", period);
      params.set("category", category);

      window.setTimeout(() => {
        router.push(`/reading?${params.toString()}`);
      }, 900);

    } catch (error) {
      console.error("Draw error:", error);
      setRevealing(false);

      alert(error.message);
    }
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
