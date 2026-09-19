import React from "react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Donor } from "@/lib/domain";
import {
  Activity,
  CheckCircle2,
  Clock,
  MapPin,
  Send,
  ShieldCheck,
  Edit3,
} from "lucide-react";

interface DonorStatusCardProps {
  donor: Donor;
  onUpdateProfile: () => void;
  telegramBotUsername?: string;
}

export const DonorStatusCard: React.FC<DonorStatusCardProps> = ({
  donor,
  onUpdateProfile,
  telegramBotUsername = "eblooddonataionbot",
}) => {
  // Compute next eligible date based on standard 90-day cooldown
  let eligibilityNote = "Ready to respond";
  let nextDateStr = "Immediate";

  if (donor.lastDonationDate) {
    const lastDate = new Date(`${donor.lastDonationDate}T00:00:00Z`);
    const nextDate = new Date(lastDate);
    nextDate.setUTCDate(nextDate.getUTCDate() + 90);

    const now = new Date();
    if (nextDate > now) {
      eligibilityNote = "Observing 90-day biological cooldown";
      nextDateStr = nextDate.toISOString().split("T")[0];
    } else {
      eligibilityNote = "Past cooldown threshold. Ready to donate.";
      nextDateStr = "Eligible now";
    }
  }

  const isTelegramLinked = Boolean(donor.telegramChatId);

  return (
    <div className="rs-donor-status-card">
      <div className="rs-status-card-header">
        <div className="rs-status-header-left">
          <Badge variant="oxblood" size="sm">
            REGISTERED DONOR
          </Badge>
          <h2 className="rs-status-name">{donor.name}</h2>
          <span className="rs-status-email">
            Private coordination profile
          </span>
        </div>

        <div className="rs-status-header-right">
          <div className="rs-status-blood-pill">
            <span className="rs-pill-prefix">GROUP</span>
            <span className="rs-pill-val">{donor.bloodGroup}</span>
          </div>
        </div>
      </div>

      <div className="rs-status-metrics-grid">
        <div className="rs-status-metric-box">
          <div className="rs-status-metric-head">
            <Activity size={15} className="rs-metric-icon rs-metric-icon--sage" />
            <span className="rs-metric-label">Network Status</span>
          </div>
          <strong className="rs-metric-value">
            {donor.availability === "AVAILABLE" ? "Active / Available" : "Paused"}
          </strong>
          <span className="rs-metric-subtext">
            {donor.notificationConsent
              ? "Notification consent granted"
              : "Notifications paused"}
          </span>
        </div>

        <div className="rs-status-metric-box">
          <div className="rs-status-metric-head">
            <Clock size={15} className="rs-metric-icon rs-metric-icon--oxblood" />
            <span className="rs-metric-label">Biological Cooldown</span>
          </div>
          <strong className="rs-metric-value">{nextDateStr}</strong>
          <span className="rs-metric-subtext">{eligibilityNote}</span>
        </div>

        <div className="rs-status-metric-box">
          <div className="rs-status-metric-head">
            <MapPin size={15} className="rs-metric-icon" />
            <span className="rs-metric-label">Dispatch Radius</span>
          </div>
          <strong className="rs-metric-value">Coordinates Active</strong>
          <span className="rs-metric-subtext">
            Approximate location mapped for nearby hospital requests
          </span>
        </div>

        <div className="rs-status-metric-box">
          <div className="rs-status-metric-head">
            <Send size={15} className="rs-metric-icon" />
            <span className="rs-metric-label">Telegram Channel</span>
          </div>
          <strong className="rs-metric-value">
            {isTelegramLinked ? "Connected" : "Not Linked"}
          </strong>
          <span className="rs-metric-subtext">
            {isTelegramLinked
              ? "Emergency alerts arrive via Telegram"
              : "Link Telegram for instant notifications"}
          </span>
        </div>
      </div>

      {!isTelegramLinked && (
        <div className="rs-status-telegram-banner">
          <div className="rs-banner-copy">
            <strong>Connect your Telegram bot</strong>
            <p>
              Ensure you never miss a critical request when seconds count. Alerts are delivered directly to your Telegram chat.
            </p>
          </div>
          <Button
            href={`https://t.me/${telegramBotUsername}`}
            external
            variant="oxblood"
            size="sm"
          >
            Connect Telegram
          </Button>
        </div>
      )}

      <div className="rs-status-card-footer">
        <div className="rs-status-footer-note">
          <ShieldCheck size={16} />
          <span>
            Identity and location are guarded under RaktaSetu privacy protocol.
          </span>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onUpdateProfile}
        >
          <Edit3 size={14} /> Update Profile
        </Button>
      </div>
    </div>
  );
};
