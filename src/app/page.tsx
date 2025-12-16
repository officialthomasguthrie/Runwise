import { Benefits } from "./components/Benefits";
import { FAQ } from "./components/FAQ";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { Posibilities } from "./components/Possibilities/Possibilities";
import { Pricing } from "./components/Pricing";
import { Process } from "./components/Process/Process";
import { WhoWeAre } from "./components/WhoWeAre";

export default function Home() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Runwise",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "150"
    },
    "description": "Runwise is an AI-powered workflow builder that turns natural language prompts into fully functional workflows and automations. Build automation workflows without coding - the easiest way to automate your business processes.",
    "featureList": [
      "No-code automation builder",
      "AI-powered workflow generation",
      "Natural language to workflows",
      "Simple automation creation",
      "Workflow templates",
      "Integration with 40+ apps"
    ],
    "screenshot": "https://runwiseai.app/og-image.png",
    "url": "https://runwiseai.app",
    "author": {
      "@type": "Organization",
      "name": "Runwise",
      "url": "https://runwiseai.app"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Runwise",
      "url": "https://runwiseai.app"
    }
  };

  const organizationData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Runwise",
    "url": "https://runwiseai.app",
    "logo": "https://runwiseai.app/favicon.png",
    "description": "Runwise - AI-powered workflow builder platform",
    "sameAs": [
      // Add your social media URLs here when available
      // "https://twitter.com/runwiseai",
      // "https://linkedin.com/company/runwise",
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "Customer Support",
      "email": "hello@runwiseai.app"
    }
  };

  const websiteData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Runwise",
    "url": "https://runwiseai.app",
    "description": "No-code automation and workflow builder platform",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://runwiseai.app/search?q={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteData) }}
      />
      
      <main className="landing-page">
        <Header />
        <Hero />
        <WhoWeAre />
        <Process />
        <Posibilities />
        <Benefits />
        <Pricing />
        <FAQ />
        <Footer />
      </main>
    </>
  );
}
