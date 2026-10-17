import { useRef } from 'react'
import Container from '../components/Container.jsx'
import SectionHeading from '../components/SectionHeading.jsx'
import CapabilityList from '../components/CapabilityList.jsx'
import { useMotion, reveal } from '../lib/motion.js'
import './Capabilities.css'

/** Engineering expertise: the one place skills are listed, grouped by area. */
export default function Capabilities() {
  const ref = useRef(null)

  useMotion(ref, (q) => {
    reveal(q('.about__intro > *'), { trigger: q('.about__intro')[0], stagger: 0.1 })
  })

  return (
    <section className="section section--light theme-light about" id="skills" ref={ref} aria-labelledby="skills-title">
      <Container className="about__grid">
        <div className="about__intro">
          <SectionHeading
            id="skills-title"
            eyebrow="Skills"
            title="Engineering expertise, from interface to infrastructure"
          />
          <p>
            The areas I work across in production, with the tools I use for each. The projects above show where they
            come together.
          </p>
        </div>

        <div>
          <h3 className="visually-hidden">Engineering capabilities</h3>
          <CapabilityList headingLevel={4} />
        </div>
      </Container>
    </section>
  )
}
