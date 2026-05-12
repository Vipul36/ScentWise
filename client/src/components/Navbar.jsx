import { Link, useLocation } from 'react-router-dom'
import { Sparkles, FlaskConical, LayoutDashboard, Search } from 'lucide-react'

export default function Navbar() {
  const location = useLocation()
  const isActive = (path) => location.pathname === path

  const navLinks = [
    { path: '/', label: 'Home', icon: Sparkles },
    { path: '/quiz', label: 'Discover', icon: FlaskConical },
    { path: '/browse', label: 'Browse', icon: Search },
    { path: '/dashboard', label: 'Analytics', icon: LayoutDashboard },
  ]

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-bg-primary/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-rose">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold font-[family-name:var(--font-display)] tracking-tight group-hover:text-accent-light transition-colors">
            ScentWise
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive(path)
                  ? 'bg-accent-glow text-accent-light'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </div>

        {/* Mobile nav */}
        <div className="flex md:hidden items-center gap-1">
          {navLinks.map(({ path, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`p-2.5 rounded-xl transition-all ${
                isActive(path) ? 'bg-accent-glow text-accent-light' : 'text-text-secondary'
              }`}
            >
              <Icon className="h-5 w-5" />
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
