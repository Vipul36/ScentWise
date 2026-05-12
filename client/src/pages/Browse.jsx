import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, Star, Filter, X, Loader2 } from 'lucide-react'
import { api } from '../api'

export default function Browse() {
  const [perfumes, setPerfumes] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({
    fragrance_family: '',
    gender: '',
    min_price: '',
    max_price: '',
    sort_by: 'rating',
    sort_order: 'DESC',
  })
  const [showFilters, setShowFilters] = useState(false)
  const limit = 20

  const families = ['citrus', 'floral', 'woody', 'oriental', 'fresh', 'aquatic', 'gourmand', 'aromatic', 'spicy', 'fruity', 'chypre', 'fougere', 'leather', 'musk', 'green']

  useEffect(() => {
    loadPerfumes()
  }, [page, filters])

  async function loadPerfumes() {
    setLoading(true)
    try {
      const params = { page, limit, ...filters }
      if (search) params.search = search
      Object.keys(params).forEach(k => { if (!params[k]) delete params[k] })
      const result = await api.getPerfumes(params)
      setPerfumes(result.data || [])
      setTotal(result.meta?.total || 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(e) {
    e.preventDefault()
    setPage(1)
    loadPerfumes()
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-[family-name:var(--font-display)] mb-2">Browse Perfumes</h1>
          <p className="text-text-secondary">Explore our catalog of {total} fragrances</p>
        </div>

        {/* Search & Filter bar */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <form onSubmit={handleSearch} className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or brand..."
              className="input-field pl-11"
            />
          </form>
          <button onClick={() => setShowFilters(!showFilters)} className="btn-secondary flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {Object.values(filters).filter(v => v).length > 2 && (
              <span className="bg-accent text-white text-xs rounded-full px-1.5">{Object.values(filters).filter(v => v).length - 2}</span>
            )}
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="glass-card p-5 mb-6 fade-in">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="text-xs text-text-muted mb-1 block">Fragrance Family</label>
                <select
                  value={filters.fragrance_family}
                  onChange={(e) => { setFilters(f => ({ ...f, fragrance_family: e.target.value })); setPage(1) }}
                  className="input-field text-sm"
                >
                  <option value="">All families</option>
                  {families.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1 block">Gender</label>
                <select
                  value={filters.gender}
                  onChange={(e) => { setFilters(f => ({ ...f, gender: e.target.value })); setPage(1) }}
                  className="input-field text-sm"
                >
                  <option value="">All</option>
                  <option value="male">Men</option>
                  <option value="female">Women</option>
                  <option value="unisex">Unisex</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1 block">Min Price (₹)</label>
                <input
                  type="number"
                  value={filters.min_price}
                  onChange={(e) => { setFilters(f => ({ ...f, min_price: e.target.value })); setPage(1) }}
                  placeholder="0"
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1 block">Max Price (₹)</label>
                <input
                  type="number"
                  value={filters.max_price}
                  onChange={(e) => { setFilters(f => ({ ...f, max_price: e.target.value })); setPage(1) }}
                  placeholder="50000"
                  className="input-field text-sm"
                />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <select
                value={filters.sort_by}
                onChange={(e) => { setFilters(f => ({ ...f, sort_by: e.target.value })); setPage(1) }}
                className="input-field text-sm max-w-[200px]"
              >
                <option value="rating">Sort by Rating</option>
                <option value="price">Sort by Price</option>
                <option value="review_count">Sort by Popularity</option>
                <option value="perfume_name">Sort by Name</option>
              </select>
              <select
                value={filters.sort_order}
                onChange={(e) => { setFilters(f => ({ ...f, sort_order: e.target.value })); setPage(1) }}
                className="input-field text-sm max-w-[140px]"
              >
                <option value="DESC">High to Low</option>
                <option value="ASC">Low to High</option>
              </select>
            </div>
          </div>
        )}

        {/* Perfume grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : perfumes.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-text-secondary">No perfumes found matching your criteria.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {perfumes.map((p) => (
                <Link
                  key={p.id}
                  to={`/perfume/${p.id}`}
                  className="glass-card p-5 group hover:border-accent/30 transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="tag text-xs">{p.fragrance_family}</span>
                    {p.rating && (
                      <span className="flex items-center gap-1 text-sm text-gold">
                        <Star className="h-3 w-3 fill-gold" />
                        {Number(p.rating).toFixed(1)}
                      </span>
                    )}
                  </div>

                  <h3 className="font-semibold text-base mb-0.5 group-hover:text-accent-light transition-colors line-clamp-1">
                    {p.perfume_name}
                  </h3>
                  <p className="text-sm text-text-secondary mb-3">{p.brand}</p>

                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-emerald">₹{Number(p.price).toLocaleString()}</span>
                    <span className="tag text-xs">{p.gender}</span>
                  </div>

                  {p.top_notes && p.top_notes.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {p.top_notes.slice(0, 3).map(n => (
                        <span key={n} className="text-xs text-text-muted">{n}</span>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary text-sm disabled:opacity-30"
                >
                  Previous
                </button>
                <span className="text-sm text-text-secondary px-4">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-secondary text-sm disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
