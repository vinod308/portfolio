// Single source of truth for personal details used across the site.
export const site = {
  name: 'Vinod Kumar',
  title: 'Full Stack Developer | AI Application Engineer',
  location: 'Noida, India',
  experience: 'Nearly 7 years',
  email: 'vinodvinni308@gmail.com',
  // BASE_URL is '/' normally and '/portfolio/' on GitHub Pages
  resume: `${import.meta.env.BASE_URL}Vinod_Kumar_Resume.pdf`,
  // GA4 runs only on `host` and only after the visitor accepts (lib/usage.js).
  analytics: { gaId: 'G-XW2DH0JP1Z', host: 'vinod-kumar.in' },
  socials: [
    { label: 'GitHub', href: 'https://github.com/vinod308' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/vinod308' },
  ],
}
