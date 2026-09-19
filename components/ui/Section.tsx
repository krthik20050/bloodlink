import React from "react";
import { Container } from "./Container";

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  variant?: "canvas" | "surface" | "dark" | "bordered";
  spacing?: "default" | "compact" | "spacious";
  containerSize?: "default" | "narrow" | "wide";
  eyebrow?: string;
  title?: string;
  description?: string;
  children: React.ReactNode;
}

export const Section: React.FC<SectionProps> = ({
  variant = "canvas",
  spacing = "default",
  containerSize = "default",
  eyebrow,
  title,
  description,
  className = "",
  children,
  ...props
}) => {
  return (
    <section
      className={`rs-section rs-section--${variant} rs-section--${spacing} ${className}`.trim()}
      {...props}
    >
      <Container size={containerSize}>
        {(eyebrow || title || description) && (
          <div className="rs-section-header">
            {eyebrow && <span className="rs-eyebrow">{eyebrow}</span>}
            {title && <h2 className="rs-section-title">{title}</h2>}
            {description && (
              <p className="rs-section-description">{description}</p>
            )}
          </div>
        )}
        {children}
      </Container>
    </section>
  );
};
