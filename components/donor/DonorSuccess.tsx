import React from "react";
import Link from "next/link";

interface DonorSuccessProps {
  name?: string;
  bloodGroup?: string;
  telegramLink?: string;
  onViewStatus?: () => void;
}

export const DonorSuccess: React.FC<DonorSuccessProps> = () => {
  return (
    <div className="rs-donor-success-box" aria-live="polite">
      <span className="rs-section-eyebrow">RAKTASETU</span>
      <h2 className="rs-success-title">You&apos;re in.</h2>
      <p className="rs-success-intro">Your donor profile is ready.</p>
      <p className="rs-success-text">
        RaktaSetu can consider you when a relevant request needs a donor like you.
      </p>

      <div className="rs-success-cta">
        <Link href="/" className="rs-btn-primary">
          Return home
        </Link>
      </div>
    </div>
  );
};
