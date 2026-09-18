"use client";

import React, { useState, useEffect } from "react";

interface NodePoint {
  id: number;
  cx: number;
  cy: number;
  r: number;
  isAccent?: boolean;
  isActivePath?: boolean;
}

// 400x400 coordinate space
// Central Request Node at (200, 200)
const CENTER_X = 200;
const CENTER_Y = 200;

// 7 Minimal Geometrically Balanced Nodes
const DONOR_NODES: NodePoint[] = [
  { id: 1, cx: 200, cy: 70, r: 4.5 },
  { id: 2, cx: 310, cy: 120, r: 4 },
  { id: 3, cx: 325, cy: 260, r: 4.5 },
  // Active resolved donor (Accent Rakta #8F2638)
  { id: 4, cx: 240, cy: 325, r: 5.5, isAccent: true, isActivePath: true },
  { id: 5, cx: 120, cy: 300, r: 4 },
  { id: 6, cx: 75, cy: 190, r: 4.5 },
  { id: 7, cx: 110, cy: 100, r: 4 },
];

export const HeroMark: React.FC = () => {
  const [phase, setPhase] = useState<number>(0);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase(4);
      return;
    }

    const t1 = setTimeout(() => setPhase(1), 80);
    const t2 = setTimeout(() => setPhase(2), 380);
    const t3 = setTimeout(() => setPhase(3), 800);
    const t4 = setTimeout(() => setPhase(4), 1250);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  return (
    <div className="rs-hero-mark" aria-hidden="true">
      <svg
        viewBox="0 0 400 400"
        className="rs-hero-mark-svg"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Subtle Orbit Reference Ring */}
        <circle
          cx={CENTER_X}
          cy={CENTER_Y}
          r="130"
          stroke="#EAEAE6"
          strokeWidth="1"
          strokeDasharray="2 3"
        />

        {/* Connection Lines */}
        <g className="rs-mark-lines">
          {DONOR_NODES.map((node) => {
            const isActive = node.isActivePath && phase >= 4;
            const isVisible = phase >= 2;

            return (
              <line
                key={`line-${node.id}`}
                x1={CENTER_X}
                y1={CENTER_Y}
                x2={node.cx}
                y2={node.cy}
                stroke={isActive ? "var(--rs-accent, #8F2638)" : "#E1E1DE"}
                strokeWidth={isActive ? 1.5 : 1}
                strokeOpacity={isVisible ? (isActive ? 1 : 0.75) : 0}
                style={{
                  transition: "stroke-opacity 400ms ease, stroke 300ms ease",
                }}
              />
            );
          })}

          {/* Perimeter line segment */}
          <line
            x1={DONOR_NODES[0].cx}
            y1={DONOR_NODES[0].cy}
            x2={DONOR_NODES[1].cx}
            y2={DONOR_NODES[1].cy}
            stroke="#EFEFEA"
            strokeWidth="0.75"
            strokeOpacity={phase >= 2 ? 0.6 : 0}
          />
          <line
            x1={DONOR_NODES[5].cx}
            y1={DONOR_NODES[5].cy}
            x2={DONOR_NODES[6].cx}
            y2={DONOR_NODES[6].cy}
            stroke="#EFEFEA"
            strokeWidth="0.75"
            strokeOpacity={phase >= 2 ? 0.6 : 0}
          />
        </g>

        {/* Surrounding Donor Nodes */}
        <g className="rs-mark-donors">
          {DONOR_NODES.map((node) => {
            const isVisible = phase >= 1;
            const isResolved = node.isAccent && phase >= 4;

            return (
              <g
                key={`node-${node.id}`}
                opacity={isVisible ? 1 : 0}
                style={{ transition: "opacity 350ms ease" }}
              >
                {/* Accent halo for resolved donor */}
                {isResolved && (
                  <circle
                    cx={node.cx}
                    cy={node.cy}
                    r={node.r + 4}
                    stroke="var(--rs-accent, #8F2638)"
                    strokeWidth="1"
                    strokeOpacity="0.35"
                  />
                )}
                <circle
                  cx={node.cx}
                  cy={node.cy}
                  r={node.r}
                  fill={isResolved ? "var(--rs-accent, #8F2638)" : "#FFFFFF"}
                  stroke={isResolved ? "var(--rs-accent, #8F2638)" : "#171717"}
                  strokeWidth={isResolved ? 1.5 : 1.25}
                />
              </g>
            );
          })}
        </g>

        {/* Central Request Node */}
        {phase >= 3 && (
          <g className="rs-mark-center">
            {/* Subtle outer halo */}
            <circle
              cx={CENTER_X}
              cy={CENTER_Y}
              r="14"
              stroke="#171717"
              strokeWidth="1"
              strokeOpacity="0.15"
            />
            {/* Main request node */}
            <circle
              cx={CENTER_X}
              cy={CENTER_Y}
              r="6.5"
              fill="#171717"
            />
            {/* Center dot */}
            <circle
              cx={CENTER_X}
              cy={CENTER_Y}
              r="2"
              fill="#FFFFFF"
            />
          </g>
        )}
      </svg>
    </div>
  );
};
