import { Link } from 'react-router'
import Container from '../components/Container.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Button from '../components/Button.jsx'
import { caseStudies, projectPath } from '../data/projects.js'
import { usePageMeta } from '../lib/usePageMeta.js'
import { PAGE_META } from '../lib/pageMeta.js'
import './NotFound.css'

export default function NotFound() {
  usePageMeta(PAGE_META.notFound)
  return (
    <div className="page">
      <Container size="narrow">
        <PageHeader
          eyebrow="404"
          title="This page doesn't exist"
          description="The link may be out of date or mistyped. These are good places to continue:"
        >
          <Button to="/">Back to home</Button>
        </PageHeader>
        <nav aria-label="Suggested pages">
          <ul className="nf-links" role="list">
            <li>
              <Link to="/projects">All projects</Link>
            </li>
            {caseStudies.map((p) => (
              <li key={p.slug}>
                <Link to={projectPath(p)}>{p.name} case study</Link>
              </li>
            ))}
            <li>
              <Link to="/about">About</Link>
            </li>
            <li>
              <Link to="/contact">Contact</Link>
            </li>
          </ul>
        </nav>
      </Container>
    </div>
  )
}
