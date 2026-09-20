"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { BrandLogo } from "./BrandLogo";
import { Menu, X } from "lucide-react";

interface NavbarProps {
  user: { email?: string | null } | null;
  telegramLink: string;
}

export const Navbar: React.FC<NavbarProps> = ({ user, telegramLink }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 12);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  const accountHref = user ? "/account" : "/auth";
  const accountLabel = user ? (user.email ? user.email.split("@")[0] : "Account") : "Sign in";

  return (
    <header
      className={`rs-header ${scrolled ? "rs-header--scrolled" : ""}`}
      aria-label="Main navigation"
    >
      <div className="rs-header-inner">
        {/* Left: Brand */}
        <div className="rs-header-left">
          <BrandLogo />
        </div>

        {/* Center: Primary Navigation Links */}
        <nav className="rs-header-center" aria-label="Desktop primary">
          <a href="#how-it-works" className="rs-nav-link">
            How it works
          </a>
          <a href="#the-engine" className="rs-nav-link">
            The engine
          </a>
          <Link href="/request" className="rs-nav-link">
            For requests
          </Link>
          <Link href="/donor" className="rs-nav-link">
            For donors
          </Link>
          <Link href="/requests" className="rs-nav-link">
            My requests
          </Link>
          <a href="#founders" className="rs-nav-link">
            Meet the Founders
          </a>
        </nav>

        {/* Right: Actions */}
        <div className="rs-header-right">
          <a
            href={telegramLink}
            target="_blank"
            rel="noreferrer"
            className="rs-nav-text-action"
            title="Telegram Bot"
          >
            Telegram
          </a>

          <Link href={accountHref} className="rs-nav-sign-in">
            {accountLabel}
          </Link>

          <button
            type="button"
            className="rs-nav-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Clean Full-Width Mobile Navigation Overlay */}
      {mobileMenuOpen && (
        <div
          className="rs-mobile-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
        >
          <nav className="rs-mobile-links">
            <a
              href="#how-it-works"
              className="rs-mobile-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              How it works
            </a>
            <a
              href="#the-engine"
              className="rs-mobile-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              The engine
            </a>
            <Link
              href="/request"
              className="rs-mobile-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              For requests
            </Link>
            <Link
              href="/donor"
              className="rs-mobile-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              For donors
            </Link>
            <Link
              href="/requests"
              className="rs-mobile-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              My requests
            </Link>
            <a
              href="#founders"
              className="rs-mobile-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              Meet the Founders
            </a>
            <Link
              href={accountHref}
              className="rs-mobile-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              {accountLabel}
            </Link>
            <a
              href={telegramLink}
              target="_blank"
              rel="noreferrer"
              className="rs-mobile-link rs-mobile-link--muted"
              onClick={() => setMobileMenuOpen(false)}
            >
              Telegram Bot
            </a>
          </nav>
        </div>
      )}
    </header>
  );
};
