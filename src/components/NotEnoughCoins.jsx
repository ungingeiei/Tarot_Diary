"use client";

export default function NotEnoughCoins({ onCancel, onGetCoins }) {
  return (
    <div className="not-enough-overlay">
      <div className="not-enough-modal">
        <h2>Not Enough Coins</h2>

        <div className="not-enough-divider" />

        <div className="not-enough-message">
          <p>You&apos;ve already claimed your free reading for today.</p>
          <p className="not-enough-highlight">
            To unlock another reading, you&apos;ll need coins.
          </p>
        </div>

        <div className="not-enough-actions">
          <button
            type="button"
            className="not-enough-cancel"
            onClick={onCancel}
          >
            Cancel
          </button>

          <button
            type="button"
            className="not-enough-get-coins"
            onClick={onGetCoins}
          >
            Get More Coins
          </button>
        </div>
      </div>
    </div>
  );
}