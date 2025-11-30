import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Radison - AI Agency Framer Template",
  description: "Radison - AI Agency Framer Template",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
