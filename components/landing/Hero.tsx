import React from "react";
import Link from "next/link";
import { HeroMark } from "./HeroMark";

interface HeroProps {
  user: { email?: string | null } | null;
  telegramLink?: string;
}

export const Hero: React.FC<HeroProps> = ({ user, telegramLink }) => {
  return (
    <section className="rs-hero" aria-labelledby="hero-title">
      <div className="rs-content-container rs-hero-grid">
        {/* Left: Message Block */}
        <div className="rs-hero-text">
          <span className="rs-hero-eyebrow rs-hero-animate-eyebrow">THE BLOOD NETWORK</span>

          <h1 id="hero-title" className="rs-hero-title rs-hero-animate-title">
            Find the right person<br />
            when it matters the most.
          </h1>

          <p className="rs-hero-description rs-hero-animate-desc">
            RaktaSetu connects blood requests with compatible, eligible donors nearby privately.
          </p>

          <div className="rs-hero-buttons rs-hero-animate-buttons">
            <Link href="/request" className="rs-btn-primary">
              <span>I need blood</span>
              <span className="rs-btn-arrow" aria-hidden="true">→</span>
            </Link>
            <Link href="/donor" className="rs-btn-secondary">
              <span>I want to donate</span>
              <span className="rs-btn-arrow" aria-hidden="true">→</span>
            </Link>
          </div>

          {telegramLink ? (
            <p className="rs-hero-telegram rs-hero-animate-telegram">
              <span>
                Prefer chat?{" "}
                <a
                  href={telegramLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rs-telegram-tertiary"
                >
                  Continue in Telegram{" "}
                  <span className="rs-btn-arrow" aria-hidden="true">→</span>
                </a>
              </span>
              <span className="rs-hero-telegram-note rs-hero-animate-telegram-note">
                Notifications are not guaranteed.
              </span>
            </p>
          ) : null}

          <div className="rs-hero-signature rs-hero-animate-signature" aria-hidden="true">
            <span className="rs-sig-step">01 REQUEST</span>
            <span className="rs-sig-sep">→</span>
            <span className="rs-sig-step">02 MATCH</span>
            <span className="rs-sig-sep">→</span>
            <span className="rs-sig-step">03 NOTIFY</span>
            <span className="rs-sig-sep">→</span>
            <span className="rs-sig-step">04 CONNECT</span>
          </div>
        </div>

        {/* Right: Visual Object in Clean Whitespace */}
        <div className="rs-hero-visual-wrap">
          <HeroMark />
        </div>
      </div>
    </section>
  );
};
