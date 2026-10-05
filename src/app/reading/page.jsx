"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppHeader } from "../../components/Header";
import { TarotCard } from "../../components/TarotVisual";
import { ShareReadingModal } from "../../components/ShareReadingModal";
import NotEnoughCoins from "../../components/NotEnoughCoins";

let lastDraw = null;

function drawCard(url) {
  const now = Date.now();

  if (lastDraw && lastDraw.url === url && now - lastDraw.at < 2000) {
    return lastDraw.promise;
  }

  const promise = (async () => {
    const res = await fetch(url, {
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
      throw new Error(
        data.message || "Could not draw your card. Please try again."
      );
    }

    return data;
  })();

  lastDraw = {
    url,
    at: now,
    promise,
  };

  return promise;
}

function ReadingContent() {
  const searchParams = useSearchParams();

  const category = searchParams.get("category") || "";
  const period = searchParams.get("period") || "";

  const [card, setCard] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const [signedIn, setSignedIn] = useState(false);
  const [coin, setCoin] = useState(0);
  const [drawCost, setDrawCost] = useState(10);

  const [redrawing, setRedrawing] = useState(false);
  const [showNotEnoughCoins, setShowNotEnoughCoins] = useState(false);

  const [toast, setToast] = useState(null);
  const [headerKey, setHeaderKey] = useState(0);

  const drawUrl = period
    ? `/api/cards/time?period=${encodeURIComponent(period)}`
    : `/api/cards/daily${
        category ? `?category=${encodeURIComponent(category)}` : ""
      }`;

  const announceCoins = (newCoin) => {
    if (typeof newCoin !== "number") {
      return;
    }

    setCoin(newCoin);

    window.dispatchEvent(
      new CustomEvent("tarotdiary-coins-change", {
        detail: {
          coin: newCoin,
        },
      })
    );

    setHeaderKey((key) => key + 1);
  };

  const refreshCoins = async () => {
    try {
      const response = await fetch("/api/auth/me", {
        cache: "no-store",
      });

      const data = await response.json().catch(() => ({}));

      if (data.success && typeof data.user?.coins === "number") {
        setSignedIn(true);
        announceCoins(data.user.coins);
        return data.user.coins;
      }
    } catch (error) {
      console.error("Failed to refresh coins:", error);
    }

    return null;
  };

  useEffect(() => {
    let cancelled = false;

    setCard(null);
    setSaved(false);
    setLoadError("");

    drawCard(drawUrl)
      .then((data) => {
        if (cancelled) {
          return;
        }

        setCard(data.card);

        setSignedIn(typeof data.coin === "number");

        if (typeof data.drawCost === "number") {
          setDrawCost(data.drawCost);
        }

        if (typeof data.coin === "number") {
          announceCoins(data.coin);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(
            err.message || "Could not draw your card. Please try again."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [category, period]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => {
      setToast(null);
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleRedraw = async () => {
    if (!card || redrawing) {
      return;
    }

    if (typeof coin === "number" && coin < drawCost) {
      setShowNotEnoughCoins(true);
      return;
    }

    setRedrawing(true);

    try {
      const res = await fetch(drawUrl, {
        method: "POST",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        if (
          data.reason === "NOT_ENOUGH_COINS" ||
          res.status === 402 ||
          res.status === 400
        ) {
          await refreshCoins();
          setShowNotEnoughCoins(true);
          return;
        }

        throw new Error(
          data.message || "Could not draw a new card"
        );
      }

      setCard(data.card);
      setSaved(false);

      await refreshCoins();
    } catch (err) {
      setToast({
        type: "error",
        message:
          err.message || "Could not draw a new card",
      });
    } finally {
      setRedrawing(false);
    }
  };

  const handleSave = async () => {
    if (!card || saving || saved) {
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/diary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cardId: card.id,
          scope: card.scope,
          topic: card.topic,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        setToast({
          type: "error",
          message:
            "Please sign in to save this reading to your Tarot Diary",
        });
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(
          data.message || "Could not save your reading"
        );
      }

      setSaved(true);

      setToast({
        type: "success",
        message: data.duplicate
          ? "This reading is already in your diary"
          : "Reading saved successfully",
      });
    } catch (err) {
      setToast({
        type: "error",
        message:
          err.message || "Could not save your reading",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="app-page reading-page">
      <AppHeader key={headerKey} />

      {toast && (
        <div
          className={`save-toast save-toast-${toast.type}`}
          role="status"
        >
          {toast.message}
        </div>
      )}

      <section
        className={`reading-panel${!card ? " is-loading" : ""}`}
      >
        <div className="reading-card-col">
          {card ? (
            <div className="reading-card-frame">
              <img
                src={card.image}
                alt={card.imageAlt}
                className="reading-card-img"
              />
            </div>
          ) : (
            <>
              <TarotCard className="reading-card" />
              <p className="reading-loading">
                {loadError || "Drawing your card…"}
              </p>
            </>
          )}
        </div>

        {card && (
          <div className="reading-content">
            <div className="reading-title-row">
              <h1>{card.name}</h1>
              <span className="diary-pill">
                {card.diaryLabel}
              </span>
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
              <button
                type="button"
                className="gold-button-md"
                onClick={handleSave}
                disabled={saving}
              >
                {saved
                  ? "Saved"
                  : saving
                  ? "Saving…"
                  : "Save Reading"}
              </button>

              <button
                type="button"
                className="gold-button-md"
                onClick={() => setShareOpen(true)}
              >
                Share Reading
              </button>

              {signedIn && (
                <button
                  type="button"
                  className="gold-button-md"
                  onClick={handleRedraw}
                  disabled={redrawing}
                >
                  {redrawing
                    ? "Drawing…"
                    : `Draw Again · ${drawCost} coins`}
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {showNotEnoughCoins && (
        <NotEnoughCoins
          onCancel={() => setShowNotEnoughCoins(false)}
          onGetCoins={() => {
            setShowNotEnoughCoins(false);
            window.location.href = "/coins";
          }}
        />
      )}

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