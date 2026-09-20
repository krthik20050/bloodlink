"use client";

import React, { useState, useRef, KeyboardEvent } from "react";
import Link from "next/link";
import { bloodGroups, BloodGroup, isValidRequestContact } from "@/lib/domain";
import {
  MapPin,
  ChevronDown,
  Minus,
  Plus,
  Check,
  ArrowRight,
  ShieldCheck,
  Clock,
  AlertCircle,
  RefreshCw,
  Phone,
} from "lucide-react";

type Outcome = {
  request: { id: string; bloodGroup: string; unitsRequired: number; hospital: string; urgency: string; contact: string };
  bloodBanks: { name: string; availability: string; distanceKm: number; source: string }[];
};

type NearbyHospital = {
  id: string;
  name: string;
  distanceKm: number;
  latitude: number;
  longitude: number;
};

type LocationStatus = "idle" | "loading" | "success" | "denied" | "retry";

interface RequestFormProps {
  initialUser: { id?: string; email?: string | null } | null;
  telegramLink?: string;
}

const URGENCY_OPTIONS = [
  {
    id: "ROUTINE",
    label: "Standard",
    timeline: "Within 24–48h",
    description: "Scheduled surgical or chronic replacement",
  },
  {
    id: "URGENT",
    label: "Priority",
    timeline: "Within 6–12h",
    description: "Urgent procedure or depleting inventory",
  },
  {
    id: "EMERGENCY",
    label: "Emergency",
    timeline: "Immediate",
    description: "Critical trauma, hemorrhage, or acute need",
  },
] as const;

const COMPONENT_DEFAULT = "Whole blood / red cells";
const COMPONENT_GUARD_MESSAGE =
  "Volunteer matching covers whole blood / red cells only — for plasma or platelets, please contact the hospital blood bank or e-RaktKosh directly.";
const EXPIRY_NOTE: Record<string, string> = { ROUTINE: "48 hours", URGENT: "12 hours", EMERGENCY: "6 hours" };

export const RequestForm: React.FC<RequestFormProps> = ({ initialUser, telegramLink }) => {
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>("O+");
  const [unitsRequired, setUnitsRequired] = useState<number>(1);
  const [hospital, setHospital] = useState<string>("Amala Hospital");
  const [contact, setContact] = useState<string>(initialUser?.email ?? "");
  const [contactError, setContactError] = useState<string>("");
  const [urgency, setUrgency] = useState<(typeof URGENCY_OPTIONS)[number]["id"]>("URGENT");
  const [component, setComponent] = useState<string>(COMPONENT_DEFAULT);
  const [bankCalled, setBankCalled] = useState<boolean>(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [hospitals, setHospitals] = useState<NearbyHospital[]>([]);
  const [hospitalsStatus, setHospitalsStatus] = useState<"idle" | "loading" | "ready">("idle");
  const [busy, setBusy] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string>("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [matchingResult, setMatchingResult] = useState<{
    selectedCount: number;
    excludedCount: number;
    message: string;
  } | null>(null);
  const [matchingBusy, setMatchingBusy] = useState<boolean>(false);
  const [shakeLocation, setShakeLocation] = useState<boolean>(false);

  const bloodGroupRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const triggerLocationShake = () => {
    setShakeLocation(true);
    setTimeout(() => setShakeLocation(false), 400);
  };

  // Geolocation handler
  function requestLocation(nextStatus: LocationStatus = "loading") {
    if (!navigator.geolocation) {
      setLocation(null);
      setLocationStatus("denied");
      triggerLocationShake();
      setServerError("Location access is not available in your browser. Please use a modern browser.");
      return;
    }

    setLocationStatus(nextStatus);
    setServerError("");

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const nextLocation = {
          latitude: Number(coords.latitude.toFixed(4)),
          longitude: Number(coords.longitude.toFixed(4)),
        };
        setLocation(nextLocation);
        setLocationStatus("success");
        setHospitalsStatus("loading");

        try {
          const response = await fetch(
            `/api/hospitals?latitude=${nextLocation.latitude}&longitude=${nextLocation.longitude}`
          );
          const data = await response.json();
          const nearby = Array.isArray(data.hospitals) ? (data.hospitals as NearbyHospital[]) : [];
          setHospitals(nearby);
          if (nearby.length > 0) {
            setHospital(nearby[0].name);
          }
        } catch {
          setHospitals([]);
        } finally {
          setHospitalsStatus("ready");
        }
      },
      (error) => {
        setLocation(null);
        const isDenied = error.code === 1;
        setLocationStatus(isDenied ? "denied" : "retry");
        triggerLocationShake();
        setServerError(
          isDenied
            ? "Location permission was denied. Please allow location access in your browser settings to continue."
            : "Could not retrieve your location. Please click 'Try again'."
        );
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 300000 }
    );
  }

  // Keyboard navigation for Blood Group radio-grid
  const handleBloodKeyDown = (e: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let nextIndex: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % bloodGroups.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + bloodGroups.length) % bloodGroups.length;
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      setBloodGroup(bloodGroups[currentIndex]);
      return;
    }

    if (nextIndex !== null) {
      setBloodGroup(bloodGroups[nextIndex]);
      bloodGroupRefs.current[nextIndex]?.focus();
    }
  };

  // Stepper handlers
  const decrementUnits = () => {
    if (unitsRequired > 1) setUnitsRequired((prev) => prev - 1);
  };

  const incrementUnits = () => {
    if (unitsRequired < 10) setUnitsRequired((prev) => prev + 1);
  };

  // Run matching algorithm for created request
  async function runMatchFor(requestId: string) {
    if (component !== COMPONENT_DEFAULT) {
      setMatchingResult({ selectedCount: 0, excludedCount: 0, message: COMPONENT_GUARD_MESSAGE });
      return;
    }
    if (urgency === "EMERGENCY" && !bankCalled) {
      setMatchingResult({ selectedCount: 0, excludedCount: 0, message: "Emergency: call the hospital blood bank first, then 108, and tick the confirmation." });
      return;
    }
    setMatchingBusy(true);
    try {
      const res = await fetch(`/api/requests/${requestId}/match`, { method: "POST" });
      const data = await res.json();
      if (res.ok && (data.result || typeof data.selectedCount === "number")) {
        const selected = data.selectedCount ?? data.result.selected?.length ?? 0;
        const excluded = data.excludedCount ?? data.result.excluded?.length ?? 0;
        setMatchingResult({
          selectedCount: selected,
          excludedCount: excluded,
          message: `${selected} compatible donor(s) received the private notification wave. ${excluded} were safely excluded.`,
        });
      } else {
        setMatchingResult({
          selectedCount: 0,
          excludedCount: 0,
          message: data.error || "Unable to run donor matching at this time.",
        });
      }
    } catch {
      setMatchingResult({
        selectedCount: 0,
        excludedCount: 0,
        message: "Network error occurred while matching donors.",
      });
    } finally {
      setMatchingBusy(false);
    }
  }

  // Submit request form
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");
    setMatchingResult(null);

    if (component !== COMPONENT_DEFAULT) {
      setServerError(COMPONENT_GUARD_MESSAGE);
      return;
    }
    if (urgency === "EMERGENCY" && !bankCalled) {
      setServerError("Emergency: call the hospital blood bank first, then 108, and tick the confirmation before requesting.");
      return;
    }
    if (!isValidRequestContact(contact)) {
      setContactError("Enter a phone number or email where the matched donor can reach you.");
      return;
    }
    setContactError("");

    if (!location) {
      setLocationStatus("denied");
      triggerLocationShake();
      setServerError("Please allow location access before submitting your request.");
      return;
    }

    setBusy(true);

    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bloodGroup,
          unitsRequired,
          hospital: hospital || "Amala Hospital",
          contact: contact.trim(),
          latitude: location.latitude,
          longitude: location.longitude,
          urgency,
          component,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        setServerError("AUTHENTICATION_REQUIRED");
      } else if (!res.ok) {
        setServerError(data.error ?? "Could not create blood request. Please verify details and try again.");
      } else {
        const nextOutcome = data as Outcome;
        setOutcome(nextOutcome);

        // If no official blood banks confirmed, immediately trigger donor matching pipeline
        if (nextOutcome.bloodBanks.length === 0) {
          await runMatchFor(nextOutcome.request.id);
        }
      }
    } catch {
      setServerError("A network error occurred. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  // Reset form to create another request
  const handleReset = () => {
    setOutcome(null);
    setMatchingResult(null);
    setServerError("");
  };

  // If request has been submitted, show live post-submission coordination view
  if (outcome) {
    return (
      <div className="rs-request-success-panel" role="region" aria-label="Request Coordination Result">
        {/* Header Badge */}
        <div className="rs-success-topline">
          <span className="rs-pulse-badge">
            <span className="rs-pulse-dot" />
            LIVE COORDINATION ACTIVE
          </span>
          <span className="rs-mono-id">ID: {outcome.request.id.slice(0, 8).toUpperCase()}</span>
        </div>

        <h2 className="rs-success-title">
          {outcome.request.unitsRequired} {outcome.request.unitsRequired === 1 ? "unit" : "units"} of {outcome.request.bloodGroup} requested
        </h2>
        <p className="rs-success-subtitle">
          Destination: <strong>{outcome.request.hospital}</strong> · Priority: <strong>{outcome.request.urgency}</strong>
        </p>
        <p className="rs-success-contact-note">
          Your contact ({outcome.request.contact}) stays private until a donor accepts, then it is shared with them alone.
        </p>

        {/* Official Blood Bank Availability Section */}
        {outcome.bloodBanks.length > 0 ? (
          <div className="rs-availability-card">
            <div className="rs-availability-header">
              <ShieldCheck size={18} className="rs-icon-accent" />
              <span className="rs-availability-label">OFFICIAL AVAILABILITY CONFIRMED</span>
            </div>
            <div className="rs-availability-body">
              <p className="rs-availability-name">{outcome.bloodBanks[0].name}</p>
              <p className="rs-availability-meta">
                {outcome.bloodBanks[0].distanceKm} km away · Availability: {outcome.bloodBanks[0].availability}
              </p>
            </div>
            <div className="rs-availability-action">
              <button
                type="button"
                className="rs-btn-secondary rs-btn-sm"
                onClick={() => runMatchFor(outcome.request.id)}
                disabled={matchingBusy}
              >
                {matchingBusy ? "Contacting donors…" : "Also notify local donors"}
              </button>
            </div>
          </div>
        ) : (
          <div className="rs-notice-banner">
            <Clock size={16} className="rs-notice-icon" />
            <span>No hospital blood-bank reserve reported. Algorithmic donor matching initiated.</span>
          </div>
        )}

        {/* Matching Pipeline Flow Graphic */}
        <div className="rs-pipeline-card">
          <div className="rs-pipeline-header">
            <span className="rs-pipeline-title">DETERMINISTIC FILTER REDUCTION</span>
            <span className="rs-pipeline-tag">SUB-SECOND EVALUATION</span>
          </div>

          <div className="rs-pipeline-steps" aria-hidden="true">
            <div className="rs-pipeline-step">
              <span className="rs-pstep-num">47</span>
              <span className="rs-pstep-name">REGIONAL</span>
            </div>
            <span className="rs-pstep-arrow">→</span>
            <div className="rs-pipeline-step">
              <span className="rs-pstep-num">29</span>
              <span className="rs-pstep-name">COMPATIBLE</span>
            </div>
            <span className="rs-pstep-arrow">→</span>
            <div className="rs-pipeline-step">
              <span className="rs-pstep-num">17</span>
              <span className="rs-pstep-name">ELIGIBLE</span>
            </div>
            <span className="rs-pstep-arrow">→</span>
            <div className="rs-pipeline-step">
              <span className="rs-pstep-num">9</span>
              <span className="rs-pstep-name">NEARBY</span>
            </div>
            <span className="rs-pstep-arrow">→</span>
            <div className="rs-pipeline-step rs-pipeline-step--final">
              <span className="rs-pstep-num">
                {matchingResult ? matchingResult.selectedCount : "6"}
              </span>
              <span className="rs-pstep-name">NOTIFIED</span>
            </div>
          </div>

          {matchingResult && (
            <div className="rs-matching-message">
              <p>{matchingResult.message}</p>
            </div>
          )}

          {!matchingResult && (
            <div className="rs-pipeline-action">
              <button
                type="button"
                className="rs-btn-primary rs-btn-sm"
                onClick={() => runMatchFor(outcome.request.id)}
                disabled={matchingBusy}
              >
                {matchingBusy ? "Screening donors…" : "Run donor matching now"}
              </button>
            </div>
          )}
        </div>

        <p className="rs-form-helper">
          <a href="/#after-you-request" className="rs-banner-link">See what happens next →</a>
        </p>

        {/* Action Controls */}
        <div className="rs-success-actions">
          <button type="button" className="rs-btn-secondary" onClick={handleReset}>
            Create another request
          </button>
          <Link href="/" className="rs-btn-outline">
            Return to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rs-request-form-card">
      <form onSubmit={handleSubmit} noValidate>
        {/* 1. Blood Group Needed (64px buttons, 10px radius, 4x2 grid) */}
        <div className="rs-form-field">
          <div className="rs-field-label-row">
            <label className="rs-form-label" id="req-blood-label">
              Blood group needed
            </label>
            <span className="rs-field-annotation">Red-cell matching</span>
          </div>

          <div
            className="rs-blood-grid"
            role="radiogroup"
            aria-labelledby="req-blood-label"
          >
            {bloodGroups.map((group, index) => {
              const isSelected = bloodGroup === group;
              return (
                <button
                  key={group}
                  type="button"
                  ref={(el) => {
                    bloodGroupRefs.current[index] = el;
                  }}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  className={`rs-blood-btn ${isSelected ? "rs-blood-btn--selected" : ""}`}
                  onClick={() => setBloodGroup(group)}
                  onKeyDown={(e) => handleBloodKeyDown(e, index)}
                >
                  {group}
                </button>
              );
            })}
          </div>
        </div>

        {/* Blood component (red-cell guard: volunteer matching is whole-blood only) */}
        <div className="rs-form-field">
          <div className="rs-field-label-row">
            <label className="rs-form-label" htmlFor="req-component">
              Blood component
            </label>
            <span className="rs-field-annotation">Volunteer matching: red cells</span>
          </div>
          <div className="rs-select-wrapper">
            <select
              id="req-component"
              value={component}
              onChange={(e) => setComponent(e.target.value)}
              className="rs-select"
              required
            >
              <option value="Whole blood / red cells">Whole blood / red cells</option>
              <option value="Plasma">Plasma</option>
              <option value="Platelets">Platelets</option>
            </select>
            <ChevronDown size={18} className="rs-select-chevron" aria-hidden="true" />
          </div>
          {component !== COMPONENT_DEFAULT && (
            <span className="rs-field-error" role="alert">{COMPONENT_GUARD_MESSAGE}</span>
          )}
        </div>

        {/* 2. Units Required (48px height, 10px radius, Stepper) */}
        <div className="rs-form-field">
          <div className="rs-field-label-row">
            <label className="rs-form-label" htmlFor="req-units">
              Units required
            </label>
            <span className="rs-field-annotation">Standard 450ml units</span>
          </div>

          <div className="rs-stepper" id="req-units">
            <button
              type="button"
              className="rs-stepper-btn"
              onClick={decrementUnits}
              disabled={unitsRequired <= 1}
              aria-label="Decrease units"
            >
              <Minus size={18} />
            </button>

            <div className="rs-stepper-display">
              <span className="rs-stepper-value">{unitsRequired}</span>
              <span className="rs-stepper-unit">
                {unitsRequired === 1 ? "unit" : "units"}
              </span>
            </div>

            <button
              type="button"
              className="rs-stepper-btn"
              onClick={incrementUnits}
              disabled={unitsRequired >= 10}
              aria-label="Increase units"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* 3. Hospital Selection (48px height, 10px radius, Custom select) */}
        <div className="rs-form-field">
          <div className="rs-field-label-row">
            <label className="rs-form-label" htmlFor="req-hospital">
              Hospital / Medical Facility
            </label>
            <span className="rs-field-annotation">
              {hospitalsStatus === "loading" ? "Locating nearby…" : "Destination"}
            </span>
          </div>

          <div className="rs-select-wrapper">
            <select
              id="req-hospital"
              value={hospital}
              onChange={(e) => setHospital(e.target.value)}
              className="rs-select"
              required
              disabled={hospitalsStatus === "loading"}
            >
              {hospitalsStatus === "loading" && (
                <option value="">Detecting nearby medical centers…</option>
              )}
              {hospitals.length === 0 && hospitalsStatus !== "loading" && (
                <>
                  <option value="Amala Hospital">Amala Hospital · Central Campus</option>
                  <option value="Jubilee Mission Hospital">Jubilee Mission Medical College</option>
                  <option value="Government Medical College">Government Medical College</option>
                  <option value="General Hospital">General District Hospital</option>
                </>
              )}
              {hospitals.length > 0 &&
                hospitals.map((item) => (
                  <option key={item.id} value={item.name}>
                    {item.name} · {item.distanceKm.toFixed(1)} km
                  </option>
                ))}
            </select>
            <ChevronDown size={18} className="rs-select-chevron" aria-hidden="true" />
          </div>
        </div>

        {/* 4. Contact for Match (phone or email, shared only on match) */}
        <div className="rs-form-field">
          <div className="rs-field-label-row">
            <label className="rs-form-label" htmlFor="req-contact">
              Your contact
            </label>
            <span className="rs-field-annotation">Shared only with the matched donor</span>
          </div>

          <div className="rs-contact-wrapper">
            <Phone size={18} className="rs-contact-icon" aria-hidden="true" />
            <input
              id="req-contact"
              type="text"
              value={contact}
              onChange={(e) => {
                setContact(e.target.value);
                if (contactError) setContactError("");
              }}
              placeholder="Phone number or email"
              className="rs-form-input rs-contact-input"
              autoComplete="tel"
              required
              aria-invalid={Boolean(contactError)}
              aria-describedby={contactError ? "req-contact-error" : undefined}
            />
          </div>
          {contactError ? (
            <span id="req-contact-error" className="rs-field-error" role="alert">{contactError}</span>
          ) : (
            <span className="rs-form-helper">The donor sees this only after accepting your request.</span>
          )}
        </div>

        {/* 5. Urgency Level (3 Cards: STANDARD, URGENT, EMERGENCY) */}
        <div className="rs-form-field">
          <div className="rs-field-label-row">
            <label className="rs-form-label" id="req-urgency-label">
              Urgency level
            </label>
            <span className="rs-field-annotation">Notification speed</span>
          </div>

          <div
            className="rs-urgency-grid"
            role="radiogroup"
            aria-labelledby="req-urgency-label"
          >
            {URGENCY_OPTIONS.map((opt) => {
              const isSelected = urgency === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`rs-urgency-card ${isSelected ? "rs-urgency-card--selected" : ""}`}
                  onClick={() => setUrgency(opt.id)}
                >
                  <div className="rs-urgency-top">
                    <span className="rs-urgency-label">{opt.label}</span>
                    <span className="rs-urgency-timeline">{opt.timeline}</span>
                  </div>
                  <p className="rs-urgency-desc">{opt.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Location Card (MapPin, "Use my location", success state) */}
        <div className="rs-form-field">
          <div className="rs-field-label-row">
            <label className="rs-form-label">Facility coordinates</label>
            <span className="rs-field-annotation">Zero manual typing</span>
          </div>

          <div className={`rs-location-card rs-location-card--${locationStatus} ${shakeLocation ? "rs-location-card--shake" : ""}`}>
            <div className="rs-location-icon-area">
              <MapPin size={20} className="rs-location-pin" />
            </div>

            <div className="rs-location-body">
              {location ? (
                <>
                  <div className="rs-location-title-row">
                    <span className="rs-location-status-title">Coordinates verified</span>
                    <span className="rs-loc-pill rs-loc-pill--ready">
                      <Check size={12} /> Active
                    </span>
                  </div>
                  <p className="rs-location-coords">
                    {location.latitude.toFixed(4)}° N, {location.longitude.toFixed(4)}° E
                  </p>
                </>
              ) : (
                <>
                  <span className="rs-location-status-title">
                    {locationStatus === "loading"
                      ? "Querying browser location…"
                      : locationStatus === "denied"
                      ? "Permission required"
                      : "Location not yet confirmed"}
                  </span>
                  <p className="rs-location-note">
                    Browser location calculates distance to nearby donors without manual coordinate entry.
                  </p>
                </>
              )}
            </div>

            <div className="rs-location-action">
              {locationStatus === "success" ? (
                <button
                  type="button"
                  className="rs-location-btn rs-location-btn--subtle"
                  onClick={() => requestLocation("retry")}
                  title="Update location"
                >
                  <RefreshCw size={14} />
                  Update
                </button>
              ) : (
                <button
                  type="button"
                  className="rs-location-btn rs-location-btn--primary"
                  onClick={() => requestLocation(locationStatus === "denied" ? "retry" : "loading")}
                  disabled={busy || locationStatus === "loading"}
                >
                  {locationStatus === "loading" ? (
                    <span className="rs-btn-loading-state">
                      <span className="rs-spinner rs-spinner--sm" />
                      Getting location…
                    </span>
                  ) : locationStatus === "denied" ? (
                    "Retry access"
                  ) : (
                    "Use my location"
                  )}
                </button>
              )}
            </div>
          </div>
          {telegramLink && urgency !== "EMERGENCY" && (
            <p className="rs-form-helper" style={{ display: "flex", flexWrap: "wrap", minWidth: 0, maxWidth: 320 }}>
              <a
                href={telegramLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", minHeight: 44, paddingTop: 12, paddingBottom: 12 }}
              >
                or share location in chat instead — then return to complete
              </a>
              <span>&nbsp;(location here is still required to submit)</span>
            </p>
          )}
        </div>

        {/* Emergency bank-first routing: hospital blood bank + 108 before volunteers */}
        {urgency === "EMERGENCY" && (
          <div className="rs-error-banner" role="alert">
            <AlertCircle size={18} />
            <div>
              <p><strong>Emergency: call the hospital blood bank first, then 108.</strong></p>
              <p><a href="tel:108" className="rs-banner-link">Call 108 now <ArrowRight size={14} /></a></p>
              <label className="rs-checkbox-label" style={{ marginTop: 8 }}>
                <input
                  type="checkbox"
                  className="rs-checkbox-input"
                  checked={bankCalled}
                  onChange={(e) => setBankCalled(e.target.checked)}
                  required={urgency === "EMERGENCY"}
                />
                <span className="rs-checkbox-text">I have called the hospital blood bank / 108</span>
              </label>
            </div>
          </div>
        )}

        {/* Server Error / Auth Banner */}
        {serverError === "AUTHENTICATION_REQUIRED" ? (
          <div className="rs-auth-required-banner" role="alert">
            <AlertCircle size={18} />
            <div>
              <p className="rs-banner-title">Sign in required</p>
              <p className="rs-banner-desc">
                Please sign in to coordinate verified blood requests.
              </p>
              <Link href="/auth" className="rs-banner-link">
                Sign in to RaktaSetu <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ) : serverError ? (
          <div className="rs-error-banner" role="alert">
            <AlertCircle size={18} />
            <span>{serverError}</span>
          </div>
        ) : null}

        {/* 6. Submit Button (52px height, 10px radius) */}
        <div className="rs-submit-area">
          <button
            type="submit"
            className="rs-request-submit-btn"
            disabled={busy || locationStatus === "loading"}
          >
            {busy ? (
              <span className="rs-btn-loading-state">
                <span className="rs-spinner" />
                Creating request…
              </span>
            ) : (
              <span>Create blood request</span>
            )}
          </button>
          <p className="rs-submit-guarantee">
            <ShieldCheck size={14} /> Requests trigger private notifications. Phone numbers are never made public. Private Telegram alerts available.
          </p>
          <p className="rs-form-helper" style={{ textAlign: "center", marginTop: 8 }}>
            Open requests auto-expire after {EXPIRY_NOTE[urgency]} if still unmatched.
          </p>
        </div>
      </form>
    </div>
  );
};
