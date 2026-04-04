import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export const Card = ({
  children,
  title,
  className = "",
  ...props
}: CardProps) => {
  return (
    <div className={`gh-card ${className}`} {...props}>
      {title && (
        <h3 className="text-sm font-iosevka-bold text-[var(--muted)] tracking-widest uppercase mb-4">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
};
