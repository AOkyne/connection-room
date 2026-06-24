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
  const baseStyles = "font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#d4a574] focus:ring-offset-2";

  const variants = {
    primary: "bg-[#9d7f5c] text-white hover:bg-[#8a6f52] active:bg-[#6a523a] shadow-sm hover:shadow-md",
    secondary: "bg-[#d4a574] text-white hover:bg-[#c99563] active:bg-[#b0834d] shadow-sm hover:shadow-md",
    outline: "border-2 border-[#d4a574] text-[#9d7f5c] hover:bg-[#faf7f2] hover:border-[#c99563]",
    ghost: "text-[#9d7f5c] hover:bg-[#f3ede5] hover:text-[#7d6245]",
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
