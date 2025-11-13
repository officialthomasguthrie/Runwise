import { Pricing } from "@/components/ui/pricing-cards"
import FadeContent from "@/components/ui/FadeContent"

export default function PricingSection() {
  return (
    <FadeContent delay={200} duration={1000}>
      <Pricing />
    </FadeContent>
  )
}
