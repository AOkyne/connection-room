import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  id?: string;
}

export function Card({ children, className = "", onClick, id }: CardProps) {
  const baseStyles =
    "bg-[#fffbf7] rounded-2xl p-6 shadow-sm border border-[#ede6e0] transition-all duration-150 hover:shadow-md";
  const interactiveStyles = onClick ? "cursor-pointer hover:shadow-lg" : "";

  return (
    <div id={id} className={`${baseStyles} ${interactiveStyles} ${className}`} onClick={onClick}>
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
    <div className="mb-5 pb-3 border-b border-[#ede6e0]">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center text-[#d4a574] bg-[#f3ede5] rounded-lg" style={{ color: "#d4a574" }}>
            {typeof icon === "string" ? <span className="text-2xl">{icon}</span> : icon}
          </div>
        )}
        <div>
          <h3 className="text-xl font-bold text-[#2a2318]">{title}</h3>
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
  return <div className="mt-5 pt-4 border-t border-[#ede6e0] flex gap-2">{children}</div>;
}
