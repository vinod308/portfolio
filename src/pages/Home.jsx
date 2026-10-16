import Hero from '../sections/Hero.jsx'
import FeaturedProjects from '../sections/FeaturedProjects.jsx'
import EngineeringDashboard from '../sections/EngineeringDashboard.jsx'
import Capabilities from '../sections/Capabilities.jsx'
import CaseStudyTeaser from '../sections/CaseStudyTeaser.jsx'
import Experience from '../sections/Experience.jsx'
import AdditionalProjects from '../sections/AdditionalProjects.jsx'
import ContactCTA from '../sections/ContactCTA.jsx'
import { usePageMeta } from '../lib/usePageMeta.js'

export default function Home() {
  usePageMeta()
  return (
    <>
      <Hero />
      <FeaturedProjects />
      <EngineeringDashboard />
      <Capabilities />
      <CaseStudyTeaser />
      <Experience />
      <AdditionalProjects />
      <ContactCTA />
    </>
  )
}
