import { Link } from 'react-router-dom'
import { Sparkles, FlaskConical, BarChart3, Search, ArrowRight, Zap, Brain, Database } from 'lucide-react'

export default function Home() {
  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative overflow-hidden px-6 py-24 md:py-36">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-accent/10 blur-[120px]" />
          <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-rose/10 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-bg-card/50 px-4 py-1.5 text-sm text-text-secondary backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-accent" />
            AI-Powered Fragrance Discovery
          </div>

          <h1 className="mb-6 text-5xl font-extrabold leading-tight tracking-tight md:text-7xl font-[family-name:var(--font-display)]">
            Find Your
            <span className="gradient-text"> Perfect Scent</span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg text-text-secondary leading-relaxed">
            Tell us what you like — your budget, the occasion, the season, your mood.
            Our intelligent recommendation engine finds the ideal perfume and explains exactly why it&apos;s right for you.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/quiz" className="btn-primary flex items-center gap-2 text-lg px-8 py-4">
              Start Discovery Quiz
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link to="/browse" className="btn-secondary flex items-center gap-2 px-8 py-4">
              <Search className="h-4 w-4" />
              Browse Catalog
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-20 border-t border-border">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-4 text-center text-3xl font-bold font-[family-name:var(--font-display)]">
            How It Works
          </h2>
          <p className="mb-14 text-center text-text-secondary max-w-xl mx-auto">
            A data-driven approach to fragrance discovery — no guesswork needed.
          </p>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: FlaskConical,
                title: 'Share Your Preferences',
                desc: 'Tell us your budget, occasion, season, intensity, and fragrance family preferences through our guided quiz.',
                color: 'from-accent to-purple-700'
              },
              {
                icon: Zap,
                title: 'Smart Scoring Engine',
                desc: 'Our weighted scoring algorithm evaluates 800+ perfumes across 8 dimensions to find your ideal matches.',
                color: 'from-emerald to-teal-600'
              },
              {
                icon: Brain,
                title: 'AI-Powered Explanations',
                desc: 'Gemini AI translates complex fragrance notes into simple descriptions so you understand exactly what you\'re getting.',
                color: 'from-rose to-pink-700'
              },
            ].map((step, i) => (
              <div key={i} className="glass-card p-7 fade-in group hover:border-accent/30 transition-all" style={{ animationDelay: `${i * 150}ms` }}>
                <div className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${step.color}`}>
                  <step.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="mb-2.5 text-lg font-semibold">{step.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Features */}
      <section className="px-6 py-20 border-t border-border">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-14 text-center text-3xl font-bold font-[family-name:var(--font-display)]">
            Platform Capabilities
          </h2>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Database, label: '800+', sub: 'Perfumes in catalog', color: 'text-accent' },
              { icon: BarChart3, label: '8', sub: 'Scoring dimensions', color: 'text-emerald' },
              { icon: Brain, label: 'AI', sub: 'Note explanations', color: 'text-rose' },
              { icon: Sparkles, label: '15+', sub: 'Fragrance families', color: 'text-sky' },
            ].map((stat, i) => (
              <div key={i} className="glass-card p-6 text-center group hover:border-accent/30 transition-all">
                <stat.icon className={`h-6 w-6 ${stat.color} mx-auto mb-3`} />
                <div className="text-3xl font-bold mb-1 font-[family-name:var(--font-display)]">{stat.label}</div>
                <div className="text-sm text-text-secondary">{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 border-t border-border">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold font-[family-name:var(--font-display)]">
            Ready to discover your signature scent?
          </h2>
          <p className="mb-8 text-text-secondary">
            Take our 2-minute preference quiz and let our algorithm find your perfect match.
          </p>
          <Link to="/quiz" className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-4">
            Start Now <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-text-muted text-sm">
            <Sparkles className="h-4 w-4 text-accent" />
            ScentWise — Built with data-driven intelligence
          </div>
          <div className="text-sm text-text-muted">
            Synthetic dataset • Open source project
          </div>
        </div>
      </footer>
    </div>
  )
}
