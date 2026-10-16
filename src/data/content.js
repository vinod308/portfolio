// Non-project site content. Every claim comes from the approved résumé
// (Vinod_Kumar_Resume_Final). Project content lives in ./projects.js.

export const capabilities = [
  {
    title: 'Frontend engineering',
    body: 'Responsive React interfaces built on clear component boundaries and API contracts that stay decoupled as features change.',
    tech: ['React.js', 'JavaScript (ES6+)', 'HTML5', 'CSS3'],
  },
  {
    title: 'Backend & REST APIs',
    body: 'Express.js services with explicit endpoint contracts, request validation and error handling, plus third-party API integration.',
    tech: ['Node.js', 'Express.js', 'REST API design'],
  },
  {
    title: 'AI / LLM integrations',
    body: 'OpenAI and GPT calls run as a backend service layer. Agent workflows and MCP tools sit behind validation and business rules that decide what output may trigger.',
    tech: ['OpenAI API', 'GPT models', 'AI agents', 'MCP servers', 'Prompt engineering'],
  },
  {
    title: 'Database-backed applications',
    body: 'Schemas for application content, user data and workflow state, and fixing data issues that affect live applications.',
    tech: ['PostgreSQL', 'MySQL', 'Schema design'],
  },
  {
    title: 'Deployment & production',
    body: 'Node.js and PHP apps deployed and maintained on Linux servers, live sites migrated between providers, and defects traced from symptom to root cause.',
    tech: ['Linux/Ubuntu', 'Nginx', 'Apache', 'AWS', 'DigitalOcean', 'k6'],
  },
]

export const experience = [
  {
    role: 'Full Stack Developer',
    company: 'Garage Productions Pvt Ltd',
    location: 'Noida',
    period: 'Jun 2020 – Present',
    start: '2020-06',
    highlights: [
      'Own assigned application modules end to end within a development team, from React UI and Express.js APIs to PostgreSQL schemas, deployment and production support.',
      'Integrate the OpenAI API and GPT models as a backend service layer, and build AI agent workflows and MCP integrations gated by server-side validation.',
      'Deploy and maintain 15+ client applications on Linux servers across AWS, DigitalOcean, Linode and Hostinger; migrated 20+ live sites between providers.',
      'Diagnose production defects across browser, network, API, database and server layers.',
    ],
  },
  {
    role: 'Web Developer',
    company: 'Connecting Dots Pvt Ltd',
    location: null,
    period: 'Nov 2019 – Apr 2020',
    start: '2019-11',
    highlights: [
      'Delivered and maintained client WordPress websites, including customisation, content migrations, release updates and QA before handover.',
      'Installed and administered Apache and Nginx servers, and set up domains and hosting for clients.',
    ],
  },
]

export const navLinks = [
  { label: 'Home', to: '/' },
  { label: 'Projects', to: '/projects' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
]

export const principles = [
  {
    title: 'The backend stays in charge of AI',
    body: 'Model calls run as a backend service layer. Output passes validation and business rules before it can be stored, published or shown.',
  },
  {
    title: 'Clear contracts between client and server',
    body: 'Explicit endpoint contracts, request validation and error handling keep React clients and Express services decoupled as features evolve.',
  },
  {
    title: 'Own the module, end to end',
    body: 'From the React UI and API to the PostgreSQL schema, deployment and production support for the parts I am responsible for.',
  },
  {
    title: 'Root causes over workarounds',
    body: 'Production defects get traced across browser, network, API, database and server until the actual cause is found.',
  },
]

export const skillGroups = [
  {
    title: 'Core full stack',
    items: ['React.js', 'JavaScript (ES6+)', 'HTML5', 'CSS3', 'Node.js', 'Express.js', 'REST API design', 'Third-party API integration', 'Git/GitHub', 'k6 (load testing)'],
  },
  {
    title: 'AI application engineering',
    items: ['OpenAI API', 'GPT models', 'LLM integration', 'AI agent workflows', 'MCP servers', 'Prompt engineering'],
  },
  { title: 'Databases', items: ['PostgreSQL', 'MySQL', 'Schema design', 'Query development'] },
  {
    title: 'Infrastructure & deployment',
    items: ['Linux/Ubuntu', 'Nginx', 'Apache', 'AWS', 'DigitalOcean', 'Linode', 'Hostinger', 'DNS & domains', 'Server & site migration', 'Production troubleshooting'],
  },
  { title: 'CMS / e-commerce', items: ['WordPress', 'WooCommerce', 'Elementor', 'Shopify', 'PHP'] },
  {
    title: 'Exploring (not yet professional use)',
    muted: true,
    items: ['MongoDB', 'JWT authentication', 'RAG', 'Embeddings & vector databases', 'Tool/function calling', 'LLM evaluation', 'Docker', 'TypeScript', 'System design'],
  },
]
