// Original, CSS-built interface sketches. They illustrate the *kind* of
// product each project is; all names and numbers are placeholder demo data
// and the caption says so.

function FinanceMockup() {
  const rows = [
    ['INV-1042', 'Client A', 'Paid', '₹48,000'],
    ['INV-1043', 'Client B', 'Due', '₹1,20,000'],
    ['INV-1044', 'Client C', 'Overdue', '₹36,500'],
    ['INV-1045', 'Client D', 'Due', '₹72,000'],
  ]
  const aging = [
    ['0–30', 78],
    ['31–60', 46],
    ['61–90', 22],
    ['90+', 12],
  ]
  return (
    <div className="mk mk--finance">
      <div className="mk__head">
        <span className="mk__title">Receivables</span>
        <span className="mk__tabs">
          <span className="is-active">Invoices</span>
          <span>Collections</span>
          <span>Reports</span>
        </span>
      </div>
      <div className="mk__body mk-finance">
        <div className="mk-table">
          {rows.map(([id, client, status, amount]) => (
            <div className="mk-row" key={id}>
              <span className="mk-mono">{id}</span>
              <span>{client}</span>
              <span className={`mk-badge mk-badge--${status.toLowerCase()}`}>{status}</span>
              <span className="mk-mono mk-right">{amount}</span>
            </div>
          ))}
        </div>
        <div className="mk-aging">
          <span className="mk-caption">Ageing (days)</span>
          {aging.map(([label, v]) => (
            <div className="mk-aging__row" key={label}>
              <span className="mk-mono">{label}</span>
              <span className="mk-track">
                <span className="mk-bar" style={{ '--v': v }} />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function VisibilityMockup() {
  const models = [
    ['Model A', 82],
    ['Model B', 64],
    ['Model C', 71],
    ['Model D', 48],
  ]
  return (
    <div className="mk mk--visibility">
      <div className="mk__head">
        <span className="mk__title">Brand visibility</span>
        <span className="mk-chip">Run #18 · compared to last run</span>
      </div>
      <div className="mk__body mk-visibility">
        <div className="mk-score">
          <span className="mk-caption">Visibility score</span>
          <span className="mk-score__value">68</span>
          <span className="mk-badge mk-badge--paid">Sentiment: positive</span>
        </div>
        <div className="mk-columns">
          {models.map(([name, v]) => (
            <div className="mk-col" key={name}>
              <span className="mk-col__track">
                <span className="mk-col__bar" style={{ '--v': v }} />
              </span>
              <span className="mk-mono">{name}</span>
            </div>
          ))}
        </div>
        <div className="mk-citations">
          <span className="mk-caption">Top cited sources</span>
          <span className="mk-line" style={{ '--w': 0.9 }} />
          <span className="mk-line" style={{ '--w': 0.7 }} />
          <span className="mk-line" style={{ '--w': 0.55 }} />
        </div>
      </div>
    </div>
  )
}

function OperationsMockup() {
  const cols = [
    ['Briefs', ['Website refresh', 'Q3 campaign']],
    ['In progress', ['Client onboarding', 'Asset review', 'Landing page']],
    ['Approval', ['Pitch deck']],
  ]
  const load = [
    ['AK', 0.82],
    ['RS', 0.58],
    ['MT', 0.36],
  ]
  return (
    <div className="mk mk--operations">
      <div className="mk__head">
        <span className="mk__title">Team board</span>
        <span className="mk__tabs">
          <span className="is-active">Projects</span>
          <span>Workload</span>
          <span>Approvals</span>
        </span>
      </div>
      <div className="mk__body mk-ops">
        <div className="mk-board">
          {cols.map(([title, cards]) => (
            <div className="mk-board__col" key={title}>
              <span className="mk-caption">
                {title} <em>{cards.length}</em>
              </span>
              {cards.map((c) => (
                <span className="mk-card" key={c}>
                  {c}
                </span>
              ))}
            </div>
          ))}
        </div>
        <div className="mk-load">
          <span className="mk-caption">Workload this week</span>
          {load.map(([who, v]) => (
            <div className="mk-load__row" key={who}>
              <span className="mk-avatar">{who}</span>
              <span className="mk-track">
                <span className="mk-bar" style={{ '--v': v * 100 }} />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const VARIANTS = {
  finance: FinanceMockup,
  visibility: VisibilityMockup,
  operations: OperationsMockup,
}

export default function ProjectMockup({ variant }) {
  const Mockup = VARIANTS[variant]
  return (
    <figure className="project-mockup">
      <div aria-hidden="true">
        <Mockup />
      </div>
      <figcaption className="illustrative-note">Illustrative mock-up, not product data</figcaption>
    </figure>
  )
}
