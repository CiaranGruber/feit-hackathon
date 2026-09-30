import { Link } from 'react-router-dom'
import { headingClasses, primaryActionClasses } from '../components/onboarding/styles.ts'

// Route placeholders keep navigation usable without inventing the unbuilt screens.
export function UpcomingPage({ title }: { title: 'Explore' | 'Profile' }) {
  return <section className="px-6 pt-10 pb-8">
    <title>{`${title} · nowIdea`}</title>
    <h1 className={headingClasses}>{title}</h1>
    <p className="mt-5 mb-8 text-[16px] leading-7 text-muted">This page is coming soon. In the meantime, discover an idea or chat with your companion on Home.</p>
    <Link to="/home" className={primaryActionClasses}>Back to Home</Link>
  </section>
}
