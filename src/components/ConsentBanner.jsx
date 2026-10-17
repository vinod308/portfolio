import Button from './Button.jsx'
import { setConsent, useConsent } from '../lib/usage.js'
import './ConsentBanner.css'

/**
 * Asks once before Google Analytics loads. Shown only where analytics can run
 * (production, primary host) and never in prerendered HTML, so hydration and
 * the mirrors are unaffected. The footer's "Cookie settings" reopens it.
 */
export default function ConsentBanner() {
  const { enabled, consent, settingsOpen } = useConsent()
  if (!enabled || (consent && !settingsOpen)) return null

  return (
    <section className="consent" role="region" aria-label="Analytics consent">
      <p className="consent__text">
        Can I use Google Analytics cookies to see which pages are read? Nothing is sent to Google unless you accept.
      </p>
      <div className="consent__actions">
        <Button size="md" onClick={() => setConsent('granted')}>
          Accept
        </Button>
        <Button size="md" variant="secondary" onClick={() => setConsent('denied')}>
          Decline
        </Button>
      </div>
    </section>
  )
}
