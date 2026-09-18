"use client";

import React, { useState, useEffect, useRef } from "react";
import { RotateCcw } from "lucide-react";

interface NodeData {
  id: number;
  x: number;
  y: number;
  group: string;
  isCompatible: boolean;
  isEligible: boolean;
  isPriority: boolean;
  isMatch: boolean;
}

// 47 Deterministic nodes in an 840x360 coordinate space
// Centered around hospital facility at (420, 180)
const RAW_NODES: NodeData[] = [
  // The Resolved Match (Node 1)
  { id: 1, x: 550, y: 150, group: "B+", isCompatible: true, isEligible: true, isPriority: true, isMatch: true },
  // Priority wave candidates
  { id: 2, x: 340, y: 120, group: "O+", isCompatible: true, isEligible: true, isPriority: true, isMatch: false },
  { id: 3, x: 490, y: 250, group: "B+", isCompatible: true, isEligible: true, isPriority: true, isMatch: false },
  // Compatible & eligible (near)
  { id: 4, x: 280, y: 160, group: "B-", isCompatible: true, isEligible: true, isPriority: false, isMatch: false },
  { id: 5, x: 420, y: 85, group: "O-", isCompatible: true, isEligible: true, isPriority: false, isMatch: false },
  { id: 6, x: 580, y: 220, group: "B+", isCompatible: true, isEligible: true, isPriority: false, isMatch: false },
  { id: 7, x: 320, y: 245, group: "O+", isCompatible: true, isEligible: true, isPriority: false, isMatch: false },
  { id: 8, x: 480, y: 100, group: "B+", isCompatible: true, isEligible: true, isPriority: false, isMatch: false },
  { id: 9, x: 370, y: 270, group: "O-", isCompatible: true, isEligible: true, isPriority: false, isMatch: false },
  // Compatible but in cooldown (screened out at eligibility)
  { id: 10, x: 230, y: 110, group: "B+", isCompatible: true, isEligible: false, isPriority: false, isMatch: false },
  { id: 11, x: 630, y: 125, group: "O+", isCompatible: true, isEligible: false, isPriority: false, isMatch: false },
  { id: 12, x: 420, y: 300, group: "B+", isCompatible: true, isEligible: false, isPriority: false, isMatch: false },
  { id: 13, x: 260, y: 220, group: "O+", isCompatible: true, isEligible: false, isPriority: false, isMatch: false },
  { id: 14, x: 560, y: 290, group: "B-", isCompatible: true, isEligible: false, isPriority: false, isMatch: false },
  { id: 15, x: 360, y: 60, group: "O-", isCompatible: true, isEligible: false, isPriority: false, isMatch: false },
  { id: 16, x: 520, y: 70, group: "B+", isCompatible: true, isEligible: false, isPriority: false, isMatch: false },
  { id: 17, x: 200, y: 175, group: "O+", isCompatible: true, isEligible: false, isPriority: false, isMatch: false },
  // Incompatible ABO/Rh (screened out at compatibility)
  { id: 18, x: 160, y: 80, group: "A+", isCompatible: false, isEligible: true, isPriority: false, isMatch: false },
  { id: 19, x: 680, y: 85, group: "AB+", isCompatible: false, isEligible: true, isPriority: false, isMatch: false },
  { id: 20, x: 150, y: 240, group: "A-", isCompatible: false, isEligible: true, isPriority: false, isMatch: false },
  { id: 21, x: 690, y: 230, group: "AB-", isCompatible: false, isEligible: true, isPriority: false, isMatch: false },
  { id: 22, x: 300, y: 35, group: "A+", isCompatible: false, isEligible: true, isPriority: false, isMatch: false },
  { id: 23, x: 540, y: 30, group: "A+", isCompatible: false, isEligible: true, isPriority: false, isMatch: false },
  { id: 24, x: 650, y: 180, group: "AB+", isCompatible: false, isEligible: true, isPriority: false, isMatch: false },
  { id: 25, x: 190, y: 300, group: "A-", isCompatible: false, isEligible: true, isPriority: false, isMatch: false },
  { id: 26, x: 660, y: 300, group: "A+", isCompatible: false, isEligible: true, isPriority: false, isMatch: false },
  { id: 27, x: 110, y: 140, group: "AB+", isCompatible: false, isEligible: true, isPriority: false, isMatch: false },
  { id: 28, x: 740, y: 140, group: "A+", isCompatible: false, isEligible: true, isPriority: false, isMatch: false },
  { id: 29, x: 240, y: 330, group: "AB-", isCompatible: false, isEligible: true, isPriority: false, isMatch: false },
  { id: 30, x: 600, y: 345, group: "A+", isCompatible: false, isEligible: true, isPriority: false, isMatch: false },
  { id: 31, x: 460, y: 345, group: "A-", isCompatible: false, isEligible: true, isPriority: false, isMatch: false },
  { id: 32, x: 380, y: 20, group: "AB+", isCompatible: false, isEligible: true, isPriority: false, isMatch: false },
  { id: 33, x: 90, y: 70, group: "A+", isCompatible: false, isEligible: false, isPriority: false, isMatch: false },
  { id: 34, x: 760, y: 75, group: "A-", isCompatible: false, isEligible: false, isPriority: false, isMatch: false },
  { id: 35, x: 75, y: 220, group: "AB+", isCompatible: false, isEligible: false, isPriority: false, isMatch: false },
  { id: 36, x: 770, y: 240, group: "A+", isCompatible: false, isEligible: false, isPriority: false, isMatch: false },
  { id: 37, x: 150, y: 345, group: "A+", isCompatible: false, isEligible: false, isPriority: false, isMatch: false },
  { id: 38, x: 710, y: 345, group: "AB-", isCompatible: false, isEligible: false, isPriority: false, isMatch: false },
  { id: 39, x: 210, y: 35, group: "A-", isCompatible: false, isEligible: false, isPriority: false, isMatch: false },
  { id: 40, x: 620, y: 25, group: "A+", isCompatible: false, isEligible: false, isPriority: false, isMatch: false },
  { id: 41, x: 50, y: 130, group: "A+", isCompatible: false, isEligible: false, isPriority: false, isMatch: false },
  { id: 42, x: 800, y: 175, group: "AB+", isCompatible: false, isEligible: false, isPriority: false, isMatch: false },
  { id: 43, x: 95, y: 290, group: "A+", isCompatible: false, isEligible: false, isPriority: false, isMatch: false },
  { id: 44, x: 750, y: 310, group: "A-", isCompatible: false, isEligible: false, isPriority: false, isMatch: false },
  { id: 45, x: 290, y: 355, group: "AB+", isCompatible: false, isEligible: false, isPriority: false, isMatch: false },
  { id: 46, x: 530, y: 355, group: "A+", isCompatible: false, isEligible: false, isPriority: false, isMatch: false },
  { id: 47, x: 420, y: 355, group: "A+", isCompatible: false, isEligible: false, isPriority: false, isMatch: false },
];

const FACILITY_X = 420;
const FACILITY_Y = 180;

export const HeroNetwork: React.FC = () => {
  const [phase, setPhase] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout[]>([]);

  const startSequence = () => {
    timerRef.current.forEach(clearTimeout);
    timerRef.current = [];

    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase(5);
      return;
    }

    setPhase(0);

    const t1 = setTimeout(() => setPhase(1), 300);  // Request appears
    const t2 = setTimeout(() => setPhase(2), 750);  // Connections establish
    const t3 = setTimeout(() => setPhase(3), 1350); // Filtering occurs
    const t4 = setTimeout(() => setPhase(4), 2000); // Priority candidates highlight
    const t5 = setTimeout(() => setPhase(5), 2650); // System settles and permanently stops

    timerRef.current = [t1, t2, t3, t4, t5];
  };

  useEffect(() => {
    startSequence();
    return () => {
      timerRef.current.forEach(clearTimeout);
    };
  }, []);

  const getStatusText = () => {
    switch (phase) {
      case 0:
        return "Scanning network (47 regional nodes)...";
      case 1:
        return "Urgent request registered at hospital facility...";
      case 2:
        return "Evaluating immunological compatibility...";
      case 3:
        return "Enforcing biological interval & proximity gates...";
      case 4:
        return "Discreet notification queued (3 priority candidates)...";
      case 5:
      default:
        return "System settled: Verified connection resolved.";
    }
  };

  return (
    <div className="rs-hero-network-space" aria-label="Interactive donor network visualization">
      {/* Network Telemetry Header Line */}
      <div className="rs-net-space-header">
        <div className="rs-net-space-status">
          <span
            className={`rs-net-status-dot ${
              phase === 5 ? "rs-net-status-dot--settled" : "rs-net-status-dot--active"
            }`}
            aria-hidden="true"
          />
          <span className="rs-net-status-text">{getStatusText()}</span>
        </div>

        <div className="rs-net-space-actions">
          <span className="rs-mono-tag rs-mono-tag--small">47 DONORS IN NETWORK</span>
          <button
            type="button"
            className="rs-net-replay-link"
            onClick={startSequence}
            title="Replay coordination sequence"
            aria-label="Replay coordination sequence"
          >
            <RotateCcw size={11} />
            <span>Replay</span>
          </button>
        </div>
      </div>

      {/* Open SVG Spatial Network Canvas */}
      <div className="rs-hero-network-viewport">
        <svg
          viewBox="0 0 840 360"
          className="rs-hero-network-svg"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Network showing blood request connecting to verified donor"
        >
          {/* Subtle Grid and Range Ticks */}
          <g className="rs-net-gridlines" stroke="currentColor" strokeWidth="0.5" opacity="0.08">
            <line x1="210" y1="0" x2="210" y2="360" />
            <line x1="420" y1="0" x2="420" y2="360" />
            <line x1="630" y1="0" x2="630" y2="360" />
            <line x1="0" y1="90" x2="840" y2="90" />
            <line x1="0" y1="180" x2="840" y2="180" />
            <line x1="0" y1="270" x2="840" y2="270" />
            {/* Proximity rings around facility */}
            <circle cx={FACILITY_X} cy={FACILITY_Y} r="85" fill="none" strokeDasharray="3 3" />
            <circle cx={FACILITY_X} cy={FACILITY_Y} r="170" fill="none" strokeDasharray="3 3" opacity="0.6" />
          </g>

          {/* Connection Lines */}
          <g className="rs-net-lines">
            {RAW_NODES.map((node) => {
              if (phase < 2) return null;
              if (phase >= 3 && (!node.isCompatible || !node.isEligible)) return null;
              if (phase >= 4 && !node.isPriority) return null;
              if (phase >= 5 && !node.isMatch) return null;

              const isMatch = node.isMatch;
              const isPriority = node.isPriority;

              return (
                <line
                  key={`line-${node.id}`}
                  x1={FACILITY_X}
                  y1={FACILITY_Y}
                  x2={node.x}
                  y2={node.y}
                  className={`rs-net-line ${
                    isMatch && phase >= 5
                      ? "rs-net-line--match"
                      : isPriority && phase >= 4
                      ? "rs-net-line--priority"
                      : "rs-net-line--evaluating"
                  }`}
                  strokeWidth={isMatch && phase >= 5 ? 1.75 : 1}
                />
              );
            })}
          </g>

          {/* 47 Donor Nodes */}
          <g className="rs-net-nodes">
            {RAW_NODES.map((node) => {
              let state: "idle" | "dimmed" | "candidate" | "active" | "matched" = "idle";

              if (phase === 0) {
                state = "idle";
              } else if (phase === 1 || phase === 2) {
                state = "candidate";
              } else if (phase === 3) {
                state = !node.isCompatible || !node.isEligible ? "dimmed" : "candidate";
              } else if (phase === 4) {
                if (node.isPriority) state = "active";
                else if (node.isCompatible && node.isEligible) state = "candidate";
                else state = "dimmed";
              } else if (phase >= 5) {
                if (node.isMatch) state = "matched";
                else if (node.isPriority) state = "candidate";
                else state = "dimmed";
              }

              const r = node.isMatch && phase >= 5 ? 6 : node.isPriority && phase >= 4 ? 4.5 : 3;

              return (
                <g key={`node-${node.id}`} className={`rs-net-node-item rs-net-node-item--${state}`}>
                  {/* Subtle outer halo for resolved match */}
                  {node.isMatch && phase >= 5 && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="14"
                      className="rs-match-halo"
                      fill="none"
                      strokeWidth="1"
                    />
                  )}

                  <circle cx={node.x} cy={node.y} r={r} className="rs-node-dot" />

                  {/* Node label only for match */}
                  {node.isMatch && phase >= 5 && (
                    <g className="rs-node-tag-group">
                      <rect
                        x={node.x + 12}
                        y={node.y - 14}
                        width="92"
                        height="26"
                        rx="4"
                        className="rs-node-tag-bg"
                      />
                      <text x={node.x + 20} y={node.y + 3} className="rs-node-tag-text">
                        DONOR · {node.group} (3.2km)
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>

          {/* Central Facility Request Point */}
          {phase >= 1 && (
            <g className="rs-net-facility-group">
              <circle
                cx={FACILITY_X}
                cy={FACILITY_Y}
                r="18"
                className="rs-facility-ring"
                fill="none"
                strokeWidth="1"
              />
              <circle cx={FACILITY_X} cy={FACILITY_Y} r="6" className="rs-facility-dot" />
              <circle cx={FACILITY_X} cy={FACILITY_Y} r="2" className="rs-facility-inner" />

              <g className="rs-facility-badge">
                <rect
                  x={FACILITY_X - 65}
                  y={FACILITY_Y + 16}
                  width="130"
                  height="24"
                  rx="4"
                  className="rs-facility-badge-bg"
                />
                <text
                  x={FACILITY_X}
                  y={FACILITY_Y + 32}
                  textAnchor="middle"
                  className="rs-facility-badge-text"
                >
                  REQUEST: B+ (2 UNITS)
                </text>
              </g>
            </g>
          )}
        </svg>
      </div>

      {/* Network Bottom Telemetry Line */}
      <div className="rs-net-space-footer">
        <span className="rs-net-space-note">
          47 candidate nodes evaluated &middot; ABO/Rh compatible &middot; 90-day cooldown verified &middot; Closed-loop connect
        </span>
        <span className="rs-net-space-tag">CONCEPTUAL COORDINATION SEQUENCE</span>
      </div>
    </div>
  );
};
