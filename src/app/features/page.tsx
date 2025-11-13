import Layout from '@/components/layout/Layout'
import FeaturesHero from '@/components/sections/FeaturesHero'
import BentoGridDemo from '@/components/sections/BentoGridDemo'
import FeaturesCTASection from '@/components/sections/FeaturesCTASection'

export default function FeaturesPage() {
  return (
    <Layout>
      <FeaturesHero />
      <BentoGridDemo />
      <FeaturesCTASection />
    </Layout>
  )
}
