import React from "react";
import Link from "next/link";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export const CallToAction: React.FC = () => {
  return (
    <section className="rs-cta-dark-section" aria-labelledby="cta-heading">
      <div className="rs-content-container rs-cta-inner">
        <ScrollReveal>
          {/* Subtle 2-node connecting line */}
          <div className="rs-cta-mark-wrap" aria-hidden="true">
            <svg
              width="140"
              height="24"
              viewBox="0 0 140 24"
              fill="none"
              className="rs-cta-line-mark"
            >
              <circle cx="12" cy="12" r="3.5" stroke="#777777" strokeWidth="1.5" />
              <line
                x1="16"
                y1="12"
                x2="124"
                y2="12"
                stroke="#333333"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle cx="128" cy="12" r="4.5" fill="var(--rs-accent, #8F2638)" />
            </svg>
          </div>

          <h2 id="cta-heading" className="rs-cta-title">
            Someone needs blood.<br />
            Make the next step clear.
          </h2>

          <p className="rs-cta-body">
            Request blood for a medical procedure or register to receive private, relevant donor alerts.
          </p>

          <div className="rs-cta-buttons">
            <Link href="/request" className="rs-btn-primary rs-btn-lg">
              <span>I need blood</span>
              <span className="rs-btn-arrow" aria-hidden="true">→</span>
            </Link>
            <Link href="/donor" className="rs-btn-dark-secondary rs-btn-lg">
              <span>I want to donate</span>
              <span className="rs-btn-arrow" aria-hidden="true">→</span>
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};
