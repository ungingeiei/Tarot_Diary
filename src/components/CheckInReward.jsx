"use client";

import { useEffect, useState } from "react";
import { HeartCoinIcon } from "./TarotVisual";

const rewards = [
    { day: 1, amount: 10 },
    { day: 2, amount: 10 },
    { day: 3, amount: 15 },
    { day: 4, amount: 15 },
    { day: 5, amount: 20 },
    { day: 6, amount: 20 },
    { day: 7, amount: 30 },
    { day: 8, amount: 50 },
];

export default function CheckInReward({ coins = 0, onCollect }) {
    const [currentCoins, setCurrentCoins] = useState(coins);
    // The card to highlight: the day today's COLLECT will award, or the
    // one just awarded. Not the same as the streak count — see the note
    // on `checkinDay` in /api/auth/me.
    const [currentDay, setCurrentDay] = useState(1);
    const [streak, setStreak] = useState(0);
    const [claimed, setClaimed] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function loadData() {
            try {
                const response = await fetch("/api/auth/me");
                const data = await response.json();

                if (data.success) {
                    setCurrentCoins(data.user.coins);
                    setCurrentDay(data.user.checkinDay);
                    setStreak(data.user.streak);
                    setClaimed(data.user.claimedToday);
                }
            } catch (error) {
                console.error("Failed to load coins:", error);
            }
        }

        loadData();
    }, []);

    const handleCollect = async () => {
        if (loading || claimed) {
            return;
        }

        setLoading(true);

        try {
            const response = await fetch("/api/checkin", {
                method: "POST",
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.reason === "already_claimed") {
                    setCurrentCoins(data.coin);
                    setCurrentDay(data.streak);
                    setStreak(data.streak);
                    setClaimed(true);
                }

                return;
            }

            setCurrentCoins(data.coin);
            setCurrentDay(data.streak);
            setStreak(data.streak);
            setClaimed(true);

            // The header reads the balance from the shared session store,
            // which listens for this. Without it the coin pill kept the
            // number it had when the page loaded.
            window.dispatchEvent(
                new CustomEvent("tarotdiary-coins-change", {
                    detail: { coin: data.coin },
                })
            );
        } catch (error) {
            console.error("Failed to collect daily reward:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="checkin-overlay">
            <div className="checkin-modal">

                <div className="checkin-coin-balance">
                    <div className="checkin-coin">
                        <HeartCoinIcon />
                    </div>

                    <span>{currentCoins}</span>
                </div>

                <div className="checkin-content">
                    <h1>Check-in Reward</h1>

                    <div className="checkin-rewards">
                        {rewards.map((reward) => (
                            <div
                                key={reward.day}
                                className={`checkin-day ${reward.day === currentDay
                                    ? "active"
                                    : ""
                                    }`}
                            >
                                <div className="checkin-day-coin">
                                    <HeartCoinIcon />
                                </div>

                                <span className="checkin-day-label">
                                    DAY {reward.day}
                                </span>

                                <span className="checkin-day-amount">
                                    +{reward.amount}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Nothing banked yet means there is no streak to report:
                        a brand-new account was reading "DAY 0 STREAK". The
                        badge is hidden rather than removed, so collecting the
                        first day does not shove the button 70px down the page
                        just as it is being clicked. */}
                    <div
                        className={`checkin-streak${streak > 0 ? "" : " is-empty"}`}
                        aria-hidden={streak > 0 ? undefined : "true"}
                    >
                        <span className="streak-lightning">ϟ</span>
                        <span>DAY {streak} STREAK</span>
                    </div>

                    <button
                        type="button"
                        className="checkin-collect-btn"
                        onClick={claimed ? onCollect : handleCollect}
                        disabled={loading}
                    >
                        {loading
                            ? "COLLECTING..."
                            : claimed
                                ? "CONTINUE"
                                : "COLLECT"}
                    </button>
                </div>

            </div>
        </div>
    );
}