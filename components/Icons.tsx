// Custom SVG icons - bold, simple, iconic
const COLOR = "#d4a574";
const STROKE = 2.5;

interface IconProps {
  className?: string;
  size?: number;
}

// Commons - three pillars
export function IconCommons({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="5" width="3.5" height="16" rx="1" fill={COLOR}/>
      <rect x="10.25" y="5" width="3.5" height="16" rx="1" fill={COLOR}/>
      <rect x="17.5" y="5" width="3.5" height="16" rx="1" fill={COLOR}/>
    </svg>
  );
}

// Welcome - arrow pointing right
export function IconWelcome({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <line x1="4" y1="12" x2="18" y2="12" stroke={COLOR} strokeWidth={STROKE} strokeLinecap="round"/>
      <path d="M14 8l6 4-6 4" stroke={COLOR} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Intimacy - two linked circles
export function IconIntimacy({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="8" cy="12" r="6" stroke={COLOR} strokeWidth={STROKE} fill="none"/>
      <circle cx="16" cy="12" r="6" stroke={COLOR} strokeWidth={STROKE} fill="none"/>
    </svg>
  );
}

// Touch - two hands meeting
export function IconTouch({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M6 8v10h3v-3M18 8v10h-3v-3M12 8v14" stroke={COLOR} strokeWidth={STROKE} strokeLinecap="round"/>
      <circle cx="6" cy="6" r="2" fill={COLOR}/>
      <circle cx="18" cy="6" r="2" fill={COLOR}/>
    </svg>
  );
}

// Spiritual - upward spiral/energy
export function IconSpiritual({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 2L14 8M12 8L10 14M12 14L14 20" stroke={COLOR} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="11" r="3" stroke={COLOR} strokeWidth={STROKE} fill="none"/>
    </svg>
  );
}

// Dating - star/spark
export function IconDating({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 2L15 10L23 12L16 18L18 26L12 22L6 26L8 18L1 12L9 10L12 2Z" fill={COLOR}/>
    </svg>
  );
}

// Couples - two interlocking hearts
export function IconCouples({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M6 9C6 7 7 6 8 6C9 6 10 7 10 9C10 11 6 14 6 14C6 14 2 11 2 9C2 7 3 6 4 6C5 6 6 7 6 9Z" fill={COLOR}/>
      <path d="M18 9C18 7 19 6 20 6C21 6 22 7 22 9C22 11 18 14 18 14C18 14 14 11 14 9C14 7 15 6 16 6C17 6 18 7 18 9Z" fill={COLOR}/>
    </svg>
  );
}

// Embodiment - simple centered body
export function IconEmbodiment({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="4" r="2.5" fill={COLOR}/>
      <line x1="12" y1="7" x2="12" y2="14" stroke={COLOR} strokeWidth={STROKE} strokeLinecap="round"/>
      <line x1="7" y1="10" x2="17" y2="10" stroke={COLOR} strokeWidth={STROKE} strokeLinecap="round"/>
      <line x1="9" y1="14" x2="12" y2="20" stroke={COLOR} strokeWidth={STROKE} strokeLinecap="round"/>
      <line x1="15" y1="14" x2="12" y2="20" stroke={COLOR} strokeWidth={STROKE} strokeLinecap="round"/>
    </svg>
  );
}

// Workshops - stacked layers
export function IconWorkshops({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M3 6L12 3L21 6" stroke={COLOR} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path d="M3 12L12 9L21 12" stroke={COLOR} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path d="M3 18L12 15L21 18" stroke={COLOR} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

// Badge - shield with checkmark
export function IconBadge({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 2L4 5v7c0 5.55 3.84 10.74 9 11 5.16-1.26 9-6.45 9-11V5l-10-3z" stroke={COLOR} strokeWidth="1.5" fill="none"/>
      <path d="M10 14l1.5 1.5 3-3" stroke={COLOR} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Event - calendar marker
export function IconEvent({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="14" r="5" stroke={COLOR} strokeWidth="1.5" fill="none"/>
      <path d="M7 4v2M17 4v2M4 8h16v10c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V8z" stroke={COLOR} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

// Profile - person silhouette
export function IconProfile({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="8" r="3.5" stroke={COLOR} strokeWidth="1.5" fill="none"/>
      <path d="M4 20c0-4 3.58-7 8-7s8 3 8 7" stroke={COLOR} strokeWidth="1.5" fill="none"/>
    </svg>
  );
}

// Heart
export function IconHeart({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke={COLOR} strokeWidth="1.5" fill="none"/>
    </svg>
  );
}

// Connection - two connected points
export function IconConnectionPoints({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="6" cy="9" r="2.5" fill={COLOR}/>
      <circle cx="18" cy="9" r="2.5" fill={COLOR}/>
      <path d="M8.5 10c2 1 5 1 7 0" stroke={COLOR} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="6" y1="12" x2="6" y2="18" stroke={COLOR} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="18" y1="12" x2="18" y2="18" stroke={COLOR} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

// Chat - speech bubble
export function IconChat({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke={COLOR} strokeWidth="1.5" fill="none"/>
      <circle cx="9" cy="11" r="1" fill={COLOR}/>
      <circle cx="12" cy="11" r="1" fill={COLOR}/>
      <circle cx="15" cy="11" r="1" fill={COLOR}/>
    </svg>
  );
}

// Arrow - simple direction
export function IconArrow({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M5 12h14M12 5l7 7-7 7" stroke={COLOR} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Check - checkmark
export function IconCheck({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M20 6L9 17l-5-5" stroke={COLOR} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Plus - add
export function IconPlus({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 5v14M5 12h14" stroke={COLOR} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

// Menu - hamburger
export function IconMenu({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M3 6h18M3 12h18M3 18h18" stroke={COLOR} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

// Home - house
export function IconHome({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ color: "currentColor" }}>
      <path d="M3 12L12 3L21 12V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path d="M9 21V12H15V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Journey - path/book
export function IconJourney({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ color: "currentColor" }}>
      <path d="M4 3H14C15.1046 3 16 3.89543 16 5V21C16 20.4477 15.5523 20 15 20H5C4.44772 20 4 20.4477 4 21V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path d="M8 7H12M8 11H12M8 15H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Connections - two connected circles
export function IconConnectionsNav({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ color: "currentColor" }}>
      <circle cx="8" cy="10" r="4" stroke="currentColor" strokeWidth="2" fill="none"/>
      <circle cx="16" cy="10" r="4" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M12 14C14 16 16 17 18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M12 14C10 16 8 17 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

// Profile - person
export function IconProfileNav({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ color: "currentColor" }}>
      <circle cx="12" cy="7" r="3.5" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M5 21C5 17.134 8.13401 14 12 14C15.866 14 19 17.134 19 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

// Reflection/Prompt - speech bubble
export function IconReflection({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ color: "currentColor" }}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

// Progress - chart bars
export function IconProgress({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ color: "currentColor" }}>
      <rect x="3" y="12" width="3" height="9" stroke="currentColor" strokeWidth="2" fill="none"/>
      <rect x="10" y="5" width="3" height="16" stroke="currentColor" strokeWidth="2" fill="none"/>
      <rect x="17" y="2" width="3" height="19" stroke="currentColor" strokeWidth="2" fill="none"/>
    </svg>
  );
}

// Upcoming - calendar
export function IconUpcoming({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ color: "currentColor" }}>
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M3 9h18" stroke="currentColor" strokeWidth="2"/>
      <path d="M7 2v5M17 2v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

// Badges - trophy
export function IconBadges({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ color: "currentColor" }}>
      <path d="M6 9C6 5.13401 8.68629 2 12 2C15.3137 2 18 5.13401 18 9V13C18 14.1046 17.1046 15 16 15H8C6.89543 15 6 14.1046 6 13V9Z" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M5 15H19M8 18H10M14 18H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

// For You - lightbulb/offer
export function IconForYou({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ color: "currentColor" }}>
      <path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22S22 17.52 22 12S17.52 2 12 2M12 20C7.59 20 4 16.41 4 12S7.59 4 12 4S20 7.59 20 12S16.41 20 12 20Z" fill="currentColor" opacity="0.3"/>
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M12 9V15M9 12H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

// Connection - handshake
export function IconConnection({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ color: "currentColor" }}>
      <path d="M3 12C3 7.58172 6.58172 4 12 4C17.4183 4 21 7.58172 21 12C21 16.4183 17.4183 20 12 20C6.58172 20 3 16.4183 3 12Z" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M8 13C7 12 6 13 6 14C6 15.5 7.5 16.5 9 16.5M16 13C17 12 18 13 18 14C18 15.5 16.5 16.5 15 16.5M10 12L14 12M10.5 13.5L13.5 10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Integration - overlapping circles (Venn diagram)
export function IconIntegration({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ color: "currentColor" }}>
      <circle cx="9" cy="12" r="6" stroke="currentColor" strokeWidth="2" fill="none"/>
      <circle cx="15" cy="12" r="6" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M12 9L12 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

// Candle - flame
export function IconCandle({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ color: "currentColor" }}>
      <path d="M12 2C12 2 13 4 13 6C13 8 12 10 12 10C12 10 11 8 11 6C11 4 12 2 12 2Z" fill="currentColor"/>
      <rect x="11" y="10" width="2" height="6" fill="currentColor"/>
      <rect x="9" y="16" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
    </svg>
  );
}

// Admin - settings/gear
export function IconAdmin({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ color: "currentColor" }}>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M12 1V4M12 20V23M23 12H20M4 12H1M20.485 3.515L18.364 5.636M5.636 18.364L3.515 20.485M20.485 20.485L18.364 18.364M5.636 5.636L3.515 3.515" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

// Spaces/Commons - columns
export function IconSpaces({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ color: "currentColor" }}>
      <rect x="3" y="5" width="3" height="14" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
      <rect x="10.5" y="5" width="3" height="14" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
      <rect x="18" y="5" width="3" height="14" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
    </svg>
  );
}

// Demo - beaker/flask
export function IconDemo({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ color: "currentColor" }}>
      <path d="M9 3H15V6H20L14 18H10L4 6H9V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <line x1="11" y1="9" x2="13" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

// Alert - warning triangle
export function IconAlert({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ color: "currentColor" }}>
      <path d="M12 2L2 20H22L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="12" cy="17" r="1" fill="currentColor"/>
    </svg>
  );
}

// Logo - triangular design
export function IconLogo({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" className={className}>
      {/* Top yellow triangle - pointing right */}
      <polygon points="60,15 80,0 75,30" fill="#FFD700" />
      {/* Middle dark brown triangle - pointing down-right */}
      <polygon points="55,38 75,20 65,45" fill="#6B5F52" />
      {/* Bottom orange triangle - pointing down-right */}
      <polygon points="50,55 70,35 60,65" fill="#FF9500" />
    </svg>
  );
}
