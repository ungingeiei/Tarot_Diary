export function BrandMark() {
  return (
    <div className="brand-mark" aria-label="Tarot Diary">
      <span className="brand-diamond"><span /></span>
      <span className="brand-name">Tarot Diary</span>
    </div>
  );
}

export function TarotCard() {
  return (
    <div className="tarot-card">
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
      <div className="card-title">
        <span />
        <strong>THE HIGH PRIESTESS</strong>
      </div>
    </div>
  );
}
