// llms.txt (https://llmstxt.org) and llms-full.txt: plain Markdown versions of
// the site for AI assistants and answer engines. Built from the same data as
// the pages. Case study "decisions" are left out: several are still marked
// CONFIRM in projects.js, and these files are quoted verbatim by AI tools.
import { site } from '../data/site.js'
import { capabilities, experience, principles, skillGroups, learning } from '../data/content.js'
import { caseStudies, projects } from '../data/projects.js'
import { DEFAULT_DESCRIPTION, PAGE_META, SITE_URL, caseStudyMeta, pageUrl } from './pageMeta.js'

const resumeUrl = () => `${SITE_URL}/Vinod_Kumar_Resume.pdf`
const list = (items) => items.map((i) => `- ${i}`).join('\n')

function intro() {
  return [
    `# ${site.name}`,
    '',
    `> ${DEFAULT_DESCRIPTION}`,
    '',
    `${site.experience} of professional experience. Based in ${site.location}. Contact: ${site.email}.`,
  ]
}

/** The short index: who this is and where everything lives. */
export function llmsTxt() {
  return [
    ...intro(),
    '',
    '## Pages',
    '',
    list([
      `[Home](${pageUrl('/')}): overview, featured SaaS work, capabilities and experience`,
      `[Projects](${pageUrl('/projects')}): ${PAGE_META.projects.description}`,
      `[About](${pageUrl('/about')}): ${PAGE_META.about.description}`,
      `[Contact](${pageUrl('/contact')}): ${PAGE_META.contact.description}`,
    ]),
    '',
    '## Case studies',
    '',
    list(caseStudies.map((p) => `[${caseStudyMeta(p).title}](${pageUrl(`/projects/${p.slug}`)}): ${p.caseStudy.overview}`)),
    '',
    '## Profiles',
    '',
    list([
      ...site.socials.map((s) => `[${s.label}](${s.href})`),
      `[Résumé (PDF)](${resumeUrl()})`,
    ]),
    '',
    '## Optional',
    '',
    list([`[Full site content](${SITE_URL}/llms-full.txt): every page as Markdown in one file`]),
    '',
  ].join('\n')
}

function caseStudySection(p) {
  const cs = p.caseStudy
  return [
    `### ${p.name}: ${p.kind}`,
    '',
    `URL: ${pageUrl(`/projects/${p.slug}`)}${p.href ? ` · Live product: ${p.href}` : ''}`,
    '',
    cs.overview,
    '',
    `**Problem and context.** ${cs.context}`,
    '',
    '**My role and contribution**',
    '',
    list(cs.mine),
    '',
    `**Scope.** ${cs.team}`,
    '',
    '**Implementation**',
    '',
    list(cs.implementation.map((i) => `${i.title}: ${i.body}`)),
    '',
    `**Workflow: ${cs.workflow.title}.** ${cs.workflow.steps.map((s) => s.label).join(' → ')}`,
    '',
    `**What it delivers.** ${cs.outcome}`,
    '',
    `**Technologies.** ${p.stack.join(', ')}`,
  ]
}

/** Everything on the site in one Markdown document. */
export function llmsFullTxt() {
  const others = projects.filter((p) => !p.caseStudy)
  return [
    ...intro(),
    '',
    `Website: ${pageUrl('/')} · ${site.socials.map((s) => `${s.label}: ${s.href}`).join(' · ')} · Résumé: ${resumeUrl()}`,
    '',
    '## Experience',
    '',
    ...experience.flatMap((e) => [
      `### ${e.role}, ${e.company}${e.location ? ` (${e.location})` : ''}`,
      '',
      e.period,
      '',
      list(e.highlights),
      '',
    ]),
    '## Capabilities',
    '',
    ...capabilities.flatMap((c) => [`### ${c.title}`, '', c.body, '', `Technologies: ${c.tech.join(', ')}`, '']),
    '## How I work',
    '',
    list(principles.map((p) => `**${p.title}.** ${p.body}`)),
    '',
    '## Skills',
    '',
    list([
      ...skillGroups.map((g) => `**${g.title}:** ${g.items.join(', ')}`),
      `**Currently learning (not yet professional use):** ${learning.join(', ')}`,
    ]),
    '',
    '## SaaS case studies',
    '',
    ...caseStudies.flatMap((p) => [...caseStudySection(p), '']),
    '## Other projects',
    '',
    list(others.map((p) => `**${p.name}** (${p.kind})${p.href ? `, ${p.href}` : ''}: ${p.summary} Stack: ${p.stack.join(', ')}.`)),
    '',
    '## Contact',
    '',
    `Email ${site.email} or use the form at ${pageUrl('/contact')} about product development, full stack projects or AI integration work.`,
    '',
  ].join('\n')
}
