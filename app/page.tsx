import { getSupabaseUser } from "@/lib/supabase/server";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { EngineSection } from "@/components/landing/EngineSection";
import { PositioningSection } from "@/components/landing/PositioningSection";
import { ProcessSection } from "@/components/landing/ProcessSection";
import { TelegramSection } from "@/components/landing/TelegramSection";
import { AfterRequestSection } from "@/components/landing/AfterRequestSection";
import { TrustSection } from "@/components/landing/TrustSection";
import { CallToAction } from "@/components/landing/CallToAction";
import { TeamSection } from "@/components/landing/TeamSection";
import { Footer } from "@/components/landing/Footer";

export default async function Home() {
  const user = await getSupabaseUser().catch(() => null);
  const botHandle = process.env.TELEGRAM_BOT_USERNAME ?? "eblooddonataionbot";
  const telegramLink = `https://t.me/${botHandle}`;

  return (
    <div className="rs-page-shell">
      <Navbar user={user} telegramLink={telegramLink} />
      <main id="main-content">
        <Hero user={user} telegramLink={telegramLink} />
        <ProblemSection />
        <EngineSection />
        <PositioningSection />
        <ProcessSection />
        <TelegramSection telegramLink={telegramLink} botHandle={botHandle} />
        <AfterRequestSection />
        <TrustSection />
        <CallToAction telegramLink={telegramLink} />
        <TeamSection />
      </main>
      <Footer telegramLink={telegramLink} />
    </div>
  );
}
