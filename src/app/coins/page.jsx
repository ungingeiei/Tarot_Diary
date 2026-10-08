"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "../../components/Header";
import { SparkleIcon, HeartCoinIcon } from "../../components/TarotVisual";
import CheckInReward from "../../components/CheckInReward";
import { useUserOnly } from "../../lib/auth";

/**
 * Coins  (/coins)
 * ---------------
 * Where "Get Coins" goes when a reading costs more than the balance.
 *
 * The daily check-in used to be reachable only in the moment just after
 * signing in — the reward panel came up on top of /login and /register
 * and nowhere else — so a reader who dismissed it, or who ran out of
 * coins mid-session, had no way back to it and the button sent them to a
 * route that did not exist.
 *
 * Balance and streak come from GET /api/coins; collecting is the same
 * CheckInReward panel those two pages use, which posts /api/checkin and
 * knows how to say "already claimed today" on its own.
 */
export default function CoinsPage() {
  // An admin has no reading of their own to look at; the console is
  // where they belong. See useUserOnly in lib/auth.js.
  useUserOnly();

  const router = useRouter();

  const [coins, setCoins] = useState(null); // null until loaded
  const [streak, setStreak] = useState(0);
  const [error, setError] = useState("");
  const [rewardOpen, setRewardOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/coins", { cache: "no-store" });

      if (res.status === 401) {
        router.replace("/login");
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Could not load your coins");
      }

      setCoins(data.coins);
      setStreak(data.streak || 0);
    } catch (err) {
      setError(err.message || "Could not load your coins");
    }
  }, [router]);

  useEffect(() => {
    // Reports a synchronous setState, but there is none: load() only ever
    // sets state after awaiting the request, in a promise continuation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // The panel updates the balance itself as it collects; re-reading on
  // close is what keeps the number on this page and in the header honest.
  const handleCollected = () => {
    setRewardOpen(false);
    load();
  };

  return (
    <main className="app-page coins-page">
      <AppHeader />

      <section className="category-hero">
        <p className="category-title">
          <span className="line1">Your</span>
          <span className="line2">Coins</span>
        </p>
        <p className="category-subtitle">
          Every reading costs coins. Come back each day to collect more.
        </p>
        <div className="category-divider narrow" aria-hidden="true">
          <span />
          <SparkleIcon />
          <span />
        </div>
      </section>

      <section className="coins-panel">
        {error && <p className="login-error">{error}</p>}

        <div className="coins-balance">
          <span className="coin" aria-hidden="true">
            <HeartCoinIcon />
          </span>
          <span className="coins-balance-amount">
            {coins === null ? "—" : coins}
          </span>
        </div>

        <p className="coins-streak">
          {streak > 0
            ? `${streak} day${streak === 1 ? "" : "s"} in a row`
            : "Collect today to start a streak"}
        </p>

        <button
          type="button"
          className="gold-button-lg"
          onClick={() => setRewardOpen(true)}
          disabled={coins === null}
        >
          Collect Daily Reward
        </button>
      </section>

      {rewardOpen && <CheckInReward coins={coins ?? 0} onCollect={handleCollected} />}
    </main>
  );
}
