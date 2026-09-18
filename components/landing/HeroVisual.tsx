"use client";

import React, { useState, useEffect } from "react";
import { Check, ArrowDown, Activity, ShieldCheck, MapPin, Bell } from "lucide-react";

interface NodeStage {
  id: string;
  name: string;
  metric: string;
  detail: string;
  activeColor: string;
}

const STAGES: NodeStage[] = [
  {
    id: "req",
    name: "Emergency Request",
    metric: "B+ Negative / Whole Blood",
    detail: "Hospital: 12.8km transit radius",
    activeColor: "#752B36",
  },
  {
    id: "comp",
    name: "Immunological Gate",
    metric: "ABO & Rh Matrix Match",
    detail: "Non-compatible red cell types rejected",
    activeColor: "#752B36",
  },
  {
    id: "elig",
    name: "Biological Interval",
    metric: "90-Day Safe Cooldown",
    detail: "Active cooldown donors shielded",
    activeColor: "#667568",
  },
  {
    id: "dist",
    name: "Spatial Boundary",
    metric: "Transit Radius <= 15km",
    detail: "Out-of-range candidates spared",
    activeColor: "#667568",
  },
  {
    id: "disp",
    name: "Focused Dispatch",
    metric: "1-to-1 Private Alert",
    detail: "Zero broadcast · Zero contact leakage",
    activeColor: "#15191B",
  },
];

export const HeroVisual: React.FC = () => {
  const [activeStage, setActiveStage] = useState(0);

  // Gentle progression through the coordination stages
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStage((prev) => (prev + 1) % STAGES.length);
    }, 3400);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="rs-hero-visual" aria-label="RaktaSetu Coordination Pipeline Visualization">
      <div className="rs-visual-glass">
        <div className="rs-visual-top">
          <div className="rs-visual-chip">
            <span className="rs-live-dot" />
            <span className="rs-visual-chip-label">SYSTEM TELEMETRY</span>
          </div>
          <span className="rs-visual-metric">PIPELINE VERIFIED</span>
        </div>

        {/* The Vertical Circuit / Node Pipeline */}
        <div className="rs-circuit-track">
          {STAGES.map((stage, idx) => {
            const isPassed = idx < activeStage;
            const isCurrent = idx === activeStage;

            return (
              <div
                key={stage.id}
                className={`rs-circuit-node ${
                  isCurrent ? "rs-circuit-node--current" : isPassed ? "rs-circuit-node--passed" : ""
                }`}
                onClick={() => setActiveStage(idx)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveStage(idx);
                  }
                }}
              >
                <div className="rs-circuit-axis">
                  <div className="rs-circuit-point">
                    {isPassed ? (
                      <Check size={11} strokeWidth={3} className="rs-point-icon" />
                    ) : (
                      <span className="rs-point-inner" />
                    )}
                  </div>
                  {idx < STAGES.length - 1 && (
                    <div
                      className={`rs-circuit-stem ${
                        idx < activeStage ? "rs-circuit-stem--active" : ""
                      }`}
                    />
                  )}
                </div>

                <div className="rs-circuit-body">
                  <div className="rs-circuit-head">
                    <span className="rs-circuit-title">{stage.name}</span>
                    <span className="rs-circuit-code">0{idx + 1}</span>
                  </div>
                  <div className="rs-circuit-metric">{stage.metric}</div>
                  <div className="rs-circuit-detail">{stage.detail}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Status Bar */}
        <div className="rs-visual-bottom">
          <div className="rs-visual-stat">
            <span className="rs-stat-k">Dispatch Mode</span>
            <span className="rs-stat-v">Single Targeted Alert</span>
          </div>
          <div className="rs-visual-stat">
            <span className="rs-stat-k">Privacy Level</span>
            <span className="rs-stat-v rs-stat-v--secure">Protected</span>
          </div>
        </div>
      </div>
    </div>
  );
};
