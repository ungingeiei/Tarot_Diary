"use client";

import { useState } from "react";
import { HeartCoinIcon } from "./TarotVisual";

const rewards = [
    { day: 1, amount: 10, claimed: true },
    { day: 2, amount: 10, claimed: false },
    { day: 3, amount: 15, claimed: false },
    { day: 4, amount: 15, claimed: false },
    { day: 5, amount: 20, claimed: false },
    { day: 6, amount: 20, claimed: false },
    { day: 7, amount: 30, claimed: false },
    { day: 8, amount: 50, claimed: false },
];

export default function CheckInReward({ coins = 50, onCollect }) {
    const [currentCoins, setCurrentCoins] = useState(coins);

    const handleCollect = () => {
        setCurrentCoins((prev) => prev + 10);

        if (onCollect) {
            onCollect(10);
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
                                className={`checkin-day ${
                                    reward.claimed ? "active" : ""
                                }`}
                            >
                                <div className="checkin-day-coin">
                                    <HeartCoinIcon />
                                </div>

                                <span className="checkin-day-label">
                                    DAY {reward.day}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="checkin-streak">
                        <span className="streak-lightning">ϟ</span>
                        <span>DAY 1 STREAK</span>
                    </div>

                    <button
                        type="button"
                        className="checkin-collect-btn"
                        onClick={handleCollect}
                    >
                        COLLECT
                    </button>
                </div>

            </div>
        </div>
    );
}