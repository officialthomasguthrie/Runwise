import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./components/Providers";
import { Analytics } from "@vercel/analytics/next";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://runwiseai.app'),
  title: {
    default: "Runwise - AI-Powered Workflow Builder",
    template: "%s | Runwise"
  },
  description: "Runwise AI is the best no-code automation platform. Create simple automations and workflows with AI-powered natural language. Build automation workflows without coding - the easiest way to automate your business processes.",
  keywords: [
    "Runwise",
    "Runwise AI",
    "automation",
    "no code automation",
    "simple automation",
    "workflows",
    "workflow automation",
    "workflow builder",
    "AI automation",
    "no-code platform",
    "business automation",
    "process automation",
    "automation tools",
    "workflow software",
    "automation platform",
    "AI workflows",
    "natural language automation",
    "automation builder",
    "workflow creator",
    "automation software"
  ],
  authors: [{ name: "Runwise" }],
  creator: "Runwise",
  publisher: "Runwise",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://runwiseai.app",
    siteName: "Runwise",
    title: "Runwise - AI-Powered Workflow Builder",
    description: "Create simple automations and workflows with AI-powered natural language. The easiest no-code automation platform for building workflows without coding.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Runwise - AI-Powered Workflow Builder",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Runwise - AI-Powered Workflow Builder",
    description: "Create simple automations and workflows with AI-powered natural language. The easiest no-code automation platform.",
    images: ["/og-image.png"],
    creator: "@runwiseai", // Update with your Twitter handle if you have one
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  other: {
    'font-display': 'swap',
  },
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
    ],
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
  alternates: {
    canonical: "https://runwiseai.app",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="shortcut icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Providers>
              {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
