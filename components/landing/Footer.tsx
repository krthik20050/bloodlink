import React from "react";
import Link from "next/link";
import { BrandLogo } from "./BrandLogo";

interface FooterProps {
  telegramLink: string;
}

export const Footer: React.FC<FooterProps> = ({ telegramLink }) => {
  // ponytail: derive @handle from link; strip scheme/domain + trailing slash
  const handle = telegramLink.replace(/^https?:\/\/t\.me\//, "").replace(/\/+$/, "");
  return (
    <footer className="rs-footer" aria-label="Site footer">
      <div className="rs-content-container rs-footer-inner">
        <div className="rs-footer-brand-block">
          <BrandLogo />
          <p className="rs-footer-desc">
            Blood donor coordination, built around relevance and privacy.
          </p>
        </div>

        <nav className="rs-footer-links" aria-label="Footer navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#the-engine">The engine</a>
          <Link href="/request">For requests</Link>
          <Link href="/donor">For donors</Link>
          <Link href="/auth">Sign in</Link>
          <a href={telegramLink} target="_blank" rel="noopener noreferrer">
            Telegram (@{handle})
          </a>
        </nav>
      </div>

      <div className="rs-content-container rs-footer-bottom">
        <span>&copy; {new Date().getFullYear()} RaktaSetu.</span>
      </div>
    </footer>
  );
};
