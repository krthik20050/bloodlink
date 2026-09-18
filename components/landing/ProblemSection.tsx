import React from "react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export const ProblemSection: React.FC = () => {
  return (
    <section className="rs-section rs-problem-section" aria-labelledby="problem-heading">
      <div className="rs-content-container">
        <ScrollReveal>
          <div className="rs-problem-head">
            <span className="rs-section-eyebrow">THE PROBLEM</span>
            <h2 id="problem-heading" className="rs-section-title">
              Blood requests don&apos;t need<br />
              more noise.
            </h2>
            <p className="rs-section-body">
              They need the right people to see them.
            </p>
          </div>

          {/* Horizontal Comparison Panels */}
          <div className="rs-problem-compare-grid">
            <div className="rs-compare-col">
              <span className="rs-compare-label">01 BROADCAST</span>
              <p className="rs-compare-item">Same request broadcast indiscriminately.</p>
              <p className="rs-compare-item">Hundreds notified regardless of eligibility.</p>
              <p className="rs-compare-item">High alert fatigue and low response rate.</p>
            </div>

            <div className="rs-compare-col rs-compare-col--accent">
              <span className="rs-compare-label rs-compare-label--accent">02 RAKTASETU</span>
              <p className="rs-compare-item">Algorithmically verified blood compatibility.</p>
              <p className="rs-compare-item">Enforces 90-day safe donation recovery intervals.</p>
              <p className="rs-compare-item">Private, 1:1 focused notification wave.</p>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};
