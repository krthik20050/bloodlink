import type { Metadata } from "next";
import "./styles.css";
export const metadata: Metadata = { title: "BloodLink", description: "Relevant blood donor coordination" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
