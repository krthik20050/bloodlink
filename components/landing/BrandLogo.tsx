import React from "react";
import Link from "next/link";

interface BrandLogoProps {
  href?: string;
  variant?: "default" | "dark";
}

/**
 * Minimal precision brandmark for RaktaSetu.
 * Geometry: Two points connecting through a single clean bridge.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  href = "/",
  variant = "default",
}) => {
  const isDark = variant === "dark";

  const content = (
    <div className={`rs-brand ${isDark ? "rs-brand--dark" : ""}`}>
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="rs-brand-symbol"
        aria-hidden="true"
      >
        {/* Two connection points bridged into one clean link */}
        <circle
          cx="6.5"
          cy="14"
          r="3"
          stroke="currentColor"
          strokeWidth="1.75"
        />
        <path
          d="M9.5 14H18.5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <circle
          cx="21.5"
          cy="14"
          r="3"
          stroke="currentColor"
          strokeWidth="1.75"
        />
        {/* Subtle accent signal on primary node */}
        <circle
          cx="6.5"
          cy="14"
          r="1.25"
          fill="var(--rs-accent, #8B2635)"
        />
      </svg>
      <span className="rs-brand-text">RaktaSetu</span>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="rs-brand-link" aria-label="RaktaSetu home">
        {content}
      </Link>
    );
  }

  return content;
};
