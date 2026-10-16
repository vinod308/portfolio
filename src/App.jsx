import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'

// Inner pages load on demand so the homepage bundle stays small.
const Projects = lazy(() => import('./pages/Projects.jsx'))
const ProjectDetail = lazy(() => import('./pages/ProjectDetail.jsx'))
const About = lazy(() => import('./pages/About.jsx'))
const Contact = lazy(() => import('./pages/Contact.jsx'))
const NotFound = lazy(() => import('./pages/NotFound.jsx'))

// Phase 2 linked case studies at /work/:slug; keep those links working.
function LegacyWorkRedirect() {
  const { slug } = useParams()
  return <Navigate to={`/projects/${slug}`} replace />
}

const page = (el) => <Suspense fallback={<div className="page" aria-busy="true" />}>{el}</Suspense>

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="projects" element={page(<Projects />)} />
          <Route path="projects/:slug" element={page(<ProjectDetail />)} />
          <Route path="about" element={page(<About />)} />
          <Route path="contact" element={page(<Contact />)} />
          <Route path="work/:slug" element={<LegacyWorkRedirect />} />
          <Route path="*" element={page(<NotFound />)} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
