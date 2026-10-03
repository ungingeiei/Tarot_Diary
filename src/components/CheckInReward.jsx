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
    const [currentDay, setCurrentDay] = useState(1);
    const [claimed, setClaimed] = useState(false);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        async function loadCoins() {
            try {
                const response = await fetch("/api/auth/me");
                const data = await response.json();

                if (data.success) {
                    const coin = data.user.coins;
                    setCurrentCoins(coin);
                }
            } catch (error) {
                console.error("Failed to load coins:", error);
            }
        }

        loadCoins();
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
                    setClaimed(true);
                }

                return;
            }

            setCurrentCoins(data.coin);
            setCurrentDay(data.streak);
            setClaimed(true);

            if (onCollect) {
                onCollect(data.reward);
            }
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

                    <div className="checkin-streak">
                        <span className="streak-lightning">ϟ</span>
                        <span>DAY {currentDay} STREAK</span>
                    </div>

                    <button
                        type="button"
                        className="checkin-collect-btn"
                        onClick={handleCollect}
                        disabled={loading || claimed}
                    >
                        {loading
                            ? "COLLECTING..."
                            : claimed
                                ? "COLLECTED"
                                : "COLLECT"}
                    </button>
                </div>

            </div>
        </div>
    );
}