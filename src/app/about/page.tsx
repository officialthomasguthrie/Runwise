import Layout from '@/components/layout/Layout'
import AboutHero from '@/components/sections/AboutHero'
import OurStory from '@/components/sections/OurStory'
import WhatWeAreBuilding from '@/components/sections/WhatWeAreBuilding'
import CoreValues from '@/components/sections/CoreValues'
import OurTeam from '@/components/sections/OurTeam'
import AboutCTA from '@/components/sections/AboutCTA'

export default function AboutPage() {
  return (
    <Layout>
      <AboutHero />
      <OurStory />
      <WhatWeAreBuilding />
      <CoreValues />
      <OurTeam />
      <AboutCTA />
    </Layout>
  )
}
