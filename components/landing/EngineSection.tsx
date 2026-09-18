"use client";

import React, { useState, useEffect } from "react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

interface EngineStage {
  id: number;
  count: number;
  label: string;
  detail: string;
}

const ENGINE_STAGES: EngineStage[] = [
  {
    id: 0,
    count: 47,
    label: "REGIONAL DONORS",
    detail: "Total registered candidate pool in geographic zone.",
  },
  {
    id: 1,
    count: 29,
    label: "COMPATIBLE",
    detail: "Screened for deterministic red-cell blood group compatibility.",
  },
  {
    id: 2,
    count: 17,
    label: "ELIGIBLE",
    detail: "Screened for 90-day safe whole blood donation recovery window.",
  },
  {
    id: 3,
    count: 9,
    label: "NEARBY",
    detail: "Filtered for realistic transit time to the destination medical facility.",
  },
  {
    id: 4,
    count: 6,
    label: "NOTIFIED",
    detail: "Focused group receiving prioritized, private 1:1 notification waves.",
  },
];

interface DarkNode {
  id: number;
  x: number;
  y: number;
  survivesUntilStage: number; // 0..4
}

const DARK_NODES: DarkNode[] = [
  // 6 Final Notified Donors (survive all stages 0..4)
  { id: 1, x: 330, y: 155, survivesUntilStage: 4 },
  { id: 2, x: 200, y: 140, survivesUntilStage: 4 },
  { id: 3, x: 290, y: 260, survivesUntilStage: 4 },
  { id: 4, x: 170, y: 210, survivesUntilStage: 4 },
  { id: 5, x: 260, y: 90, survivesUntilStage: 4 },
  { id: 6, x: 340, y: 220, survivesUntilStage: 4 },

  // 3 Nearby (survive until stage 3)
  { id: 7, x: 210, y: 270, survivesUntilStage: 3 },
  { id: 8, x: 320, y: 95, survivesUntilStage: 3 },
  { id: 9, x: 230, y: 70, survivesUntilStage: 3 },

  // 8 Filtered at proximity (survive until stage 2)
  { id: 10, x: 120, y: 80, survivesUntilStage: 2 },
  { id: 11, x: 390, y: 100, survivesUntilStage: 2 },
  { id: 12, x: 250, y: 330, survivesUntilStage: 2 },
  { id: 13, x: 130, y: 250, survivesUntilStage: 2 },
  { id: 14, x: 370, y: 290, survivesUntilStage: 2 },
  { id: 15, x: 170, y: 50, survivesUntilStage: 2 },
  { id: 16, x: 340, y: 40, survivesUntilStage: 2 },
  { id: 17, x: 90, y: 170, survivesUntilStage: 2 },

  // 12 Filtered at interval (survive until stage 1)
  { id: 18, x: 150, y: 130, survivesUntilStage: 1 },
  { id: 19, x: 360, y: 165, survivesUntilStage: 1 },
  { id: 20, x: 230, y: 240, survivesUntilStage: 1 },
  { id: 21, x: 280, y: 130, survivesUntilStage: 1 },
  { id: 22, x: 180, y: 90, survivesUntilStage: 1 },
  { id: 23, x: 310, y: 310, survivesUntilStage: 1 },
  { id: 24, x: 80, y: 90, survivesUntilStage: 1 },
  { id: 25, x: 420, y: 160, survivesUntilStage: 1 },
  { id: 26, x: 140, y: 310, survivesUntilStage: 1 },
  { id: 27, x: 390, y: 60, survivesUntilStage: 1 },
  { id: 28, x: 70, y: 260, survivesUntilStage: 1 },
  { id: 29, x: 420, y: 290, survivesUntilStage: 1 },

  // 18 Filtered at compatibility (survive only at stage 0)
  { id: 30, x: 60, y: 50, survivesUntilStage: 0 },
  { id: 31, x: 440, y: 60, survivesUntilStage: 0 },
  { id: 32, x: 50, y: 140, survivesUntilStage: 0 },
  { id: 33, x: 450, y: 130, survivesUntilStage: 0 },
  { id: 34, x: 55, y: 200, survivesUntilStage: 0 },
  { id: 35, x: 445, y: 220, survivesUntilStage: 0 },
  { id: 36, x: 100, y: 350, survivesUntilStage: 0 },
  { id: 37, x: 400, y: 350, survivesUntilStage: 0 },
  { id: 38, x: 190, y: 360, survivesUntilStage: 0 },
  { id: 39, x: 310, y: 365, survivesUntilStage: 0 },
  { id: 40, x: 110, y: 35, survivesUntilStage: 0 },
  { id: 41, x: 390, y: 30, survivesUntilStage: 0 },
  { id: 42, x: 230, y: 25, survivesUntilStage: 0 },
  { id: 43, x: 280, y: 30, survivesUntilStage: 0 },
  { id: 44, x: 35, y: 310, survivesUntilStage: 0 },
  { id: 45, x: 465, y: 325, survivesUntilStage: 0 },
  { id: 46, x: 470, y: 90, survivesUntilStage: 0 },
  { id: 47, x: 30, y: 90, survivesUntilStage: 0 },
];

const CENTER_X = 250;
const CENTER_Y = 190;

export const EngineSection: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(1); // Default to stage 1 (Compatible)
  const stage = ENGINE_STAGES[activeStep];
  const [displayCount, setDisplayCount] = useState<number>(ENGINE_STAGES[1].count);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayCount(stage.count);
      return;
    }

    const target = stage.count;
    const start = displayCount;
    if (start === target) return;

    const startTime = performance.now();
    const duration = 200;

    let frameId: number;
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (target - start) * eased);
      setDisplayCount(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [activeStep, stage.count]);

  return (
    <section id="the-engine" className="rs-engine-section" aria-labelledby="engine-heading">
      <div className="rs-content-container">
        <ScrollReveal>
          {/* Section Header */}
          <div className="rs-engine-intro">
            <span className="rs-engine-eyebrow">THE ENGINE</span>
            <h2 id="engine-heading" className="rs-engine-title">
              We narrow the network<br />
              before we notify it.
            </h2>
            <p className="rs-engine-body">
              RaktaSetu evaluates compatibility, eligibility, proximity, and alert thresholds before contacting a single donor.
            </p>
          </div>

          {/* Engine Composition: Network on Left, Stage Information on Right */}
          <div className="rs-engine-grid">
            {/* Left: Calm Data Visualization Canvas */}
            <div className="rs-engine-visual-wrap">
              <svg
                viewBox="0 0 500 380"
                className="rs-engine-svg"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                role="img"
                aria-label={`Network visualization showing ${stage.count} donors at ${stage.label}`}
              >
                {/* Subtle Range Ring */}
                <circle
                  cx={CENTER_X}
                  cy={CENTER_Y}
                  r="110"
                  stroke="#252525"
                  strokeWidth="1"
                  strokeDasharray="2 3"
                />

                {/* Connection Lines to surviving nodes */}
                <g className="rs-dark-lines">
                  {DARK_NODES.map((node) => {
                    const isAlive = node.survivesUntilStage >= activeStep;
                    const isFinal = node.survivesUntilStage === 4 && activeStep === 4;

                    return (
                      <line
                        key={`line-${node.id}`}
                        x1={CENTER_X}
                        y1={CENTER_Y}
                        x2={node.x}
                        y2={node.y}
                        stroke={isFinal ? "var(--rs-accent, #8F2638)" : "#2E2E2E"}
                        strokeWidth={isFinal ? 1.5 : 0.75}
                        strokeOpacity={isFinal ? 1 : isAlive ? 0.6 : 0}
                        style={{
                          transition:
                            "stroke-opacity 220ms cubic-bezier(0.22, 1, 0.36, 1), stroke 200ms ease",
                        }}
                      />
                    );
                  })}
                </g>

                {/* Donor Nodes */}
                <g className="rs-dark-nodes">
                  {DARK_NODES.map((node) => {
                    const isAlive = node.survivesUntilStage >= activeStep;
                    const isFinal = node.survivesUntilStage === 4 && activeStep === 4;
                    const r = isFinal ? 5 : isAlive ? 3 : 2;

                    return (
                      <circle
                        key={`node-${node.id}`}
                        cx={node.x}
                        cy={node.y}
                        r={r}
                        fill={
                          isFinal
                            ? "var(--rs-accent, #8F2638)"
                            : isAlive
                            ? "#E5E5E2"
                            : "#222222"
                        }
                        opacity={isAlive ? 1 : 0.15}
                        style={{
                          transform: isAlive ? "scale(1)" : "scale(0.96)",
                          transformOrigin: `${node.x}px ${node.y}px`,
                          transition:
                            "opacity 240ms cubic-bezier(0.22, 1, 0.36, 1), transform 240ms cubic-bezier(0.22, 1, 0.36, 1), fill 180ms ease",
                        }}
                      />
                    );
                  })}
                </g>

                {/* Request Center Facility */}
                <circle
                  cx={CENTER_X}
                  cy={CENTER_Y}
                  r="6.5"
                  fill="#FFFFFF"
                />
                <circle
                  cx={CENTER_X}
                  cy={CENTER_Y}
                  r="2"
                  fill="#111111"
                />
              </svg>
            </div>

            {/* Right: Stage Information & Scrubber */}
            <div className="rs-engine-info-wrap">
              <div className="rs-engine-stage-readout">
                <span className="rs-stage-big-num">{displayCount}</span>
                <span className="rs-stage-label">{stage.label}</span>
                <p className="rs-stage-detail">{stage.detail}</p>
              </div>

              {/* Horizontal Filter Reduction Stepper (47 -> 29 -> 17 -> 9 -> 6) */}
              <div className="rs-engine-stepper" role="tablist" aria-label="Engine filtering stages">
                {ENGINE_STAGES.map((stg) => {
                  const isActive = stg.id === activeStep;
                  return (
                    <button
                      key={stg.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      className={`rs-engine-step-btn ${isActive ? "rs-engine-step-btn--active" : ""}`}
                      onClick={() => setActiveStep(stg.id)}
                    >
                      <span className="rs-step-btn-num">{stg.count}</span>
                      <span className="rs-step-btn-label">{stg.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="rs-engine-pipeline-bar" aria-hidden="true">
                <span className="rs-ep-stage">47</span>
                <span className="rs-ep-arrow">→</span>
                <span className="rs-ep-stage">29</span>
                <span className="rs-ep-arrow">→</span>
                <span className="rs-ep-stage">17</span>
                <span className="rs-ep-arrow">→</span>
                <span className="rs-ep-stage">9</span>
                <span className="rs-ep-arrow">→</span>
                <span className="rs-ep-stage rs-ep-stage--final">6</span>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};
