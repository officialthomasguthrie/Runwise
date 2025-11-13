import { CTA } from "@/components/ui/call-to-action";
import FadeContent from "@/components/ui/FadeContent";

export default function CTASection() {
  return (
    <FadeContent delay={400} duration={1000}>
      <CTA />
    </FadeContent>
  );
}
