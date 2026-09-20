import React from "react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { matchingConfig } from "@/lib/matching-config";

// ponytail: wave numbers come from matching-config — single source of truth,
// same thin connected track as How-it-works. No new layout language.
export const AfterRequestSection: React.FC = () => {
  const waves = [...matchingConfig.notificationWaves];
  return (
    <section id="after-you-request" className="rs-section" aria-labelledby="after-request-heading">
      <div className="rs-content-container">
        <ScrollReveal>
          <div className="rs-process-head">
            <span className="rs-section-eyebrow">AFTER YOU HIT SUBMIT</span>
            <h2 id="after-request-heading" className="rs-section-title">
              The circle keeps widening<br />
              until someone says yes.
            </h2>
            <p className="rs-waves-lede">
              Every request starts an automatic search around the hospital.
              The circle widens until someone says yes.
            </p>
          </div>
        </ScrollReveal>

        <div className="rs-process-track-shell">
          <div className="rs-process-track" role="list">
            {waves.map((wave, idx) => (
              <ScrollReveal key={wave.wave} delay={idx * 80} className="rs-process-step-wrap">
                <div className="rs-process-step" role="listitem">
                  <div className="rs-step-topline">
                    <span className="rs-step-num">0{wave.wave}</span>
                    <span className="rs-step-title">
                      WAVE {wave.wave === 1 ? "ONE" : wave.wave === 2 ? "TWO" : "THREE"}
                    </span>
                    {idx < waves.length - 1 && (
                      <div className="rs-step-connector" aria-hidden="true" />
                    )}
                  </div>
                  <p className="rs-step-body">
                    {idx === 0 ? "Nearest" : idx === 1 ? "Next" : "Up to"} {wave.maxDonors} matching
                    donors · within {wave.radiusKm} km
                    {idx === 0 ? " · messaged immediately" : ` · after ~${wave.waitMinutes} minutes without a yes`}.
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
