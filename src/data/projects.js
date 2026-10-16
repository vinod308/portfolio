// Single source of truth for every project shown on the site.
//
// Content rules:
//  - Facts come from the approved résumé and Vinod's confirmed answers:
//    MoneyGence (owned invoicing, receivables and reports modules in a team),
//    Haylow.ai (built integrations with 4 AI providers + backend workflows),
//    OnGrid.work (core modules and backend workflows end to end).
//  - `href` is set only for sites confirmed to respond; otherwise null.
//  - Product context paraphrases each product's public positioning.
//  - Statements marked CONFIRM below go beyond the résumé wording and should
//    be checked by Vinod before launch.

export const CATEGORIES = [
  { id: 'saas', label: 'SaaS' },
  { id: 'ai', label: 'AI Applications' },
  { id: 'ecommerce', label: 'E-commerce' },
  { id: 'web', label: 'Web Development' },
]

export const projects = [
  {
    slug: 'moneygence',
    name: 'MoneyGence',
    kind: 'Financial Management SaaS',
    categories: ['saas'],
    featured: true,
    href: 'https://moneygence.com/',
    summary:
      'A financial management platform for service businesses, bringing client finances, invoicing, collections and receivables into one view.',
    role: 'Development team member. Owned 3 modules: invoicing, receivables and reports, implementing frontend functionality, backend APIs and database-backed workflows.',
    stack: ['React.js', 'Node.js', 'Express.js', 'PostgreSQL'],
    mockup: 'finance',
    caseStudy: {
      overview:
        'MoneyGence is a financial management SaaS for service businesses. It brings client finances, invoicing, collections and receivables into one view.',
      context:
        'Service businesses need to see what they have billed, what they are owed and what has been collected, without stitching it together from separate spreadsheets and tools.',
      mine: [
        'Owned three modules within the development team: invoicing, receivables and reports.',
        'Implemented the frontend functionality, backend APIs and database-backed workflows for those modules.',
      ],
      team: 'MoneyGence was built by a development team. The rest of the platform, outside the three modules above, was not my work and is not described here.',
      implementation: [
        { title: 'Frontend', body: 'React screens for the invoicing, receivables and reports modules.' },
        { title: 'APIs', body: 'Express.js endpoints serving those modules to the frontend.' },
        { title: 'Data', body: 'PostgreSQL-backed workflows that persist invoices, receivable status and report data.' },
      ],
      workflow: {
        title: 'How the modules I owned relate',
        steps: [
          { label: 'Invoice raised', meta: 'invoicing' },
          { label: 'Receivable tracked', meta: 'receivables' },
          { label: 'Payment collected', meta: 'receivables' },
          { label: 'Report generated', meta: 'reports' },
        ],
      },
      decisions: [
        {
          // CONFIRM: inferred from the module scope, not stated in the résumé.
          title: 'One record, three modules',
          body: 'Invoices, receivables and reports describe the same money, so the modules work from shared database-backed records instead of keeping separate copies.',
        },
        {
          title: 'Clear contracts inside a team',
          body: 'Owning specific modules in a shared codebase means agreeing explicit API contracts, so my modules and the rest of the platform can change independently.',
        },
      ],
    },
  },
  {
    slug: 'haylow',
    name: 'Haylow.ai',
    kind: 'AI Search Visibility Platform',
    categories: ['saas', 'ai'],
    featured: true,
    href: 'https://haylow.ai/',
    summary:
      'Measures how brands appear in AI-generated search answers: mentions, sentiment, citations and competitor visibility.',
    role: 'Built the integrations with 4 AI providers and the backend workflows for response processing and persistent data that feed analytics and competitor reporting.',
    stack: ['React.js', 'Node.js', 'Express.js', 'PostgreSQL', 'AI APIs'],
    mockup: 'visibility',
    caseStudy: {
      overview:
        'Haylow.ai is an AI search visibility platform. It measures how brands appear in AI-generated answers: mentions, sentiment, citations and competitor visibility.',
      context:
        'People increasingly ask AI assistants for recommendations. Brands need to know whether they are mentioned, how they are described and which sources the answers cite.',
      mine: [
        'Built the integrations with 4 AI providers.',
        'Built the backend workflows for response processing and persistent data management that feed visibility analytics and competitor reporting.',
      ],
      team: 'Haylow.ai was built by a team. The parts of the product beyond the provider integrations and these backend workflows were not my work.',
      implementation: [
        { title: 'Provider integrations', body: 'Integrations with 4 AI providers, run from the Node.js/Express.js backend.' },
        { title: 'Response processing', body: 'Backend workflows that process provider responses into structured data.' },
        { title: 'Persistence', body: 'PostgreSQL storage that analytics and competitor reporting read from.' },
      ],
      workflow: {
        title: 'From query to visibility report',
        steps: [
          { label: 'Brand queries', meta: 'input' },
          { label: '4 AI providers', meta: 'integrations' },
          { label: 'Response processing', meta: 'backend' },
          { label: 'PostgreSQL', meta: 'persisted' },
          { label: 'Visibility analytics', meta: 'reporting' },
        ],
      },
      decisions: [
        {
          // CONFIRM: matches Vinod's stated practice; confirm it applies to Haylow.
          title: 'Providers stay behind the backend',
          body: 'Provider calls run server-side, so API keys, prompts and failure handling never reach the browser.',
        },
        {
          // CONFIRM: inferred from "integrations + response processing feed analytics".
          title: 'One pipeline for every provider',
          body: 'Each provider integration feeds the same processing and storage workflow, so results can be compared across providers and over time.',
        },
      ],
    },
  },
  {
    slug: 'ongrid',
    name: 'OnGrid.work',
    kind: 'Team Operations SaaS',
    categories: ['saas'],
    featured: true,
    href: 'https://ongrid.work/',
    summary:
      'A team operations platform connecting project management, task ownership, workload planning and business processes.',
    role: 'Built the core application modules and backend workflows end to end: React interfaces, Express.js REST APIs and PostgreSQL data models.',
    stack: ['React.js', 'Node.js', 'Express.js', 'PostgreSQL'],
    mockup: 'operations',
    caseStudy: {
      overview:
        'OnGrid.work is a team operations platform. It connects project management, task ownership, workload planning and day-to-day business processes in one workspace.',
      context:
        'Project management, task ownership, workload planning and business processes need to live in one workspace instead of being scattered across tools.',
      mine: [
        'Built the core application modules end to end.',
        'Built the backend workflows behind them: React interfaces, Express.js REST APIs and PostgreSQL data models.',
      ],
      team: 'This page covers the core modules and backend workflows I built. It does not describe parts of the product outside that scope.',
      implementation: [
        { title: 'Interfaces', body: 'React interfaces for the core modules.' },
        { title: 'REST APIs', body: 'Express.js REST APIs implementing the backend workflows.' },
        { title: 'Data models', body: 'PostgreSQL data models connecting projects, tasks, workload and processes.' },
      ],
      workflow: {
        title: 'How work moves through the core modules',
        steps: [
          { label: 'Client brief', meta: 'intake' },
          { label: 'Project', meta: 'planning' },
          { label: 'Tasks + owners', meta: 'ownership' },
          { label: 'Workload', meta: 'capacity' },
          { label: 'Approval', meta: 'process' },
        ],
      },
      decisions: [
        {
          // CONFIRM: follows from "PostgreSQL data models connecting modules".
          title: 'One connected data model',
          body: 'Projects, tasks, workload and processes share persistent records, so a change in one module is reflected in the others.',
        },
        {
          title: 'REST contracts between UI and services',
          body: 'Explicit endpoint contracts, request validation and error handling keep the React interfaces and Express services decoupled as modules grow.',
        },
      ],
    },
  },
  {
    slug: 'active-indian',
    name: 'Active Indian',
    kind: 'AI content automation',
    categories: ['ai'],
    href: null,
    summary:
      'Agent-driven system producing blog, social and LinkedIn content with channel-specific prompts, routing each asset to its channel only after backend checks.',
    stack: ['React.js', 'Node.js', 'PostgreSQL', 'OpenAI API'],
  },
  {
    slug: 'garagecollective',
    name: 'Garagecollective.agency',
    kind: 'Generative AI platform',
    categories: ['ai'],
    href: 'https://garagecollective.agency/',
    summary: 'GPT-backed platform turning structured client briefs into blog, social and LinkedIn copy.',
    stack: ['React.js', 'Express.js', 'PostgreSQL', 'OpenAI API'],
  },
  {
    slug: 'ujjwalaa',
    name: 'Ujjwalaa',
    kind: 'Shopify e-commerce',
    categories: ['ecommerce'],
    href: 'https://ujjwalaa.com/',
    summary:
      'Storefront for a natural skincare and haircare brand: collections, promotional bundles and content-led product discovery.',
    stack: ['Shopify'],
  },
  {
    slug: 'kaayu-rituals',
    name: 'Kaayu Rituals',
    kind: 'Shopify e-commerce',
    categories: ['ecommerce'],
    href: 'https://www.kaayurituals.com/',
    summary:
      'Storefront for an Ayurvedic wellness brand, organising skincare, haircare and herbal tea through structured collections and educational content.',
    stack: ['Shopify'],
  },
  {
    slug: 'garage-productions',
    name: 'Garage Productions',
    kind: 'Company web platform',
    categories: ['web'],
    href: 'https://www.garageproductions.in/',
    summary: 'Database-driven company site with PostgreSQL-backed content management.',
    stack: ['React.js', 'Express.js', 'PostgreSQL'],
  },
  {
    slug: 'dhyeya-ias',
    name: 'Dhyeya IAS',
    kind: 'WordPress website',
    categories: ['web'],
    href: 'https://www.dhyeyaias.com/',
    summary: 'Client website delivered on WordPress.',
    stack: ['WordPress'],
  },
  {
    slug: 'mpgi',
    name: 'MPGI',
    kind: 'WordPress website',
    categories: ['web'],
    href: 'https://www.mpgi.edu.in/',
    summary: 'Client website delivered on WordPress.',
    stack: ['WordPress'],
  },
  {
    slug: 'elysian-nglorry',
    name: 'Elysian Nglorry',
    kind: 'WordPress website',
    categories: ['web'],
    href: 'https://www.elysiannglorry.com/',
    summary: 'Client website delivered on WordPress.',
    stack: ['WordPress'],
  },
  {
    slug: 'world5-fund',
    name: 'World5 Fund',
    kind: 'PHP website',
    categories: ['web'],
    href: 'https://world5.fund/',
    summary: 'Client website delivered in PHP.',
    stack: ['PHP'],
  },
  {
    slug: 'iday',
    name: 'iDAY Archive 2025',
    kind: 'PHP website',
    categories: ['web'],
    href: 'https://iday.in/',
    summary: 'Client website delivered in PHP.',
    stack: ['PHP'],
  },
]

export const featuredProjects = projects.filter((p) => p.featured)
export const caseStudies = projects.filter((p) => p.caseStudy)

export const getProject = (slug) => projects.find((p) => p.slug === slug)

export const projectPath = (p) => `/projects/${p.slug}`

export const hostOf = (href) => href.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
