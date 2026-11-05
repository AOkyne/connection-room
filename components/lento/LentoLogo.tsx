import Image from "next/image";

// The Lento logo, trimmed copies in /public/lento (900px wide):
//   tagline: dark logo with "Be in the room, not in your head." (first welcome)
//   plain:   dark logo, for light backgrounds
//   light:   white logo, for the chocolate room header
const LOGOS = {
  tagline: { src: "/lento/lento-logo-tagline.png", width: 900, height: 558 },
  plain: { src: "/lento/lento-logo.png", width: 900, height: 518 },
  light: { src: "/lento/lento-logo-light.png", width: 900, height: 517 },
} as const;

export function LentoLogo({
  variant = "plain",
  width,
  className,
  priority,
}: {
  variant?: keyof typeof LOGOS;
  width: number;
  className?: string;
  priority?: boolean;
}) {
  const logo = LOGOS[variant];
  return (
    <Image
      src={logo.src}
      alt="Lento by Trevor James"
      width={width}
      height={Math.round((width * logo.height) / logo.width)}
      className={className}
      priority={priority}
    />
  );
}
