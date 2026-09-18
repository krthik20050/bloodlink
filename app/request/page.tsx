import { getSupabaseUser } from "@/lib/supabase/server";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { RequestForm } from "@/components/request/RequestForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Request Blood Coordination | RaktaSetu",
  description:
    "Request blood for medical emergencies or scheduled procedures. RaktaSetu connects verified needs to compatible, eligible donors nearby privately.",
};

export default async function RequestPage() {
  const user = await getSupabaseUser().catch(() => null);
  const telegramBotUsername = process.env.TELEGRAM_BOT_USERNAME ?? "eblooddonataionbot";
  const telegramLink = `https://t.me/${telegramBotUsername}`;

  return (
    <div className="rs-page-shell">
      <Navbar user={user} telegramLink={telegramLink} />
      <main className="rs-request-page-main" id="main-content">
        <div className="rs-content-container">
          <div className="rs-request-layout">
            {/* Desktop Left / Mobile Top: Context & Specifications */}
            <div className="rs-request-context">
              <span className="rs-section-eyebrow">REQUEST COORDINATION</span>
              <h1 className="rs-request-title">
                We’ll find someone<br />
                who can help.
              </h1>
              <p className="rs-request-lede">
                Share what you need and confirm facility location. RaktaSetu evaluates red-cell compatibility, donation intervals, and proximity before notifying donors privately.
              </p>

              {/* Technical Precision Callouts */}
              <div className="rs-tech-spec-list">
                <div className="rs-tech-spec-item">
                  <span className="rs-spec-num">01</span>
                  <div className="rs-spec-body">
                    <strong className="rs-spec-title">DETERMINISTIC COMPATIBILITY</strong>
                    <p className="rs-spec-desc">Matches exact biological red-blood-cell antigen compatibility tables.</p>
                  </div>
                </div>

                <div className="rs-tech-spec-item">
                  <span className="rs-spec-num">02</span>
                  <div className="rs-spec-body">
                    <strong className="rs-spec-title">INTERVAL SAFETY ENFORCEMENT</strong>
                    <p className="rs-spec-desc">Protects donors by enforcing safe 90-day whole blood recovery windows.</p>
                  </div>
                </div>

                <div className="rs-tech-spec-item">
                  <span className="rs-spec-num">03</span>
                  <div className="rs-spec-body">
                    <strong className="rs-spec-title">CONFIDENTIAL DISPATCH</strong>
                    <p className="rs-spec-desc">Zero public phone numbers or broadcasts. All alerts are 1:1 and private.</p>
                  </div>
                </div>

                <div className="rs-tech-spec-item">
                  <span className="rs-spec-num">04</span>
                  <div className="rs-spec-body">
                    <strong className="rs-spec-title">CONCENTRATED RESPONSE</strong>
                    <p className="rs-spec-desc">Controlled notification waves avoid alert fatigue and hospital chaos.</p>
                  </div>
                </div>
              </div>

              {/* Status Indicator Pill */}
              <div className="rs-system-status-indicator">
                <span className="rs-live-dot" />
                <span className="rs-live-text">Engine operational · Ready for immediate dispatch</span>
              </div>
            </div>

            {/* Desktop Right / Mobile Bottom: Precision Form Card */}
            <div className="rs-request-form-area">
              <RequestForm initialUser={user} />
            </div>
          </div>
        </div>
      </main>
      <Footer telegramLink={telegramLink} />
    </div>
  );
}
