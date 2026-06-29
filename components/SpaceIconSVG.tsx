interface SpaceIconSVGProps {
  spaceId: string;
  size?: number;
}

const COLOR = "#d4a348";

export function SpaceIconSVG({ spaceId, size = 32 }: SpaceIconSVGProps) {
  switch (spaceId) {
    case "commons":
      // Building/columns
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <rect x="3" y="5" width="3" height="14" fill={COLOR}/>
          <rect x="10.5" y="5" width="3" height="14" fill={COLOR}/>
          <rect x="18" y="5" width="3" height="14" fill={COLOR}/>
          <line x1="1" y1="19" x2="23" y2="19" stroke={COLOR} strokeWidth="2"/>
        </svg>
      );

    case "start-here":
      // Signpost/path
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <rect x="10" y="2" width="4" height="16" fill={COLOR}/>
          <path d="M14 8L22 8M14 12L22 12M14 16L22 16" stroke={COLOR} strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      );

    case "intimacy-patterns":
      // Connected rings
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <circle cx="8" cy="12" r="5" stroke={COLOR} strokeWidth="2.5" fill="none"/>
          <circle cx="16" cy="12" r="5" stroke={COLOR} strokeWidth="2.5" fill="none"/>
        </svg>
      );

    case "touch-affection":
      // Hands
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M6 10L6 18M10 8L10 18M14 8L14 18M18 10L18 18" stroke={COLOR} strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M4 18H20" stroke={COLOR} strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      );

    case "spirituality-sexuality":
      // Spiral/ascent
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M12 2L13 7M12 7L11 12M12 12L13 17M12 17L11 22" stroke={COLOR} strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx="12" cy="12" r="4" stroke={COLOR} strokeWidth="2.5" fill="none"/>
        </svg>
      );

    case "dating-desire":
      // Spark/star
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M12 2L14.39 9.26H22L16.18 13.59L18.57 20.88L12 16.55L5.43 20.88L7.82 13.59L2 9.26H9.61L12 2Z" fill={COLOR}/>
        </svg>
      );

    case "couples":
      // Two hearts/figures
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M6 9C6 7.5 7 6 8 6C9 6 10 7 10 9C10 11 6 14 6 14C6 14 2 11 2 9C2 7 3 6 4 6C5 6 6 7 6 9Z" fill={COLOR}/>
          <path d="M18 9C18 7.5 19 6 20 6C21 6 22 7 22 9C22 11 18 14 18 14C18 14 14 11 14 9C14 7 15 6 16 6C17 6 18 7 18 9Z" fill={COLOR}/>
        </svg>
      );

    case "embodiment":
      // Centered figure
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="4" r="2.5" fill={COLOR}/>
          <line x1="12" y1="6.5" x2="12" y2="14" stroke={COLOR} strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="7" y1="10" x2="17" y2="10" stroke={COLOR} strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="9" y1="14" x2="12" y2="20" stroke={COLOR} strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="15" y1="14" x2="12" y2="20" stroke={COLOR} strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      );

    case "workshops":
      // Mountain/layers
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M2 20L8 12L14 18L22 8" stroke={COLOR} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="8" cy="12" r="1.5" fill={COLOR}/>
          <circle cx="14" cy="18" r="1.5" fill={COLOR}/>
        </svg>
      );

    case "masculinity-sex-sexuality":
      // Male symbol
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <circle cx="16" cy="8" r="5" stroke={COLOR} strokeWidth="2.5" fill="none"/>
          <line x1="16" y1="13" x2="16" y2="22" stroke={COLOR} strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="12" y1="17" x2="20" y2="17" stroke={COLOR} strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      );

    case "sacred-sexuality":
      // Lotus/flower
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3" fill={COLOR}/>
          <path d="M12 6C9.5 4 7 5 7 8C7 6 5 4.5 3 6C2 7.5 3 10 6 10C4 11 3 13 5 14C6.5 12.5 8 13 8 15" stroke={COLOR} strokeWidth="2" fill="none" strokeLinecap="round"/>
          <path d="M12 6C14.5 4 17 5 17 8C17 6 19 4.5 21 6C22 7.5 21 10 18 10C20 11 21 13 19 14C17.5 12.5 16 13 16 15" stroke={COLOR} strokeWidth="2" fill="none" strokeLinecap="round"/>
        </svg>
      );

    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <rect x="3" y="5" width="3" height="14" fill={COLOR}/>
          <rect x="10.5" y="5" width="3" height="14" fill={COLOR}/>
          <rect x="18" y="5" width="3" height="14" fill={COLOR}/>
        </svg>
      );
  }
}
