import Layout from '@/components/layout/Layout'
import ContactHero from '@/components/sections/ContactHero'
import ContactForm from '@/components/sections/ContactForm'
import ContactInfo from '@/components/sections/ContactInfo'

export default function ContactPage() {
  return (
    <Layout>
      <ContactHero />
      <ContactForm />
      <ContactInfo />
    </Layout>
  )
}
