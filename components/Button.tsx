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
  const baseStyles = "font-medium rounded-lg transition-all duration-150 focus:outline-none";

  const variants = {
    primary: "bg-[#9d7f5c] text-white hover:bg-[#7d6245] active:bg-[#6a523a]",
    secondary: "bg-[#d4a574] text-white hover:bg-[#c29560] active:bg-[#b0834d]",
    outline: "border-2 border-[#d4a574] text-[#9d7f5c] hover:bg-[#faf7f2]",
    ghost: "text-[#9d7f5c] hover:bg-[#f3ede5]",
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
