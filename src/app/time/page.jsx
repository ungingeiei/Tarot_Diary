"use client";
import { useRouter } from "next/navigation";
import { AppHeader } from "../../components/Header";
import { SparkleIcon } from "../../components/TarotVisual";
import { asset } from "@/lib/assets";
import { useUserOnly } from "../../lib/auth";

const READING_PERIODS = [
  { key: "daily", label: "DAILY" },
  { key: "weekly", label: "WEEKLY" },
  { key: "monthly", label: "MONTHLY" },
];

export default function ReadingPeriodPage() {
  // An admin has no reading of their own to look at; the console is
  // where they belong. See useUserOnly in lib/auth.js.
  useUserOnly();

  const router = useRouter();

  return (
    <main className="app-page reading-period-page">
      <AppHeader />

      {/* Page Title — the same hero the category page uses, down to the
          class names: two pages that ask the same question in the same
          place should not each have their own version of it. */}
      <section className="category-hero">
        <p className="category-title">
          <span className="line1">Choose</span>
          <span className="line2">A Time Period</span>
        </p>
        <p className="category-subtitle">
          Focus your energy and trust the cards to reveal guidance
        </p>
        <div className="category-divider" aria-hidden="true">
          <span />
          <SparkleIcon />
          <span />
        </div>
      </section>

      {/* Reading Period Cards */}
      <section className="reading-period-grid">
        {READING_PERIODS.map((period) => (
          <div className="reading-period-item" key={period.key}>
            <div className="reading-period-card">
              <img
                src={asset(`time/${period.key}reading.svg`)}
                alt={`${period.label} illustration`}
                className="reading-period-image" />

            </div>

            <button
              type="button"
              className="reading-period-btn"
              onClick={() => router.push(`/draw?period=${period.key}`)}
            >
              Start reading
            </button>

          </div>
        ))}
      </section>
    </main>
  );
}