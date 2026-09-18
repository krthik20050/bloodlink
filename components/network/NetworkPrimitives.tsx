import React from "react";

export type NodeState = "idle" | "candidate" | "active" | "filtered" | "dimmed" | "matched" | "facility";

export interface NetworkNodeProps {
  id: string | number;
  cx: number;
  cy: number;
  r?: number;
  state?: NodeState;
  label?: string;
  sublabel?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * Technical SVG Network Node primitive for RaktaSetu coordination visualizations.
 * Represents a donor node, request facility, or algorithmic filter point.
 */
export const NetworkNode: React.FC<NetworkNodeProps> = ({
  id,
  cx,
  cy,
  r = 4.5,
  state = "idle",
  label,
  sublabel,
  onClick,
  className = "",
}) => {
  const isFacility = state === "facility";
  const isMatched = state === "matched";
  const isActive = state === "active";
  const isDimmed = state === "dimmed" || state === "filtered";

  return (
    <g
      className={`rs-net-node rs-net-node--${state} ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
      aria-label={label ? `${label} (${state})` : `Node ${id}`}
    >
      {/* Outer halo / ring for active or matched nodes */}
      {(isFacility || isMatched || isActive) && (
        <circle
          cx={cx}
          cy={cy}
          r={r * 2.4}
          className="rs-net-node-ring"
          fill="none"
          strokeWidth={1}
        />
      )}

      {/* Main node core */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        className="rs-net-node-core"
      />

      {/* Optional center dot */}
      {(isFacility || isMatched) && (
        <circle
          cx={cx}
          cy={cy}
          r={r * 0.4}
          className="rs-net-node-inner"
        />
      )}

      {/* Node label */}
      {label && (
        <text
          x={cx}
          y={cy + r * 2.8 + 4}
          textAnchor="middle"
          className="rs-net-node-text"
        >
          {label}
        </text>
      )}

      {/* Optional sublabel */}
      {sublabel && (
        <text
          x={cx}
          y={cy + r * 2.8 + 14}
          textAnchor="middle"
          className="rs-net-node-subtext"
        >
          {sublabel}
        </text>
      )}
    </g>
  );
};

export interface NetworkLineProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  state?: "idle" | "active" | "dimmed" | "matched" | "wire";
  dashed?: boolean;
  className?: string;
}

/**
 * Technical SVG Network Line primitive.
 * Represents logistical relationships, proximity connections, or transit channels.
 */
export const NetworkLine: React.FC<NetworkLineProps> = ({
  x1,
  y1,
  x2,
  y2,
  state = "idle",
  dashed = false,
  className = "",
}) => {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      strokeDasharray={dashed ? "3 3" : undefined}
      className={`rs-net-line rs-net-line--${state} ${className}`}
    />
  );
};

export interface SignalProps {
  status?: "live" | "evaluating" | "ready" | "settled";
  label?: string;
  className?: string;
}

/**
 * Precision Signal indicator for system telemetry.
 */
export const Signal: React.FC<SignalProps> = ({
  status = "ready",
  label,
  className = "",
}) => {
  return (
    <span className={`rs-signal rs-signal--${status} ${className}`}>
      <span className="rs-signal-dot" aria-hidden="true" />
      {label && <span className="rs-signal-label">{label}</span>}
    </span>
  );
};
