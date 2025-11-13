import { HowItWorks } from "@/components/ui/how-it-works";
import FadeContent from "@/components/ui/FadeContent";

export default function HowItWorksSection() {
  return (
    <FadeContent delay={300} duration={1000}>
      <HowItWorks />
    </FadeContent>
  );
}
