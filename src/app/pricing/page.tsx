import Layout from '@/components/layout/Layout'
import PricingSection from '@/components/sections/PricingSection'
import PricingFAQ from '@/components/sections/PricingFAQ'
import PricingComparison from '@/components/sections/PricingComparison'
import CTASection from '@/components/sections/CTASection'

export default function PricingPage() {
  return (
    <Layout>
      <PricingSection />
      <PricingComparison />
      <PricingFAQ />
      <CTASection />
    </Layout>
  )
}
