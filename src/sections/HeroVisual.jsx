// Abstract diagram of how I structure AI features: the model sits behind the
// API and every output passes server-side validation before it is stored or
// returned. Decorative; the same idea is stated in text elsewhere.

const NODES = [
  { id: 'ui', x: 65, y: 24, w: 170, label: 'React UI', meta: 'client' },
  { id: 'api', x: 65, y: 112, w: 170, label: 'Express REST API', meta: 'service' },
  { id: 'llm', x: 282, y: 156, w: 158, label: 'LLM provider', meta: 'OpenAI / GPT', variant: 'signal' },
  { id: 'rules', x: 65, y: 200, w: 170, label: 'Validation + rules', meta: 'server-side', variant: 'accent' },
  { id: 'db', x: 65, y: 288, w: 170, label: 'PostgreSQL', meta: 'persisted' },
]

const EDGES = [
  'M150 68V112',
  'M150 156V200',
  'M150 244V288',
  'M235 134H326Q361 134 361 156',
  'M361 200Q361 222 326 222H235',
]

const ROUTE = 'M150 68V134H326Q361 134 361 156V200Q361 222 326 222H150V288'

export default function HeroVisual() {
  return (
    <figure className="hero-visual" aria-hidden="true">
      <div className="hero-visual__bar">
        <span className="hero-visual__dots">
          <i />
          <i />
          <i />
        </span>
        <span className="hero-visual__file">request-path</span>
      </div>
      <svg className="hero-visual__svg" viewBox="0 0 460 350" role="presentation">
        <defs>
          <radialGradient id="hv-glow">
            <stop offset="0" stopColor="var(--signal-teal)" stopOpacity="0.9" />
            <stop offset="1" stopColor="var(--signal-teal)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {EDGES.map((d) => (
          <path key={d} className="hv-edge" d={d} />
        ))}
        {EDGES.map((d) => (
          <path key={`f-${d}`} className="hv-flow" d={d} />
        ))}
        <path className="hv-route" d={ROUTE} />

        <text className="hv-edge-label" x="252" y="126">prompt</text>
        <text className="hv-edge-label" x="252" y="238">output</text>
        <text className="hv-edge-label" x="160" y="272">validated write</text>

        {NODES.map((n) => (
          <g key={n.id} className={`hv-node ${n.variant ? `hv-node--${n.variant}` : ''}`}>
            <rect x={n.x} y={n.y} width={n.w} height="44" rx="10" />
            <text className="hv-node__label" x={n.x + 14} y={n.y + 19}>
              {n.label}
            </text>
            <text className="hv-node__meta" x={n.x + 14} y={n.y + 34}>
              {n.meta}
            </text>
          </g>
        ))}

        <g className="hv-packet" transform="translate(150 68)">
          <circle r="10" fill="url(#hv-glow)" />
          <circle r="3.5" className="hv-packet__core" />
        </g>
      </svg>
      <figcaption className="hero-visual__status">
        <span className="hero-visual__pulse" />
        Model output never reaches the client unvalidated
      </figcaption>
    </figure>
  )
}
