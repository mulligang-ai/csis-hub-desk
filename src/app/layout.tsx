import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "CSIS Hub Desk", template: "%s · CSIS Hub Desk" },
  description: "CSIS Hub Desk — support ticketing.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IE">
      <body className="antialiased">{children}</body>
    </html>
  );
}
