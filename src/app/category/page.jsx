"use client";
import { useRouter } from "next/navigation";
import { AppHeader } from "../../components/Header";
import { SparkleIcon } from "../../components/TarotVisual";

const CATEGORIES = [
  { key: "love", label: "Love", area: "love" },
  { key: "finance", label: "Finance", area: "finance" },
  { key: "career", label: "Career", area: "career" },
  { key: "pets", label: "Pets", area: "pets" },
  { key: "health", label: "Health", area: "health" },
];

// CHANGED: category is now chosen FIRST. This page no longer reads an
// incoming `period` param — instead it forwards the chosen category
// to /time, which is the one that finally sends both category+period
// to /draw.
export default function CategoryPage() {
  const router = useRouter();

  const handleCategoryClick = (category) => {
    const params = new URLSearchParams();
    params.set("category", category);
    router.push(`/time?${params.toString()}`);
  };

  return (
    <main className="app-page category-page">
      <div className="category-glow" aria-hidden="true" />
      <AppHeader />

      <section className="category-hero">
        <p className="category-title">
          <span className="line1">Choose</span>
          <span className="line2">a Category</span>
        </p>
        <p className="category-subtitle">Open your heart and discover the guidance meant for you</p>
        <div className="category-divider" aria-hidden="true">
          <span />
          <SparkleIcon />
          <span />
        </div>
      </section>

      <section className="category-grid">
        {CATEGORIES.map((category) => (
          <button
            key={category.key}
            type="button"
            className={`category-btn area-${category.area}`}
            onClick={() => handleCategoryClick(category.key)}
          >
            {category.label}
          </button>
        ))}
      </section>
    </main>
  );
}