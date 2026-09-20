import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { TelegramFloat } from "@/components/ui/TelegramFloat";
import "./styles.css";

export const viewport: Viewport = {
  themeColor: "#F7F7F5",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "RaktaSetu - Precision Blood Coordination Layer",
  description: "RaktaSetu connects blood requests with compatible, eligible donors nearby privately and deterministically.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // ponytail: env read in server layout — one persistent Telegram entry, every page.
  const botHandle = process.env.TELEGRAM_BOT_USERNAME ?? "eblooddonataionbot";
  const telegramLink = `https://t.me/${botHandle}`;
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <a href="#main-content" className="rs-skip-link">
          Skip to content
        </a>
        {children}
        <TelegramFloat telegramLink={telegramLink} botHandle={botHandle} />
      </body>
    </html>
  );
}
