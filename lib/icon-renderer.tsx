import {
  IconCommons,
  IconWelcome,
  IconIntimacy,
  IconTouch,
  IconSpiritual,
  IconDating,
  IconCouples,
  IconEmbodiment,
  IconWorkshops,
  IconBadge,
  IconEvent,
  IconProfile,
  IconHeart,
  IconPairing,
  IconChat,
  IconArrow,
  IconCheck,
  IconPlus,
  IconMenu,
} from "@/components/Icons";

interface IconRendererProps {
  icon: string;
  size?: number;
  className?: string;
}

export function renderIcon({ icon, size = 20, className = "" }: IconRendererProps) {
  const iconMap: { [key: string]: React.ComponentType<any> } = {
    commons: IconCommons,
    welcome: IconWelcome,
    "start-here": IconWelcome,
    intimacy: IconIntimacy,
    "intimacy-patterns": IconIntimacy,
    touch: IconTouch,
    "touch-affection": IconTouch,
    spiritual: IconSpiritual,
    "spirituality-sexuality": IconSpiritual,
    dating: IconDating,
    "dating-desire": IconDating,
    couples: IconCouples,
    embodiment: IconEmbodiment,
    workshops: IconWorkshops,
    badge: IconBadge,
    event: IconEvent,
    profile: IconProfile,
    heart: IconHeart,
    pairing: IconPairing,
    chat: IconChat,
    arrow: IconArrow,
    check: IconCheck,
    plus: IconPlus,
    menu: IconMenu,
  };

  const IconComponent = iconMap[icon.toLowerCase()] || IconCommons;
  return <IconComponent size={size} />;
}

export function renderIconStatic(icon: string): string {
  // For places where we can't use React components, fallback to text indicator
  const iconMap: { [key: string]: string } = {
    commons: "◉",
    "start-here": "→",
    "intimacy-patterns": "∿",
    "touch-affection": "☁",
    "spirituality-sexuality": "✦",
    "dating-desire": "♡",
    couples: "♪",
    embodiment: "⊕",
    workshops: "▬",
  };
  return iconMap[icon.toLowerCase()] || "•";
}
