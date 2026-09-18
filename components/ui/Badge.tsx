import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "neutral" | "oxblood" | "sage" | "dark" | "outline";
  size?: "sm" | "md";
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "neutral",
  size = "sm",
  className = "",
  children,
  ...props
}) => {
  return (
    <span
      className={`rs-badge rs-badge--${variant} rs-badge--${size} ${className}`.trim()}
      {...props}
    >
      {children}
    </span>
  );
};
