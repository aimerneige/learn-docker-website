export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="logo">
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#logo-g)" />
      <g fill="#fff">
        <rect className="logo-box b1" x="13" y="25" width="9" height="8" rx="1.6" />
        <rect className="logo-box b2" x="24" y="25" width="9" height="8" rx="1.6" />
        <rect className="logo-box b3" x="35" y="25" width="9" height="8" rx="1.6" />
        <rect className="logo-box b4" x="24" y="15" width="9" height="8" rx="1.6" />
        <path d="M8 36h47c1.5-2.2 3.6-3.2 5-3-1 6-6 9-8.5 9.5C48 48.5 41 53 30 53 17 53 10 46 8 36Z" />
      </g>
    </svg>
  );
}
