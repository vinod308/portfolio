import Hero from '../sections/Hero.jsx'
import FeaturedProjects from '../sections/FeaturedProjects.jsx'
import Capabilities from '../sections/Capabilities.jsx'
import Experience from '../sections/Experience.jsx'
import AdditionalProjects from '../sections/AdditionalProjects.jsx'
import AboutBrief from '../sections/AboutBrief.jsx'
import ContactCTA from '../sections/ContactCTA.jsx'
import { usePageMeta } from '../lib/usePageMeta.js'

// Story order: who I am, what I've built, what I can do, where I've done it,
// more work, how I work, get in touch.
export default function Home() {
  usePageMeta()
  return (
    <>
      <Hero />
      <FeaturedProjects />
      <Capabilities />
      <Experience />
      <AdditionalProjects />
      <AboutBrief />
      <ContactCTA />
    </>
  )
}
