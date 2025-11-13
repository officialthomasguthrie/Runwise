import { HeroSection } from "@/components/ui/hero-section-dark"

export default function Hero() {
  return (
    <HeroSection
      title="Welcome to Runwise"
      subtitle={{
        regular: "Turn natural language prompts\ninto ",
        gradient: "fully functional workflows",
      }}
      description="Transform your ideas into reality with Runwise's AI-powered platform. Simply describe what you want, and watch it come to life as integrated, functional workflows."
      ctaText="Start Building"
      ctaHref="/signup"
      gridOptions={{
        angle: 65,
        opacity: 0,
        cellSize: 50,
        lightLineColor: "#4a4a4a",
        darkLineColor: "#2a2a2a",
      }}
    />
  )
}
