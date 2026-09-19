import React from "react";

export const NotADirectory: React.FC = () => {
  return (
    <section id="comparison" className="rs-axis-section" aria-labelledby="axis-title">
      <div className="rs-container">
        {/* Section Header */}
        <div className="rs-axis-header">
          <span className="rs-mono-tag">03 // ARCHITECTURAL PARADIGM</span>
          <h2 id="axis-title" className="rs-axis-title">
            Not a directory. <br />
            A coordination layer.
          </h2>
          <p className="rs-axis-lead">
            Traditional approaches publish open directories and rely on broadcast panic. RaktaSetu operates as an intelligent coordination system that evaluates constraints before contacting a single individual.
          </p>
        </div>

        {/* Typographic Axis Contrast (Zero cards, clean architectural split with thin central axis) */}
        <div className="rs-axis-grid">
          {/* Left: The Directory Model */}
          <div className="rs-axis-column rs-axis-column--directory">
            <div className="rs-axis-col-head">
              <span className="rs-axis-badge">THE DIRECTORY MODEL</span>
              <h3 className="rs-axis-col-title">Broadcast &amp; Hope</h3>
            </div>

            {/* Sequence line */}
            <div className="rs-axis-flow" aria-label="Directory workflow">
              <span className="rs-flow-step">Search</span>
              <span className="rs-flow-arrow" aria-hidden="true">→</span>
              <span className="rs-flow-step">Browse</span>
              <span className="rs-flow-arrow" aria-hidden="true">→</span>
              <span className="rs-flow-step">Broadcast</span>
              <span className="rs-flow-arrow" aria-hidden="true">→</span>
              <span className="rs-flow-step">Hope</span>
            </div>

            <div className="rs-axis-points">
              <div className="rs-axis-point">
                <strong className="rs-point-head">Public Contact Leakage</strong>
                <p className="rs-point-body">
                  Personal phone numbers remain indexed indefinitely on social channels and forums, exposing donors to unsolicited calls.
                </p>
              </div>

              <div className="rs-axis-point">
                <strong className="rs-point-head">Alarm Fatigue</strong>
                <p className="rs-point-body">
                  Volunteers receive repeated generic broadcasts for incompatible blood groups or distant cities, eventually muting alert channels.
                </p>
              </div>

              <div className="rs-axis-point">
                <strong className="rs-point-head">Blind Cooldown Status</strong>
                <p className="rs-point-body">
                  Recent donors are contacted blindly during their mandatory 90-day recovery period, wasting vital triage minutes.
                </p>
              </div>
            </div>
          </div>

          {/* Hairline Central Axis Divider */}
          <div className="rs-axis-divider" aria-hidden="true" />

          {/* Right: RaktaSetu Coordination Layer */}
          <div className="rs-axis-column rs-axis-column--raktasetu">
            <div className="rs-axis-col-head">
              <span className="rs-axis-badge rs-axis-badge--accent">RAKTASETU LAYER</span>
              <h3 className="rs-axis-col-title">Deterministic Routing</h3>
            </div>

            {/* Sequence line */}
            <div className="rs-axis-flow rs-axis-flow--accent" aria-label="RaktaSetu workflow">
              <span className="rs-flow-step">Coordinate</span>
              <span className="rs-flow-arrow" aria-hidden="true">→</span>
              <span className="rs-flow-step">Filter</span>
              <span className="rs-flow-arrow" aria-hidden="true">→</span>
              <span className="rs-flow-step">Notify</span>
              <span className="rs-flow-arrow" aria-hidden="true">→</span>
              <span className="rs-flow-step">Connect</span>
            </div>

            <div className="rs-axis-points">
              <div className="rs-axis-point">
                <strong className="rs-point-head">Shielded Credentials</strong>
                <p className="rs-point-body">
                  Identity and contact details remain protected by default. Direct contact is shared bilaterally only upon mutual consent.
                </p>
              </div>

              <div className="rs-axis-point">
                <strong className="rs-point-head">Antigen Matrix Pre-Verification</strong>
                <p className="rs-point-body">
                  Computational matching confirms ABO/Rh compatibility before alert dispatch. Incompatible candidates are never disturbed.
                </p>
              </div>

              <div className="rs-axis-point">
                <strong className="rs-point-head">Autonomous Cooldown Protection</strong>
                <p className="rs-point-body">
                  Statutory 90-day donation intervals are tracked and enforced automatically, protecting donor biological recovery.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
