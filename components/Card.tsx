import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = "", onClick }: CardProps) {
  const baseStyles =
    "bg-[#fffbf7] rounded-xl p-6 shadow-md border border-[#e8ddd2] transition-all duration-150";
  const interactiveStyles = onClick ? "hover:shadow-lg cursor-pointer" : "";

  return (
    <div className={`${baseStyles} ${interactiveStyles} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  icon?: string | React.ReactNode;
}

export function CardHeader({ title, subtitle, icon }: CardHeaderProps) {
  return (
    <div className="mb-4">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-[#d4a574]" style={{ color: "#d4a574" }}>
            {typeof icon === "string" ? <span className="text-3xl">{icon}</span> : icon}
          </div>
        )}
        <div>
          <h3 className="text-lg font-bold text-[#2a2318]">{title}</h3>
          {subtitle && <p className="text-sm text-[#a0968a] mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

interface CardFooterProps {
  children: React.ReactNode;
}

export function CardFooter({ children }: CardFooterProps) {
  return <div className="mt-4 pt-4 border-t border-[#e8ddd2] flex gap-2">{children}</div>;
}
