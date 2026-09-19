import { getSupabaseUser } from "@/lib/supabase/server";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { EngineSection } from "@/components/landing/EngineSection";
import { PositioningSection } from "@/components/landing/PositioningSection";
import { ProcessSection } from "@/components/landing/ProcessSection";
import { TrustSection } from "@/components/landing/TrustSection";
import { CallToAction } from "@/components/landing/CallToAction";
import { Footer } from "@/components/landing/Footer";

export default async function Home() {
  const user = await getSupabaseUser().catch(() => null);
  const telegramLink = `https://t.me/${process.env.TELEGRAM_BOT_USERNAME ?? "eblooddonataionbot"}`;

  return (
    <div className="rs-page-shell">
      <Navbar user={user} telegramLink={telegramLink} />
      <main id="main-content">
        <Hero user={user} />
        <ProblemSection />
        <EngineSection />
        <PositioningSection />
        <ProcessSection />
        <TrustSection />
        <CallToAction />
      </main>
      <Footer telegramLink={telegramLink} />
    </div>
  );
}
