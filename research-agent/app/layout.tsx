import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Research Agent — AI-Powered Web Research",
  description:
    "Enter any topic, keyword, person, or question and get a comprehensive research report powered by AI.",
  keywords: ["research", "AI", "web research", "news analysis", "trend research"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
