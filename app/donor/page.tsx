import { getSupabaseUser } from "@/lib/supabase/server";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { DonorOnboarding } from "@/components/donor/DonorOnboarding";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register as a Donor | RaktaSetu",
  description: "Join the RaktaSetu blood network. Private, coordinated alerts connecting eligible donors with patients in urgent need.",
};

export default async function DonorPage() {
  const user = await getSupabaseUser().catch(() => null);
  const telegramBotUsername = process.env.TELEGRAM_BOT_USERNAME ?? "eblooddonataionbot";
  const telegramLink = `https://t.me/${telegramBotUsername}`;

  return (
    <div className="rs-page-shell">
      <Navbar user={user} telegramLink={telegramLink} />
      <main className="rs-donor-page-main" id="main-content">
        <div className="rs-donor-container">
          <DonorOnboarding
            initialUser={user ? { id: user.id, email: user.email } : null}
            telegramBotUsername={telegramBotUsername}
          />
        </div>
      </main>
      <Footer telegramLink={telegramLink} />
    </div>
  );
}
