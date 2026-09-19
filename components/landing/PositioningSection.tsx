import React from "react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export const PositioningSection: React.FC = () => {
  return (
    <section className="rs-section rs-positioning-section" aria-labelledby="positioning-heading">
      <div className="rs-content-container">
        <div className="rs-positioning-split">
          {/* Left Column: Heading & Narrative */}
          <ScrollReveal className="rs-positioning-left">
            <span className="rs-section-eyebrow">SYSTEM ARCHITECTURE</span>
            <h2 id="positioning-heading" className="rs-positioning-title">
              NOT A DIRECTORY.<br />
              A COORDINATION LAYER.
            </h2>
            <p className="rs-positioning-lede">
              Open directories publish phone numbers and leave frantic families to make cold calls. RaktaSetu operates as an automated coordination layer - determining compatibility, eligibility, and proximity before initiating contact.
            </p>
          </ScrollReveal>

          {/* Right Column: Comparative Flow (subtle 100ms delay) */}
          <ScrollReveal delay={120} className="rs-positioning-right">
            <div className="rs-positioning-contrast">
              <div className="rs-contrast-group">
                <span className="rs-contrast-badge">DIRECTORY</span>
                <div className="rs-contrast-steps">
                  <span>Search</span>
                  <span className="rs-contrast-sep">→</span>
                  <span>Browse</span>
                  <span className="rs-contrast-sep">→</span>
                  <span>Broadcast</span>
                </div>
                <p className="rs-contrast-note">High friction, low response, public exposure.</p>
              </div>

              <div className="rs-contrast-divider" aria-hidden="true">
                <span className="rs-contrast-div-line" />
                <span className="rs-contrast-div-tag">VS</span>
                <span className="rs-contrast-div-line" />
              </div>

              <div className="rs-contrast-group rs-contrast-group--accent">
                <span className="rs-contrast-badge rs-contrast-badge--accent">RAKTASETU</span>
                <div className="rs-contrast-steps">
                  <span>Coordinate</span>
                  <span className="rs-contrast-sep">→</span>
                  <span>Filter</span>
                  <span className="rs-contrast-sep">→</span>
                  <span>Connect</span>
                </div>
                <p className="rs-contrast-note">Automated screening, private 1:1 dispatch.</p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
};
