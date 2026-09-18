import React from "react";

export const ProblemStatement: React.FC = () => {
  return (
    <section className="rs-problem-section" aria-labelledby="problem-statement-title">
      <div className="rs-container">
        <div className="rs-problem-inner">
          <div className="rs-problem-tag-row">
            <span className="rs-mono-tag">01 // THE SYSTEM FAILURE IN EMERGENCIES</span>
          </div>

          <h2 id="problem-statement-title" className="rs-problem-statement">
            When an emergency happens, people post phone numbers into group chats. Everyone is spammed. The right donor is missed. The wrong people are called.
          </h2>

          <div className="rs-problem-resolution-row">
            <div className="rs-resolution-line" aria-hidden="true" />
            <p className="rs-problem-resolution">
              RaktaSetu replaces broadcast panic with deterministic, private coordination.
            </p>
          </div>

          {/* Minimal hairline comparative baseline (no cards) */}
          <div className="rs-problem-baseline-grid">
            <div className="rs-problem-baseline-item">
              <span className="rs-baseline-label">THE BROADCAST MODEL</span>
              <p className="rs-baseline-text">
                Unfiltered public calls, alarm fatigue, personal numbers indexed forever.
              </p>
            </div>
            <div className="rs-problem-baseline-sep" aria-hidden="true" />
            <div className="rs-problem-baseline-item rs-problem-baseline-item--accent">
              <span className="rs-baseline-label">THE COORDINATION LAYER</span>
              <p className="rs-baseline-text">
                Immunological pre-filtering, biological cooldown enforcement, discreet 1-to-1 routing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
