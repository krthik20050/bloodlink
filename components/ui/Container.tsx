import React from "react";

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "default" | "narrow" | "wide";
  children: React.ReactNode;
}

export const Container: React.FC<ContainerProps> = ({
  size = "default",
  className = "",
  children,
  ...props
}) => {
  return (
    <div
      className={`rs-container rs-container--${size} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
};
