import { getInitials, getInitialColor } from "@/lib/utils/initials";

interface AvatarProps {
  name: string;
  photo?: string;
  size?: number;
  className?: string;
}

export function Avatar({ name, photo, size = 40, className = "" }: AvatarProps) {
  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        style={{ width: size, height: size }}
        className={`rounded-full flex-shrink-0 ${className}`}
      />
    );
  }

  const initials = getInitials(name);
  const color = getInitialColor(name);

  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        color: "white",
      }}
      className={`rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${className}`}
    >
      {initials}
    </div>
  );
}
