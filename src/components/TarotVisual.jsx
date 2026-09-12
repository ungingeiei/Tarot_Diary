export function BrandMark() {
  return (
    <div className="brand-mark" aria-label="Tarot Diary">
      <span className="brand-diamond"><span /></span>
      <span className="brand-name">Tarot Diary</span>
    </div>
  );
}

export function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function HeartCoinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M12 21s-7.6-4.6-10-9.4C0.3 7.8 2.6 4 6.4 4c2 0 3.7 1.1 4.6 2.8C11.9 5.1 13.6 4 15.6 4c3.8 0 6.1 3.8 4.4 7.6C19.6 16.4 12 21 12 21Z" />
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16" />
      <path d="M9 7V4.8A1.3 1.3 0 0 1 10.3 3.5h3.4A1.3 1.3 0 0 1 15 4.8V7" />
      <path d="M6.5 7l.9 12.2A1.8 1.8 0 0 0 9.2 21h5.6a1.8 1.8 0 0 0 1.8-1.8L17.5 7" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function CloseXIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M5 5l14 14M19 5 5 19" />
    </svg>
  );
}

export function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
      <path d="M12 2v6M12 16v6M2 12h6M16 12h6M5.5 5.5l4 4M14.5 14.5l4 4M18.5 5.5l-4 4M9.5 14.5l-4 4" opacity=".85" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

const iconProps = {
  viewBox: "0 0 24 24",
  "aria-hidden": true,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function LoveIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 20s-7-4.3-9.4-8.7C1.1 8.3 2.7 5 6 5c2 0 3.4 1.1 4 2.4C10.6 6.1 12 5 14 5c3.3 0 4.9 3.3 3.4 6.3C19 15.7 12 20 12 20Z" />
    </svg>
  );
}

export function FinanceIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M9.6 14.3c.3 1 1.2 1.6 2.4 1.6 1.5 0 2.5-.8 2.5-1.9 0-2.6-4.9-1.5-4.9-4.1 0-1.1 1-1.9 2.4-1.9 1.2 0 2.1.6 2.4 1.6M12 6.8v10.4" />
    </svg>
  );
}

export function CareerIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3.5" y="7.8" width="17" height="11.2" rx="1.6" />
      <path d="M8.5 7.8V6.3A1.5 1.5 0 0 1 10 4.8h4a1.5 1.5 0 0 1 1.5 1.5v1.5" />
      <path d="M3.5 12.8h17" />
    </svg>
  );
}

export function PetsIcon() {
  return (
    <svg {...iconProps}>
      <ellipse cx="12" cy="16.2" rx="4.2" ry="3.3" />
      <circle cx="6.6" cy="9.6" r="1.7" />
      <circle cx="10.6" cy="6.6" r="1.7" />
      <circle cx="14.9" cy="6.6" r="1.7" />
      <circle cx="17.9" cy="9.6" r="1.7" />
    </svg>
  );
}

export function HealthIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 12.5h3.6l1.8-4.8 3 9.6 2.2-6.6 1.6 3.8H21" />
    </svg>
  );
}

export function TarotCard({ title = "THE HIGH PRIESTESS", className = "", style }) {
  return (
    <div className={`tarot-card ${className}`.trim()} style={style}>
      <svg viewBox="0 0 320 480" fill="none" aria-hidden="true">
        <rect x="20" y="20" width="280" height="440" rx="2" stroke="currentColor" strokeWidth="0.5" opacity=".65" />
        <rect x="28" y="28" width="264" height="424" rx="1" stroke="currentColor" strokeWidth="0.3" opacity=".45" />
        {[[20,20],[300,20],[20,460],[300,460]].map(([x,y], i) => (
          <g key={`${x}-${y}`} transform={`translate(${x},${y}) rotate(${i * 90})`}>
            <line x1="0" y1="0" x2="16" y2="0" stroke="currentColor" strokeWidth="0.8" opacity=".8" />
            <line x1="0" y1="0" x2="0" y2="16" stroke="currentColor" strokeWidth="0.8" opacity=".8" />
            <circle cx="0" cy="0" r="1.5" fill="currentColor" opacity=".8" />
          </g>
        ))}
        <g transform="translate(160 200)">
          <circle r="88" stroke="currentColor" strokeWidth=".4" opacity=".3" />
          <circle r="65" stroke="currentColor" strokeWidth=".25" opacity=".2" />
          <polygon points="0,-64 55.4,32 -55.4,32" stroke="currentColor" strokeWidth=".7" opacity=".7" />
          <polygon points="0,64 55.4,-32 -55.4,-32" stroke="currentColor" strokeWidth=".7" opacity=".7" />
          <circle r="22" stroke="currentColor" strokeWidth=".5" opacity=".6" />
          <circle r="4" fill="currentColor" opacity=".5" />
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (Math.PI * 2 * i) / 8;
            return <circle key={i} cx={Math.cos(a) * 74} cy={Math.sin(a) * 74} r="2" fill="currentColor" opacity=".55" />;
          })}
        </g>
        <line x1="60" y1="64" x2="260" y2="64" stroke="currentColor" strokeWidth=".4" opacity=".45" />
        <circle cx="160" cy="52" r="3" stroke="currentColor" strokeWidth=".6" opacity=".7" />
        <line x1="60" y1="392" x2="260" y2="392" stroke="currentColor" strokeWidth=".4" opacity=".35" />
      </svg>
    </div>
  );
}

/**
 * ShareTarotCard
 * --------------
 * The branded, shareable version of the tarot card sigil used on the
 * "Share Reading" preview. Visually similar to <TarotCard /> but adds
 * a row of dots + a row of triangles bracketing the central sigil,
 * and prints the card's name at the bottom — matching the shareable
 * graphic a user downloads. Every stroke/fill uses currentColor, so
 * theming (light/dark) is done purely by setting `color` + background
 * on the wrapping element (see .share-tarot-frame in globals.css).
 */
export function ShareTarotCard({ name = "", className = "", style }) {
  const rowX = [76, 118, 160, 202, 244];
  return (
    <div className={`share-tarot-card ${className}`.trim()} style={style}>
      <svg viewBox="0 0 320 480" fill="none" aria-hidden="true">
        <rect x="20" y="20" width="280" height="440" rx="2" stroke="currentColor" strokeWidth="0.5" opacity=".65" />
        <rect x="28" y="28" width="264" height="424" rx="1" stroke="currentColor" strokeWidth="0.3" opacity=".45" />
        {[[20, 20], [300, 20], [20, 460], [300, 460]].map(([x, y], i) => (
          <g key={`${x}-${y}`} transform={`translate(${x},${y}) rotate(${i * 90})`}>
            <line x1="0" y1="0" x2="16" y2="0" stroke="currentColor" strokeWidth="0.8" opacity=".8" />
            <line x1="0" y1="0" x2="0" y2="16" stroke="currentColor" strokeWidth="0.8" opacity=".8" />
            <circle cx="0" cy="0" r="1.5" fill="currentColor" opacity=".8" />
          </g>
        ))}

        <line x1="60" y1="64" x2="260" y2="64" stroke="currentColor" strokeWidth=".4" opacity=".5" />
        <circle cx="160" cy="52" r="3" stroke="currentColor" strokeWidth=".6" opacity=".75" />

        {rowX.map((x) => (
          <circle key={`dot-${x}`} cx={x} cy="88" r="2.1" fill="currentColor" opacity=".6" />
        ))}

        <g transform="translate(160 190)">
          <circle r="88" stroke="currentColor" strokeWidth=".4" opacity=".3" />
          <circle r="65" stroke="currentColor" strokeWidth=".25" opacity=".2" />
          <polygon points="0,-64 55.4,32 -55.4,32" stroke="currentColor" strokeWidth=".7" opacity=".7" />
          <polygon points="0,64 55.4,-32 -55.4,-32" stroke="currentColor" strokeWidth=".7" opacity=".7" />
          <circle r="22" stroke="currentColor" strokeWidth=".5" opacity=".6" />
          <circle r="4" fill="currentColor" opacity=".5" />
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (Math.PI * 2 * i) / 8;
            return <circle key={i} cx={Math.cos(a) * 74} cy={Math.sin(a) * 74} r="2" fill="currentColor" opacity=".55" />;
          })}
        </g>

        <line x1="60" y1="358" x2="260" y2="358" stroke="currentColor" strokeWidth=".4" opacity=".45" />

        {rowX.map((x) => (
          <polygon
            key={`tri-${x}`}
            points={`${x},${376} ${x + 10},${394} ${x - 10},${394}`}
            stroke="currentColor"
            strokeWidth=".8"
            opacity=".65"
          />
        ))}

        <text
          x="160"
          y="432"
          textAnchor="middle"
          fill="currentColor"
          fontSize="12"
          fontFamily="'Fraunces', Georgia, serif"
          fontWeight="400"
          opacity=".9"
          style={{ letterSpacing: "3px" }}
        >
          {name.toUpperCase()}
        </text>
      </svg>
    </div>
  );
}
