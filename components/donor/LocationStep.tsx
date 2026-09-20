import React, { useState } from "react";

interface LocationCoords {
  latitude: number;
  longitude: number;
}

interface LocationStepProps {
  location: LocationCoords | null;
  onLocationChange: (loc: LocationCoords | null) => void;
  error?: string;
  telegramLink?: string;
}

type LocState = "idle" | "requesting" | "ready" | "denied" | "error";

export const LocationStep: React.FC<LocationStepProps> = ({
  location,
  onLocationChange,
  error,
  telegramLink,
}) => {
  const [state, setState] = useState<LocState>(location ? "ready" : "idle");

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setState("error");
      return;
    }

    setState("requesting");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onLocationChange({
          latitude: Number(position.coords.latitude.toFixed(4)),
          longitude: Number(position.coords.longitude.toFixed(4)),
        });
        setState("ready");
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setState("denied");
        } else {
          setState("error");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="rs-donor-step-content">
      <h3 className="rs-step-heading">Where can you help?</h3>
      <p className="rs-step-body">
        Your approximate location helps RaktaSetu find relevant nearby requests.
      </p>

      <div className="rs-location-action-area">
        {state === "ready" ? (
          <div className="rs-location-status-row">
            <span className="rs-loc-pill rs-loc-pill--ready">Location available</span>
            <button
              type="button"
              className="rs-link-action"
              onClick={handleGetLocation}
            >
              Update location
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="rs-btn-secondary"
            onClick={handleGetLocation}
            disabled={state === "requesting"}
          >
            {state === "requesting"
              ? "Getting location…"
              : state === "denied"
              ? "Location permission needed - Try again"
              : state === "error"
              ? "Couldn't access your location - Try again"
              : "Use my location"}
          </button>
        )}
      </div>

      {error && <span className="rs-field-error">{error}</span>}
      {telegramLink && (
        <p className="rs-form-helper" style={{ display: "flex", flexWrap: "wrap", minWidth: 0, maxWidth: 320 }}>
          <a
            href={telegramLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", minHeight: 44, paddingTop: 12, paddingBottom: 12 }}
          >
            or share location in chat instead — then return to complete
          </a>
          <span>&nbsp;(location here is still required to continue)</span>
        </p>
      )}
    </div>
  );
};
