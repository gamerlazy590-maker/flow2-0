// Flow 2.0 logo — an ORIGINAL mark created for this app.
// Design: three flowing ribbon strokes that sweep upward like a current and
// resolve into a play-triangle negative space, in a violet → blue → cyan
// gradient on a dark rounded tile. It is a fresh, hand-drawn SVG design
// (no trademarked or licensed assets) used for the header, login, studio
// sidebar, admin panel, and favicon.

export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="Flow 2.0 logo"
      style={{ flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="flow2-ribbon" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="52%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>
        <linearGradient id="flow2-tile" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#17172A" />
          <stop offset="100%" stopColor="#0A0A0F" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="45" height="45" rx="12" fill="url(#flow2-tile)" stroke="#2E2E4A" strokeWidth="1.5" />
      {/* flowing ribbons */}
      <path
        d="M9 31c6.5 0 8.8-2.2 11-6.4C22.4 20 25.6 17 33 17"
        fill="none"
        stroke="url(#flow2-ribbon)"
        strokeWidth="4.6"
        strokeLinecap="round"
      />
      <path
        d="M9 38c5.2 0 7.4-1.4 9.4-4.4"
        fill="none"
        stroke="url(#flow2-ribbon)"
        strokeWidth="4.2"
        strokeLinecap="round"
        opacity="0.55"
      />
      {/* play-flow arrowhead */}
      <path d="M31.5 11.8 40 16.9l-8.5 5.1c-.9.55-2-.1-2-1.14V13c0-1.03 1.1-1.68 2-1.14Z" fill="url(#flow2-ribbon)" />
    </svg>
  );
}

export function Logo({ size = 36, wordmarkClass = "" }: { size?: number; wordmarkClass?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <LogoMark size={size} />
      <span
        className={wordmarkClass}
        style={{
          fontFamily: "'Sora', system-ui, sans-serif",
          fontWeight: 700,
          fontSize: size * 0.52,
          letterSpacing: "-0.02em",
          color: "var(--text)",
          lineHeight: 1,
        }}
      >
        Flow&nbsp;
        <span
          style={{
            background: "linear-gradient(92deg,#8B5CF6,#3B82F6 55%,#22D3EE)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          2.0
        </span>
      </span>
    </span>
  );
}
