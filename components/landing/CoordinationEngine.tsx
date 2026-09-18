"use client";

import React, { useState, useEffect, useRef } from "react";
import { NetworkNode, NetworkLine, Signal } from "../network/NetworkPrimitives";
import { ChevronRight, ChevronLeft, RotateCcw, ArrowRight } from "lucide-react";

interface StageInfo {
  step: number;
  count: number;
  name: string;
  sublabel: string;
  criterion: string;
  systemAction: string;
}

const STAGES: StageInfo[] = [
  {
    step: 0,
    count: 47,
    name: "REGIONAL POOL",
    sublabel: "Registered voluntary donors",
    criterion: "All registered voluntary donors within the metropolitan administrative district.",
    systemAction: "Candidate pool before algorithmic constraints are evaluated.",
  },
  {
    step: 1,
    count: 29,
    name: "COMPATIBILITY GATE",
    sublabel: "ABO & Rh immunological matrix",
    criterion: "Deterministic evaluation against red-cell antigen cross-compatibility.",
    systemAction: "18 incompatible antigen donors eliminated immediately to prevent hemolytic reactions.",
  },
  {
    step: 2,
    count: 17,
    name: "BIOLOGICAL INTERVAL",
    sublabel: "Statutory 90-day cooldown",
    criterion: "Safe recovery period since last whole-blood donation.",
    systemAction: "12 recent donors shielded automatically to safeguard donor health and hemoglobin levels.",
  },
  {
    step: 3,
    count: 9,
    name: "PROXIMITY RADIUS",
    sublabel: "Within 15km transit corridor",
    criterion: "Haversine distance from hospital coordinates to donor operational area.",
    systemAction: "8 distant donors filtered out to ensure arrival within the critical 40-minute window.",
  },
  {
    step: 4,
    count: 6,
    name: "NOTIFICATION ELIGIBILITY",
    sublabel: "Anti-fatigue & dispatch scoring",
    criterion: "Anti-spam protocol: no pending pings, optimal historical responsiveness.",
    systemAction: "3 fatigued candidates protected. Top 6 prioritized for first dispatch wave.",
  },
  {
    step: 5,
    count: 3,
    name: "DISCREET CONTACT",
    sublabel: "Wave 1 private 1-to-1 alerts",
    criterion: "Targeted alert delivered via secure Telegram bot with zero public broadcasting.",
    systemAction: "Direct prompt dispatched to top 3 priority candidates simultaneously.",
  },
  {
    step: 6,
    count: 1,
    name: "VERIFIED ACCEPTANCE",
    sublabel: "Bilateral connection locked",
    criterion: "First candidate confirms availability. Active dispatch wave halts instantly.",
    systemAction: "Bilateral hospital arrival coordinated. Remaining alerts safely cancelled.",
  },
];

// 47 Deterministic nodes in an 800x460 coordinate space
// Centered on hospital facility at (400, 230)
interface EngineNode {
  id: number;
  x: number;
  y: number;
  group: string;
  eliminatedAtStep: number; // 1 = at compatibility, 2 = at interval, 3 = at proximity, 4 = at notification, 5 = contacted but not final, 6 = not eliminated (final match)
}

const ENGINE_NODES: EngineNode[] = [
  // 1 final acceptor (id 1)
  { id: 1, x: 530, y: 190, group: "B+", eliminatedAtStep: 7 }, // survives all
  // 2 contacted wave 1 candidates
  { id: 2, x: 320, y: 160, group: "O+", eliminatedAtStep: 6 },
  { id: 3, x: 460, y: 300, group: "B+", eliminatedAtStep: 6 },
  // 3 notification eligible
  { id: 4, x: 280, y: 240, group: "B-", eliminatedAtStep: 5 },
  { id: 5, x: 420, y: 130, group: "O-", eliminatedAtStep: 5 },
  { id: 6, x: 510, y: 270, group: "B+", eliminatedAtStep: 5 },
  // 3 nearby candidates
  { id: 7, x: 330, y: 310, group: "O+", eliminatedAtStep: 4 },
  { id: 8, x: 480, y: 130, group: "B+", eliminatedAtStep: 4 },
  { id: 9, x: 360, y: 110, group: "O-", eliminatedAtStep: 4 },
  // 8 distant candidates (eliminated at step 3 - proximity)
  { id: 10, x: 190, y: 120, group: "B+", eliminatedAtStep: 3 },
  { id: 11, x: 620, y: 140, group: "O+", eliminatedAtStep: 3 },
  { id: 12, x: 400, y: 380, group: "B+", eliminatedAtStep: 3 },
  { id: 13, x: 210, y: 260, group: "O+", eliminatedAtStep: 3 },
  { id: 14, x: 580, y: 330, group: "B-", eliminatedAtStep: 3 },
  { id: 15, x: 270, y: 70, group: "O-", eliminatedAtStep: 3 },
  { id: 16, x: 520, y: 60, group: "B+", eliminatedAtStep: 3 },
  { id: 17, x: 150, y: 200, group: "O+", eliminatedAtStep: 3 },
  // 12 biological interval candidates (eliminated at step 2)
  { id: 18, x: 240, y: 170, group: "B+", eliminatedAtStep: 2 },
  { id: 19, x: 570, y: 220, group: "O+", eliminatedAtStep: 2 },
  { id: 20, x: 370, y: 280, group: "B+", eliminatedAtStep: 2 },
  { id: 21, x: 440, y: 180, group: "O-", eliminatedAtStep: 2 },
  { id: 22, x: 300, y: 90, group: "B-", eliminatedAtStep: 2 },
  { id: 23, x: 490, y: 360, group: "B+", eliminatedAtStep: 2 },
  { id: 24, x: 140, y: 100, group: "O+", eliminatedAtStep: 2 },
  { id: 25, x: 660, y: 220, group: "B+", eliminatedAtStep: 2 },
  { id: 26, x: 220, y: 340, group: "O-", eliminatedAtStep: 2 },
  { id: 27, x: 610, y: 80, group: "B+", eliminatedAtStep: 2 },
  { id: 28, x: 120, y: 300, group: "O+", eliminatedAtStep: 2 },
  { id: 29, x: 670, y: 340, group: "B+", eliminatedAtStep: 2 },
  // 18 incompatible candidates (eliminated at step 1)
  { id: 30, x: 100, y: 60, group: "A+", eliminatedAtStep: 1 },
  { id: 31, x: 700, y: 70, group: "AB+", eliminatedAtStep: 1 },
  { id: 32, x: 80, y: 170, group: "A-", eliminatedAtStep: 1 },
  { id: 33, x: 720, y: 170, group: "AB-", eliminatedAtStep: 1 },
  { id: 34, x: 90, y: 240, group: "A+", eliminatedAtStep: 1 },
  { id: 35, x: 710, y: 280, group: "AB+", eliminatedAtStep: 1 },
  { id: 36, x: 170, y: 400, group: "A-", eliminatedAtStep: 1 },
  { id: 37, x: 630, y: 410, group: "A+", eliminatedAtStep: 1 },
  { id: 38, x: 310, y: 420, group: "AB+", eliminatedAtStep: 1 },
  { id: 39, x: 490, y: 420, group: "A+", eliminatedAtStep: 1 },
  { id: 40, x: 180, y: 50, group: "A-", eliminatedAtStep: 1 },
  { id: 41, x: 620, y: 40, group: "AB-", eliminatedAtStep: 1 },
  { id: 42, x: 370, y: 40, group: "A+", eliminatedAtStep: 1 },
  { id: 43, x: 440, y: 45, group: "AB+", eliminatedAtStep: 1 },
  { id: 44, x: 60, y: 360, group: "A+", eliminatedAtStep: 1 },
  { id: 45, x: 740, y: 390, group: "A-", eliminatedAtStep: 1 },
  { id: 46, x: 750, y: 110, group: "AB+", eliminatedAtStep: 1 },
  { id: 47, x: 50, y: 120, group: "A+", eliminatedAtStep: 1 },
];

const FACILITY_X = 400;
const FACILITY_Y = 230;

export const CoordinationEngine: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(3); // Default to stage 3 for immediate clarity
  const activeStage = STAGES[currentStep];

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentStep((prev) => Math.min(STAGES.length - 1, prev + 1));
  };

  return (
    <section id="coordination-engine" className="rs-engine-dark" aria-labelledby="engine-title">
      <div className="rs-container">
        {/* Section Header */}
        <div className="rs-engine-header">
          <div className="rs-engine-tag-row">
            <span className="rs-mono-tag rs-mono-tag--dark">THE COORDINATION ENGINE</span>
            <span className="rs-engine-sep">/</span>
            <span className="rs-engine-subtag">DETERMINISTIC FILTERING</span>
          </div>

          <div className="rs-engine-title-grid">
            <h2 id="engine-title" className="rs-engine-heading">
              RaktaSetu doesn&apos;t broadcast a request to everyone. <br />
              It progressively narrows the donor pool.
            </h2>
            <div className="rs-engine-badge-wrap">
              <span className="rs-disclaimer-tag">CONCEPTUAL COORDINATION SEQUENCE</span>
              <span className="rs-disclaimer-sub">Illustrative matching flow</span>
            </div>
          </div>
        </div>

        {/* Spatial Network System Canvas (No simple cards - the network is the system) */}
        <div className="rs-engine-interactive-system">
          {/* Top Telemetry Strip */}
          <div className="rs-engine-telemetry">
            <div className="rs-telemetry-item">
              <span className="rs-telemetry-num">0{currentStep}</span>
              <div className="rs-telemetry-text">
                <strong className="rs-telemetry-title">{activeStage.name}</strong>
                <span className="rs-telemetry-sub">{activeStage.sublabel}</span>
              </div>
            </div>

            <div className="rs-telemetry-count-pill">
              <span className="rs-count-live">{activeStage.count}</span>
              <span className="rs-count-total">/ 47 Candidates Remaining</span>
            </div>
          </div>

          {/* Large SVG Spatial Network */}
          <div className="rs-engine-canvas-shell">
            <svg
              viewBox="0 0 800 460"
              className="rs-engine-svg"
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label={`Coordination network at Stage 0${currentStep} with ${activeStage.count} active donors`}
            >
              {/* Coordinate Grid Lines */}
              <g className="rs-engine-grid" stroke="currentColor" strokeWidth="0.5" opacity="0.1">
                <line x1="200" y1="0" x2="200" y2="460" />
                <line x1="400" y1="0" x2="400" y2="460" />
                <line x1="600" y1="0" x2="600" y2="460" />
                <line x1="0" y1="115" x2="800" y2="115" />
                <line x1="0" y1="230" x2="800" y2="230" />
                <line x1="0" y1="345" x2="800" y2="345" />
                {/* 15km Proximity Boundary Ring */}
                <circle
                  cx={FACILITY_X}
                  cy={FACILITY_Y}
                  r="150"
                  fill="none"
                  strokeDasharray="4 4"
                  className={`rs-proximity-boundary ${
                    currentStep >= 3 ? "rs-proximity-boundary--active" : ""
                  }`}
                />
              </g>

              {/* Connection Lines from Request Facility */}
              <g className="rs-engine-lines">
                {ENGINE_NODES.map((node) => {
                  const isAlive = node.eliminatedAtStep > currentStep;
                  if (!isAlive) return null;

                  const isMatched = node.id === 1 && currentStep === 6;
                  const isContacted = node.eliminatedAtStep >= 6 && currentStep >= 5;

                  return (
                    <line
                      key={`eng-line-${node.id}`}
                      x1={FACILITY_X}
                      y1={FACILITY_Y}
                      x2={node.x}
                      y2={node.y}
                      className={`rs-engine-line ${
                        isMatched
                          ? "rs-engine-line--matched"
                          : isContacted
                          ? "rs-engine-line--contacted"
                          : "rs-engine-line--candidate"
                      }`}
                      strokeWidth={isMatched ? 2 : isContacted ? 1.5 : 0.75}
                    />
                  );
                })}
              </g>

              {/* Donor Nodes */}
              <g className="rs-engine-nodes">
                {ENGINE_NODES.map((node) => {
                  const isAlive = node.eliminatedAtStep > currentStep;
                  const isMatched = node.id === 1 && currentStep === 6;
                  const isContacted = node.eliminatedAtStep >= 6 && currentStep >= 5;
                  const r = isMatched ? 7 : isContacted ? 5 : isAlive ? 3.5 : 2;

                  return (
                    <g
                      key={`eng-node-${node.id}`}
                      className={`rs-engine-node-group ${
                        isMatched
                          ? "rs-engine-node--matched"
                          : isAlive
                          ? "rs-engine-node--alive"
                          : "rs-engine-node--eliminated"
                      }`}
                    >
                      {/* Outer ring for matched or contacted node */}
                      {(isMatched || isContacted) && (
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={r * 2.5}
                          className="rs-engine-node-ring"
                          fill="none"
                          strokeWidth="1"
                        />
                      )}

                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={r}
                        className="rs-engine-node-dot"
                      />

                      {/* Monospace group label for alive nodes in later steps */}
                      {(isMatched || (isAlive && currentStep >= 4)) && (
                        <text
                          x={node.x}
                          y={node.y - r - 6}
                          textAnchor="middle"
                          className="rs-engine-node-label"
                        >
                          {node.group}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>

              {/* Central Request Facility */}
              <g className="rs-engine-facility">
                <circle
                  cx={FACILITY_X}
                  cy={FACILITY_Y}
                  r="22"
                  className="rs-engine-fac-halo"
                  fill="none"
                  strokeWidth="1"
                />
                <circle
                  cx={FACILITY_X}
                  cy={FACILITY_Y}
                  r="7"
                  className="rs-engine-fac-core"
                />
                <circle
                  cx={FACILITY_X}
                  cy={FACILITY_Y}
                  r="2.5"
                  className="rs-engine-fac-inner"
                />
                <g className="rs-engine-fac-tag">
                  <rect
                    x={FACILITY_X - 65}
                    y={FACILITY_Y + 18}
                    width="130"
                    height="22"
                    rx="4"
                    className="rs-engine-fac-tag-bg"
                  />
                  <text
                    x={FACILITY_X}
                    y={FACILITY_Y + 33}
                    textAnchor="middle"
                    className="rs-engine-fac-tag-text"
                  >
                    REQUEST: B+ (2 UNITS)
                  </text>
                </g>
              </g>
            </svg>
          </div>

          {/* Interactive Stepper Navigation (Scrubber) */}
          <div className="rs-engine-scrubber-bar">
            <div className="rs-scrubber-steps" role="tablist" aria-label="Coordination filtering sequence">
              {STAGES.map((stg) => {
                const isSelected = stg.step === currentStep;
                const isPassed = stg.step < currentStep;

                return (
                  <button
                    key={stg.step}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    className={`rs-scrubber-btn ${
                      isSelected ? "rs-scrubber-btn--active" : isPassed ? "rs-scrubber-btn--passed" : ""
                    }`}
                    onClick={() => setCurrentStep(stg.step)}
                  >
                    <span className="rs-scrubber-dot" />
                    <span className="rs-scrubber-step-num">0{stg.step}</span>
                    <span className="rs-scrubber-name">{stg.name}</span>
                    <span className="rs-scrubber-count">({stg.count})</span>
                  </button>
                );
              })}
            </div>

            <div className="rs-scrubber-nav-arrows">
              <button
                type="button"
                className="rs-scrubber-arrow-btn"
                disabled={currentStep === 0}
                onClick={handlePrev}
                aria-label="Previous filter stage"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                className="rs-scrubber-arrow-btn"
                disabled={currentStep === STAGES.length - 1}
                onClick={handleNext}
                aria-label="Next filter stage"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Stage Context Explanation (Detailed, Technical, Precise) */}
          <div className="rs-engine-stage-brief" aria-live="polite">
            <div className="rs-brief-col">
              <span className="rs-brief-kicker">STAGE CONSTRAINT</span>
              <p className="rs-brief-text">{activeStage.criterion}</p>
            </div>
            <div className="rs-brief-sep" aria-hidden="true" />
            <div className="rs-brief-col">
              <span className="rs-brief-kicker">ENGINE RESOLUTION</span>
              <p className="rs-brief-text">{activeStage.systemAction}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
