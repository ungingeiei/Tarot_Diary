"use client";
import { useRouter } from "next/navigation";
import { AppHeader } from "../../components/Header";
import { SparkleIcon } from "../../components/TarotVisual";

const READING_PERIODS = [
  { key: "daily", label: "DAILY" },
  { key: "weekly", label: "WEEKLY" },
  { key: "monthly", label: "MONTHLY" },
];

export default function ReadingPeriodPage() {
  const router = useRouter();

  return (
    <main className="app-page reading-period-page">
      <AppHeader />

      {/* Page Title */}
      <section className="reading-period-hero">
        <div className="reading-period-heading">
          <h1 className="reading-period-title">
            <div className="choose-line">
              <span className="title-choose">Choose</span>
              <img src="/time/line-timepage.svg" alt="line" />
            </div>
            <span className="title-period">
              A Time Period
              <small className="reading-period-subtitle">
                Focus your energy and trust the cards to reveal guidance
              </small>
            </span>
          </h1>
        </div>
      </section>

      {/* Reading Period Cards */}
      <section className="reading-period-grid">
        {READING_PERIODS.map((period) => (
          <div className="reading-period-item" key={period.key}>
            <div className="reading-period-card">
              <img
                src={`/time/${period.key}reading.svg`}
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