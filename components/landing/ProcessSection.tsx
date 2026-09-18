import React from "react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

interface StepItem {
  num: string;
  title: string;
  body: string;
}

const STEPS: StepItem[] = [
  {
    num: "01",
    title: "REQUEST",
    body: "Tell us what is needed.",
  },
  {
    num: "02",
    title: "FILTER",
    body: "We narrow the network.",
  },
  {
    num: "03",
    title: "NOTIFY",
    body: "Relevant donors receive a private request.",
  },
  {
    num: "04",
    title: "CONNECT",
    body: "A donor chooses whether to help.",
  },
];

export const ProcessSection: React.FC = () => {
  return (
    <section id="how-it-works" className="rs-section rs-process-section" aria-labelledby="process-heading">
      <div className="rs-content-container">
        <ScrollReveal>
          <div className="rs-process-head">
            <span className="rs-section-eyebrow">HOW IT WORKS</span>
            <h2 id="process-heading" className="rs-section-title">
              Four steps.<br />
              One focused response.
            </h2>
          </div>
        </ScrollReveal>

        {/* Single Thin Connected Line Process with 80ms Staggered Reveal */}
        <div className="rs-process-track-shell">
          <div className="rs-process-track" role="list">
            {STEPS.map((step, idx) => (
              <ScrollReveal key={step.num} delay={idx * 80} className="rs-process-step-wrap">
                <div className="rs-process-step" role="listitem">
                  <div className="rs-step-topline">
                    <span className="rs-step-num">{step.num}</span>
                    <span className="rs-step-title">{step.title}</span>
                    {idx < STEPS.length - 1 && (
                      <div className="rs-step-connector" aria-hidden="true" />
                    )}
                  </div>
                  <p className="rs-step-body">{step.body}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
