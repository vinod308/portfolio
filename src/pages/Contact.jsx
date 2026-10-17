import { useRef } from 'react'
import Container from '../components/Container.jsx'
import PageHeader from '../components/PageHeader.jsx'
import ContactForm from '../components/ContactForm.jsx'
import Button, { ArrowIcon } from '../components/Button.jsx'
import { CONTACT_FORM_ENABLED } from '../lib/contact.js'
import { site } from '../data/site.js'
import { usePageMeta } from '../lib/usePageMeta.js'
import { PAGE_META } from '../lib/pageMeta.js'
import { useMotion, reveal } from '../lib/motion.js'
import './Contact.css'

export default function Contact() {
  usePageMeta(PAGE_META.contact)
  const ref = useRef(null)

  useMotion(ref, (q) => {
    reveal(q('.contact-layout > *'), { stagger: 0.1, delay: 0.35, y: 24 })
  })

  return (
    <div className="page" ref={ref}>
      <Container>
        <PageHeader
          eyebrow="Contact"
          title="Let's talk about what you're building"
          description="Engineering roles, product development or AI integration work: send a message and I'll reply by email."
        />

        <div className="contact-layout">
          {CONTACT_FORM_ENABLED ? (
            <ContactForm />
          ) : (
            <div className="contact-direct card">
              <p className="mono-label">Email me directly</p>
              <a className="contact-direct__email" href={`mailto:${site.email}`}>
                {site.email}
              </a>
              <p className="contact-direct__text">
                Tell me a little about the role, project or AI feature you have in mind, and I&apos;ll reply by
                email.
              </p>
              <Button href={`mailto:${site.email}`} size="lg" icon={<ArrowIcon />}>
                Write an email
              </Button>
            </div>
          )}

          <aside className="contact-aside" aria-label="Other ways to reach me">
            <div className="contact-aside__block">
              <p className="mono-label">Email directly</p>
              <a className="contact-aside__email" href={`mailto:${site.email}`}>
                {site.email}
              </a>
            </div>
            <div className="contact-aside__block">
              <p className="mono-label">Based in</p>
              <p>{site.location}</p>
            </div>
            <div className="contact-aside__block">
              <p className="mono-label">Elsewhere</p>
              <ul className="contact-aside__links" role="list">
                {site.socials.map((s) => (
                  <li key={s.href}>
                    <a href={s.href} target="_blank" rel="noopener noreferrer">
                      {s.label}
                      <span className="visually-hidden"> (opens in a new tab)</span>
                    </a>
                  </li>
                ))}
                <li>
                  <a href={site.resume}>Résumé (PDF)</a>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </Container>
    </div>
  )
}
