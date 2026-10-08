"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "../../components/Header";
import { TarotCard, SparkleIcon } from "../../components/TarotVisual";
import { useUserOnly } from "../../lib/auth";

const CARD_COUNT = 5;

// The cards ride a shallow ellipse — a ring seen almost edge on. Each one
// keeps its own upright orientation and only its POSITION on the ring
// changes, so the spread revolves as a whole rather than each card
// turning on the spot.
const RADIUS_X = 450;
const RADIUS_Y = 72;

// Bottom centre of the ellipse: the card nearest the viewer, and the one
// that gets turned over at the end.
const FRONT_ANGLE = Math.PI / 2;
const STEP = (Math.PI * 2) / CARD_COUNT;

const TURN = Math.PI * 2;
// Just over half a turn a second: fast enough to read as a shuffle,
// slow enough that the eye can still follow one card round.
const RING_SPEED = TURN * 0.55; // radians per second while running free
const MIN_SPIN_MS = 1000; // the ring always revolves at least this long
const SLOWDOWN_MS = 1500; // easing from full speed to a dead stop
const SLOWDOWN_TURNS = 0.9; // how much further it travels while slowing

// The turn itself takes 1s (.card-flip in globals.css); the rest is time
// to actually look at the card before the reading page takes over.
const FLIP_MS = 1900;

/**
 * Where card `i` sits once the ring has revolved by `offset` radians.
 *
 * Depth is read straight off the ellipse — a card at the bottom is
 * nearest, one at the top is furthest — and size, fade and stacking all
 * follow from that one number, which is what makes five flat cards read
 * as a ring turning in space.
 */
function placeCard(i, offset) {
  const angle = FRONT_ANGLE + i * STEP + offset;
  const depth = (Math.sin(angle) + 1) / 2; // 0 at the back, 1 at the front

  return {
    x: Math.cos(angle) * RADIUS_X,
    y: Math.sin(angle) * RADIUS_Y,
    scale: 0.58 + depth * 0.42,
    opacity: 0.18 + depth * 0.82,
    z: Math.round(depth * 100),
  };
}

function DrawContent() {
  // An admin has no reading of their own to look at; the console is
  // where they belong. See useUserOnly in lib/auth.js.
  useUserOnly();

  const router = useRouter();
  const searchParams = useSearchParams();
  const category = searchParams.get("category") || "";
  const period = searchParams.get("period") || "";

  const [revealing, setRevealing] = useState(false);
  // "idle" -> "spinning" -> "flipping". Separate from `revealing` so a
  // failed draw can stop the ring while the button goes back to normal.
  const [phase, setPhase] = useState("idle");
  // The card the server dealt, shown face up once the ring stops.
  const [drawn, setDrawn] = useState(null);
  // The artwork's own width/height, read off the file once it loads. The
  // deck is about 0.58 wide to tall while a card frame is 2:3, so the
  // frame takes the picture's shape instead of the picture being letter
  // boxed inside it or cropped to fill it.
  const [faceRatio, setFaceRatio] = useState(null);
  const [error, setError] = useState("");

  const cardRefs = useRef([]);
  const frameRef = useRef(0);

  /** Writes one frame of the ring straight to the DOM. */
  const applyOffset = useCallback((offset) => {
    cardRefs.current.forEach((el, i) => {
      if (!el) return;
      const p = placeCard(i, offset);
      el.style.transform = `translate(-50%, -50%) translate(${p.x}px, ${p.y}px) scale(${p.scale})`;
      el.style.opacity = String(p.opacity);
      el.style.zIndex = String(p.z);
    });
  }, []);

  // Park the ring in its resting arrangement before anything moves.
  useEffect(() => {
    applyOffset(0);
  }, [applyOffset]);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  // Read the artwork's proportions as soon as the card is known. Done
  // with an Image() rather than an onLoad on the rendered <img>: a file
  // already in the browser cache can finish loading before React has
  // attached that handler, and it would then never fire.
  useEffect(() => {
    if (!drawn?.image) return;

    let cancelled = false;
    const probe = new window.Image();
    const read = () => {
      if (!cancelled && probe.naturalWidth && probe.naturalHeight) {
        setFaceRatio(probe.naturalWidth / probe.naturalHeight);
      }
    };
    probe.onload = read;
    probe.src = drawn.image;
    if (probe.complete) read();

    return () => {
      cancelled = true;
    };
  }, [drawn]);

  /**
   * Revolves the ring until `until` resolves and the minimum spin has
   * elapsed, then eases it to a stop after a whole number of turns.
   *
   * Driven frame by frame rather than with a CSS animation because the
   * stopping point is not known when the motion starts — it depends on
   * when the draw request comes back.
   */
  const runRing = useCallback(
    (until) =>
      new Promise((resolve) => {
        const startedAt = performance.now();
        let last = startedAt;
        let offset = 0;
        let stopping = null; // { from, to, startedAt } once slowing down
        let ready = false;

        until.then(() => {
          ready = true;
        });

        const easeOut = (t) => 1 - Math.pow(1 - t, 3);

        const step = (now) => {
          const dt = (now - last) / 1000;
          last = now;

          if (!stopping) {
            offset += RING_SPEED * dt;

            if (ready && now - startedAt >= MIN_SPIN_MS) {
              // Land on a whole number of turns, so every card — the one
              // about to be turned over in particular — comes to rest
              // exactly where it started.
              const target =
                Math.ceil((offset + SLOWDOWN_TURNS * TURN) / TURN) * TURN;
              stopping = { from: offset, to: target, startedAt: now };
            }
          } else {
            const t = Math.min(1, (now - stopping.startedAt) / SLOWDOWN_MS);
            offset = stopping.from + (stopping.to - stopping.from) * easeOut(t);

            if (t >= 1) {
              // Snap to 0 rather than the multiple: the same picture, but
              // it keeps the number small over repeated draws.
              applyOffset(0);
              resolve();
              return;
            }
          }

          applyOffset(offset % TURN);
          frameRef.current = requestAnimationFrame(step);
        };

        frameRef.current = requestAnimationFrame(step);
      }),
    [applyOffset]
  );

  // Revealing a card is a purchase: POST /api/draw gives the first
  // reading of each topic free and charges coins after that, recording
  // both in draw_history. Only once the server agrees does the reading
  // page open — the ring is decoration over a real request, not a
  // stand-in for one.
  const handleReveal = async () => {
    if (revealing) return;

    setRevealing(true);
    setError("");
    setDrawn(null);
    setFaceRatio(null);
    setPhase("spinning");

    let settled;
    const request = new Promise((resolve) => {
      settled = resolve;
    });

    // The ring starts immediately and the request runs underneath it, so
    // the wait is spent watching the cards rather than a frozen page.
    const ring = runRing(request);

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
        cancelAnimationFrame(frameRef.current);
        applyOffset(0);
        setPhase("idle");
        setRevealing(false);
        settled();
        return;
      }

      // Held back until the ring has stopped, so the face is already in
      // place behind the card when it starts to turn.
      setDrawn(data.card);
      settled();
      await ring;

      setPhase("flipping");
      await new Promise((resolve) => window.setTimeout(resolve, FLIP_MS));

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
      cancelAnimationFrame(frameRef.current);
      applyOffset(0);
      setPhase("idle");
      setRevealing(false);
      settled();
    }
  };

  return (
    <main className="app-page draw-page">
      <AppHeader />

      <section className="draw-hero">

        {error && <p className="login-error">{error}</p>}

        <div
          className={`card-ring is-${phase}`}
          role="img"
          aria-label={
            phase === "spinning"
              ? "Shuffling the cards"
              : drawn
                ? `You drew ${drawn.name}`
                : "Your cards are ready"
          }
        >
          {Array.from({ length: CARD_COUNT }, (_, i) => (
            <div
              key={i}
              className={`card-pick${i === 0 ? " is-selected" : ""}`}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
            >
              {i === 0 ? (
                <div
                  className={`card-flip${phase === "flipping" ? " is-flipped" : ""}`}
                  // Only once the card is already turning: the box is edge
                  // on at the halfway point, so reshaping it there is
                  // hidden rather than seen as the card back changing size.
                  style={
                    phase === "flipping" && faceRatio
                      ? { aspectRatio: String(faceRatio) }
                      : undefined
                  }
                >
                  <div className="card-flip-face card-flip-back">
                    <TarotCard style={{ width: "100%" }} />
                  </div>
                  <div className="card-flip-face card-flip-front">
                    {drawn && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={drawn.image} alt={drawn.imageAlt || drawn.name} />
                    )}
                  </div>
                </div>
              ) : (
                <TarotCard style={{ width: "100%" }} />
              )}
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
