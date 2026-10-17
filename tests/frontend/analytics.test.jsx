// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import ConsentBanner from '../../src/components/ConsentBanner.jsx'
import { isAnalyticsEnabled, track } from '../../src/lib/analytics.js'

const base = { prod: true, id: 'G-TEST123', primaryHost: 'vinod-kumar.in', hostname: 'vinod-kumar.in' }

describe('analytics', () => {
  it('runs only in production builds on the primary host with an ID', () => {
    expect(isAnalyticsEnabled(base)).toBe(true)
    expect(isAnalyticsEnabled({ ...base, prod: false })).toBe(false)
    expect(isAnalyticsEnabled({ ...base, id: null })).toBe(false)
    expect(isAnalyticsEnabled({ ...base, hostname: 'vinod308.github.io' })).toBe(false)
    expect(isAnalyticsEnabled({ ...base, hostname: 'vinod-kumar-portfolio-tan.vercel.app' })).toBe(false)
    expect(isAnalyticsEnabled({ ...base, hostname: 'localhost' })).toBe(false)
  })

  it('shows no banner and loads nothing outside production', () => {
    const { container } = render(<ConsentBanner />)
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByRole('region', { name: /analytics consent/i })).toBeNull()
    track('test_event')
    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull()
    expect(window.gtag).toBeUndefined()
  })
})
