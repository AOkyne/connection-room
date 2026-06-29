import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  const baseStyles = "font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#d4a348] focus:ring-offset-2";

  const variants = {
    primary: "bg-[#6b5a45] text-white hover:bg-[#7d6b57] active:bg-[#5a483a] shadow-sm hover:shadow-md",
    secondary: "bg-[#8b6f47] text-white hover:bg-[#9d7f59] active:bg-[#7a5f3f] shadow-sm hover:shadow-md",
    outline: "border-2 border-[#8b6f47] text-[#8b6f47] hover:bg-[#f5f1eb] hover:border-[#6b5a45]",
    ghost: "text-[#8b6f47] hover:bg-[#f3ede5] hover:text-[#6b5a45]",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}
