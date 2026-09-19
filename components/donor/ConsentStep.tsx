import React from "react";

interface ConsentStepProps {
  consent: boolean;
  onConsentChange: (val: boolean) => void;
  error?: string;
}

export const ConsentStep: React.FC<ConsentStepProps> = ({
  consent,
  onConsentChange,
  error,
}) => {
  return (
    <div className="rs-donor-step-content">
      <h3 className="rs-step-heading">Stay available when you can.</h3>
      <p className="rs-step-body">
        We&apos;ll only contact you when a request is relevant to the information you&apos;ve provided.
      </p>

      <div className="rs-consent-row">
        <label className="rs-checkbox-label">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => onConsentChange(e.target.checked)}
            className="rs-checkbox-input"
          />
          <span className="rs-checkbox-text">
            I agree to receive private notifications for relevant blood requests.
          </span>
        </label>
      </div>

      {error && <span className="rs-field-error">{error}</span>}
    </div>
  );
};
