"use client";

import React, { useState, useEffect } from "react";
import { DonorProgress, StepItem } from "./DonorProgress";
import { BloodGroupSelector } from "./BloodGroupSelector";
import { LocationStep } from "./LocationStep";
import { ConsentStep } from "./ConsentStep";
import { DonorSuccess } from "./DonorSuccess";
import { bloodGroups, BloodGroup, Donor } from "@/lib/domain";

interface DonorOnboardingProps {
  initialUser: { id?: string; email?: string | null } | null;
  telegramBotUsername?: string;
}

const STEPS: StepItem[] = [
  { id: 1, label: "About you" },
  { id: 2, label: "Blood group" },
  { id: 3, label: "Location" },
  { id: 4, label: "Availability" },
];

export const DonorOnboarding: React.FC<DonorOnboardingProps> = ({
  initialUser,
}) => {
  // Form State
  const [currentStep, setCurrentStep] = useState(0);
  const [name, setName] = useState("");
  const [contact, setContact] = useState(initialUser?.email ?? "");
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>("O+");
  const [lastDonationDate, setLastDonationDate] = useState("");
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [consent, setConsent] = useState(false);

  // Field Validation Errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (initialUser?.email && !contact) {
      setContact(initialUser.email);
    }
  }, [initialUser, contact]);

  // Step 0 Validation (About You)
  const validateStep0 = (): boolean => {
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) {
      nextErrors.name = "Please enter your name.";
    }
    if (!contact.trim()) {
      nextErrors.contact = "Please enter your contact email.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  // Step 1 Validation (Blood Group)
  const validateStep1 = (): boolean => {
    const nextErrors: Record<string, string> = {};
    if (!bloodGroups.includes(bloodGroup)) {
      nextErrors.bloodGroup = "Please select a valid blood group.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  // Step 2 Validation (Location)
  const validateStep2 = (): boolean => {
    const nextErrors: Record<string, string> = {};
    if (!location) {
      nextErrors.location = "Location permission needed to coordinate nearby requests.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  // Step 3 Validation (Consent)
  const validateStep3 = (): boolean => {
    const nextErrors: Record<string, string> = {};
    if (!consent) {
      nextErrors.consent = "Please check the box to confirm you wish to receive notifications.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleNext = () => {
    setServerError("");
    let isValid = false;

    if (currentStep === 0) isValid = validateStep0();
    else if (currentStep === 1) isValid = validateStep1();
    else if (currentStep === 2) isValid = validateStep2();
    else if (currentStep === 3) isValid = validateStep3();

    if (isValid && currentStep < STEPS.length - 1) {
      setCurrentStep((curr) => curr + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrev = () => {
    setServerError("");
    setErrors({});
    if (currentStep > 0) {
      setCurrentStep((curr) => curr - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");

    if (!validateStep0() || !validateStep1() || !validateStep2() || !validateStep3()) {
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        contact: contact.trim().toLowerCase(),
        bloodGroup,
        latitude: location!.latitude,
        longitude: location!.longitude,
        lastDonationDate: lastDonationDate || null,
        notificationConsent: consent,
      };

      const res = await fetch("/api/donors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        setServerError("Please sign in to register your profile.");
      } else if (!res.ok) {
        setServerError(data.error || "Could not register donor profile. Please try again.");
      } else {
        setIsSuccess(true);
      }
    } catch {
      setServerError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="rs-donor-layout">
        <DonorSuccess />
      </div>
    );
  }

  return (
    <div className="rs-donor-layout">
      {/* Desktop Left / Mobile Top: Context Block */}
      <div className="rs-donor-context">
        <span className="rs-section-eyebrow">BECOME A DONOR</span>
        <h1 className="rs-donor-title">
          Be there when<br />
          someone needs you.
        </h1>
        <p className="rs-donor-body">
          Tell us the basics. RaktaSetu uses them to identify relevant requests.
        </p>

        {/* Clean Step Indicator with Thin Line */}
        <DonorProgress
          steps={STEPS}
          currentStep={currentStep}
          onStepClick={(idx) => {
            if (idx < currentStep) setCurrentStep(idx);
          }}
        />
      </div>

      {/* Desktop Right / Mobile Bottom: Form Step (No giant floating card) */}
      <div className="rs-donor-form-area">
        <form onSubmit={handleSubmit} noValidate>
          {currentStep === 0 && (
            <div className="rs-donor-step-content">
              <h3 className="rs-step-heading">About you</h3>
              <p className="rs-step-body">
                We only use this to identify and contact you privately.
              </p>

              <div className="rs-form-field">
                <label className="rs-form-label" htmlFor="donor-name">
                  Full name
                </label>
                <input
                  id="donor-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="rs-form-input"
                />
                {errors.name && <span className="rs-field-error">{errors.name}</span>}
              </div>

              <div className="rs-form-field">
                <label className="rs-form-label" htmlFor="donor-contact">
                  Email address
                </label>
                <input
                  id="donor-contact"
                  type="email"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="name@example.com"
                  className="rs-form-input"
                />
                {errors.contact && <span className="rs-field-error">{errors.contact}</span>}
              </div>

              <div className="rs-form-field">
                <label className="rs-form-label" htmlFor="donor-last-donation">
                  Last whole blood donation <span className="rs-form-optional">(optional)</span>
                </label>
                <input
                  id="donor-last-donation"
                  type="date"
                  value={lastDonationDate}
                  onChange={(e) => setLastDonationDate(e.target.value)}
                  className="rs-form-input"
                />
                <span className="rs-form-helper">Used to observe safe donation intervals.</span>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <BloodGroupSelector
              value={bloodGroup}
              onChange={setBloodGroup}
              error={errors.bloodGroup}
            />
          )}

          {currentStep === 2 && (
            <LocationStep
              location={location}
              onLocationChange={setLocation}
              error={errors.location}
            />
          )}

          {currentStep === 3 && (
            <ConsentStep
              consent={consent}
              onConsentChange={setConsent}
              error={errors.consent}
            />
          )}

          {serverError && (
            <div className="rs-server-error-banner" role="alert">
              {serverError}
            </div>
          )}

          {/* Form Actions (46px height, 9px radius) */}
          <div className="rs-donor-actions">
            {currentStep > 0 && (
              <button
                type="button"
                className="rs-btn-secondary"
                onClick={handlePrev}
                disabled={submitting}
              >
                Back
              </button>
            )}

            {currentStep < STEPS.length - 1 ? (
              <button
                type="button"
                className="rs-btn-primary"
                onClick={handleNext}
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                className="rs-btn-primary"
                disabled={submitting}
              >
                {submitting ? "Saving…" : "Complete profile"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
