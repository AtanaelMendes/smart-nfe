export default function LoginIllustration({ className = '' }) {
  return (
    <svg
      viewBox="0 0 520 360"
      role="img"
      aria-label="Ilustração de notas fiscais sendo importadas, conferidas e organizadas"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="10" stdDeviation="14" floodColor="#0b2a6b" floodOpacity="0.28" />
        </filter>
      </defs>

      {/* XML card */}
      <g transform="rotate(-9 110 190)" filter="url(#soft-shadow)">
        <rect x="30" y="120" width="150" height="130" rx="16" fill="#ffffff" fillOpacity="0.92" />
        <rect x="48" y="140" width="58" height="26" rx="6" fill="#1C64F2" />
        <text x="77" y="158" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="14" fontWeight="700" fill="#ffffff">XML</text>
        <text x="77" y="204" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="24" fontWeight="700" fill="#1C64F2">&lt;/&gt;</text>
        <rect x="48" y="222" width="88" height="8" rx="4" fill="#cbd5e1" />
      </g>

      {/* NF-e document */}
      <g filter="url(#soft-shadow)">
        <rect x="150" y="42" width="200" height="252" rx="18" fill="#ffffff" />
        <path d="M318 42h14a18 18 0 0 1 18 18v20l-32-38Z" fill="#dbe6ff" />
        <text x="178" y="98" fontFamily="Arial, Helvetica, sans-serif" fontSize="30" fontWeight="700" fill="#1C64F2">NF-e</text>
        <rect x="178" y="120" width="144" height="10" rx="5" fill="#cbd5e1" />
        <rect x="178" y="142" width="144" height="10" rx="5" fill="#cbd5e1" />
        <rect x="178" y="164" width="120" height="10" rx="5" fill="#cbd5e1" />
        <rect x="178" y="186" width="144" height="10" rx="5" fill="#cbd5e1" />
        <rect x="178" y="208" width="96" height="10" rx="5" fill="#cbd5e1" />
      </g>

      {/* Checklist card */}
      <g filter="url(#soft-shadow)">
        <rect x="352" y="112" width="146" height="158" rx="16" fill="#ffffff" />
        {[0, 1, 2].map((row) => (
          <g key={row} transform={`translate(370 ${134 + row * 42})`}>
            <rect width="22" height="22" rx="6" fill="#22C55E" />
            <path d="M5.5 11.2 9.4 15l7-8" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="32" y="3" width="82" height="8" rx="4" fill="#cbd5e1" />
            <rect x="32" y="16" width="58" height="6" rx="3" fill="#e2e8f0" />
          </g>
        ))}
      </g>

      {/* Orange flow arrows */}
      <path d="M300 52c40 6 58 30 56 62" fill="none" stroke="#FF9600" strokeWidth="9" strokeLinecap="round" />
      <path d="m348 108 8 16 16-10" fill="none" stroke="#FF9600" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M120 250c34 30 82 34 118 20" fill="none" stroke="#FF9600" strokeWidth="9" strokeLinecap="round" />
      <path d="m124 244-16 8 12 14" fill="none" stroke="#FF9600" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />

      {/* Success badge */}
      <g filter="url(#soft-shadow)">
        <circle cx="250" cy="286" r="32" fill="#22C55E" />
        <path d="m236 287 9 10 20-23" fill="none" stroke="#ffffff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
