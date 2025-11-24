import Layout from '@/components/layout/Layout';
import Hero from '@/components/sections/Hero';
import BentoGridDemo from '@/components/sections/BentoGridDemo';
import Testimonials from '@/components/sections/Testimonials';
import PricingSection from '@/components/sections/PricingSection';
import CTASection from '@/components/sections/CTASection';

export default function Home() {
  return (
    <div suppressHydrationWarning={true}>
      <Layout>
        <Hero />
        <BentoGridDemo />
        <Testimonials />
        <PricingSection />
        <CTASection />
      </Layout>
    </div>
  );
}
