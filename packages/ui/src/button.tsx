import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "highlight" | "ghost";
}

export const Button = ({
  children,
  className = "",
  variant = "primary",
  ...props
}: ButtonProps) => {
  const variantClass = {
    primary: "gh-button-primary",
    highlight: "gh-button-highlight",
    ghost: "gh-button-ghost",
  }[variant];

  return (
    <button className={`gh-button ${variantClass} ${className}`} {...props}>
      {children}
    </button>
  );
};
