import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { BarChart3, Users, Sparkles, TrendingUp, ShoppingCart, MousePointer, Loader2 } from 'lucide-react'
import { api } from '../api'

const CHART_COLORS = ['#8b5cf6', '#a78bfa', '#f472b6', '#34d399', '#38bdf8', '#f5c542', '#e17055', '#00b894', '#636e72', '#fd79a8']

function MetricCard({ icon: Icon, label, value, sub, color = 'text-accent' }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl bg-bg-secondary`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div>
          <div className="text-2xl font-bold font-[family-name:var(--font-display)]">{value}</div>
          <div className="text-sm text-text-secondary">{label}</div>
          {sub && <div className="text-xs text-text-muted">{sub}</div>}
        </div>
      </div>
    </div>
  )
}

function ChartCard({ title, children }) {
  return (
    <div className="glass-card p-5">
      <h3 className="text-base font-semibold mb-4">{title}</h3>
      {children}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-bg-card border border-border rounded-xl p-3 shadow-xl text-sm">
      <p className="font-medium text-text-primary mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-text-secondary">
          {p.name}: <span className="font-medium text-text-primary">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [overview, setOverview] = useState(null)
  const [prefDist, setPrefDist] = useState(null)
  const [perfPerf, setPerfPerf] = useState(null)
  const [recPerf, setRecPerf] = useState(null)
  const [topNotes, setTopNotes] = useState(null)
  const [priceDist, setPriceDist] = useState(null)
  const [ratingDist, setRatingDist] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    async function loadAll() {
      try {
        const [ov, pd, pp, rp, tn, prd, rd] = await Promise.allSettled([
          api.getAnalyticsOverview(),
          api.getPreferenceDistribution(),
          api.getPerfumePerformance(),
          api.getRecommendationPerformance(),
          api.getTopNotes(),
          api.getPriceDistribution(),
          api.getRatingDistribution(),
        ])
        if (ov.status === 'fulfilled') setOverview(ov.value.data)
        if (pd.status === 'fulfilled') setPrefDist(pd.value.data)
        if (pp.status === 'fulfilled') setPerfPerf(pp.value.data)
        if (rp.status === 'fulfilled') setRecPerf(rp.value.data)
        if (tn.status === 'fulfilled') setTopNotes(tn.value.data)
        if (prd.status === 'fulfilled') setPriceDist(prd.value.data)
        if (rd.status === 'fulfilled') setRatingDist(rd.value.data)
      } catch (err) {
        console.error('Dashboard load error:', err)
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, [])

  const tabs = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'preferences', label: 'User Preferences', icon: Users },
    { key: 'perfumes', label: 'Perfume Performance', icon: Sparkles },
    { key: 'recommendations', label: 'Recommendations', icon: TrendingUp },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto mb-4" />
          <p className="text-text-secondary">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold font-[family-name:var(--font-display)] mb-1">Analytics Dashboard</h1>
          <p className="text-text-secondary">Platform performance and user behavior insights</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 overflow-x-auto pb-2">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === key
                  ? 'bg-accent-glow text-accent-light'
                  : 'text-text-secondary hover:bg-bg-hover'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && overview && (
          <div className="space-y-6 fade-in">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard icon={Users} label="Total Users" value={overview.total_users} color="text-accent" />
              <MetricCard icon={Users} label="Active Users (30d)" value={overview.active_users_30d} color="text-emerald" />
              <MetricCard icon={Sparkles} label="Total Perfumes" value={overview.total_perfumes} color="text-sky" />
              <MetricCard icon={TrendingUp} label="Recommendations" value={overview.total_recommendations} color="text-rose" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard icon={MousePointer} label="Recommendation CTR" value={`${overview.recommendation_ctr}%`} sub="Views → Clicks" color="text-gold" />
              <MetricCard icon={ShoppingCart} label="Conversion Rate" value={`${overview.conversion_rate}%`} sub="Views → Purchases" color="text-emerald" />
              <MetricCard icon={BarChart3} label="Total Reviews" value={overview.total_reviews} color="text-accent" />
              <MetricCard icon={Sparkles} label="Avg Review Rating" value={overview.avg_review_rating || 'N/A'} color="text-gold" />
            </div>

            {/* Price Distribution Chart */}
            {priceDist && priceDist.length > 0 && (
              <ChartCard title="Perfumes by Price Range">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={priceDist}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3d" />
                    <XAxis dataKey="price_range" tick={{ fill: '#94949e', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#94949e', fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Perfumes" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {/* Rating Distribution */}
            {ratingDist && ratingDist.length > 0 && (
              <ChartCard title="Rating Distribution">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ratingDist}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3d" />
                    <XAxis dataKey="rating_range" tick={{ fill: '#94949e', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#94949e', fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" fill="#f472b6" radius={[6, 6, 0, 0]} name="Perfumes" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </div>
        )}

        {/* PREFERENCES TAB */}
        {activeTab === 'preferences' && prefDist && (
          <div className="space-y-6 fade-in">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Fragrance Family Preferences */}
              {prefDist.familyDist && prefDist.familyDist.length > 0 && (
                <ChartCard title="Preferred Fragrance Families">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={prefDist.familyDist.slice(0, 8)}
                        dataKey="count"
                        nameKey="family"
                        cx="50%" cy="50%"
                        outerRadius={100}
                        label={({ family, count }) => `${family} (${count})`}
                      >
                        {prefDist.familyDist.slice(0, 8).map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {/* Season Preferences */}
              {prefDist.seasonDist && prefDist.seasonDist.length > 0 && (
                <ChartCard title="Season Preferences">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={prefDist.seasonDist}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3d" />
                      <XAxis dataKey="season" tick={{ fill: '#94949e', fontSize: 12 }} />
                      <YAxis tick={{ fill: '#94949e', fontSize: 12 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Selections">
                        {prefDist.seasonDist.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {/* Occasion Preferences */}
              {prefDist.occasionDist && prefDist.occasionDist.length > 0 && (
                <ChartCard title="Occasion Preferences">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={prefDist.occasionDist} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3d" />
                      <XAxis type="number" tick={{ fill: '#94949e', fontSize: 12 }} />
                      <YAxis type="category" dataKey="occasion" tick={{ fill: '#94949e', fontSize: 11 }} width={80} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" fill="#34d399" radius={[0, 6, 6, 0]} name="Selections" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {/* Budget Distribution */}
              {prefDist.budgetDist && prefDist.budgetDist.length > 0 && (
                <ChartCard title="Budget Distribution">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={prefDist.budgetDist}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3d" />
                      <XAxis dataKey="budget_range" tick={{ fill: '#94949e', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#94949e', fontSize: 12 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" fill="#f5c542" radius={[6, 6, 0, 0]} name="Users" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}
            </div>
          </div>
        )}

        {/* PERFUME PERFORMANCE TAB */}
        {activeTab === 'perfumes' && (
          <div className="space-y-6 fade-in">
            {/* Top Notes */}
            {topNotes && topNotes.length > 0 && (
              <ChartCard title="Most Used Fragrance Notes">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={topNotes.slice(0, 15)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3d" />
                    <XAxis type="number" tick={{ fill: '#94949e', fontSize: 12 }} />
                    <YAxis type="category" dataKey="note_name" tick={{ fill: '#94949e', fontSize: 11 }} width={100} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="usage_count" fill="#a78bfa" radius={[0, 6, 6, 0]} name="Usage Count" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {/* Top Perfumes Table */}
            {perfPerf && perfPerf.length > 0 && (
              <ChartCard title="Top Perfumes by Engagement">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 text-text-muted font-medium">Perfume</th>
                        <th className="text-left py-2 text-text-muted font-medium">Brand</th>
                        <th className="text-right py-2 text-text-muted font-medium">Price</th>
                        <th className="text-right py-2 text-text-muted font-medium">Rating</th>
                        <th className="text-right py-2 text-text-muted font-medium">Views</th>
                        <th className="text-right py-2 text-text-muted font-medium">Clicks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {perfPerf.slice(0, 15).map((p, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-bg-hover transition-colors">
                          <td className="py-2.5 font-medium">{p.perfume_name}</td>
                          <td className="py-2.5 text-text-secondary">{p.brand}</td>
                          <td className="py-2.5 text-right text-emerald">₹{Number(p.price).toLocaleString()}</td>
                          <td className="py-2.5 text-right text-gold">{Number(p.rating).toFixed(1)}</td>
                          <td className="py-2.5 text-right">{p.views}</td>
                          <td className="py-2.5 text-right">{p.clicks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ChartCard>
            )}
          </div>
        )}

        {/* RECOMMENDATION PERFORMANCE TAB */}
        {activeTab === 'recommendations' && recPerf && (
          <div className="space-y-6 fade-in">
            {recPerf.length > 0 && (
              <ChartCard title="Recommendations by Fragrance Family">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={recPerf}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3d" />
                    <XAxis dataKey="fragrance_family" tick={{ fill: '#94949e', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94949e', fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="times_recommended" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Times Recommended" />
                    <Bar dataKey="clicks" fill="#34d399" radius={[6, 6, 0, 0]} name="Clicks" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {/* Recommendation performance table */}
            {recPerf.length > 0 && (
              <ChartCard title="Recommendation Performance by Category">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 text-text-muted font-medium">Family</th>
                        <th className="text-right py-2 text-text-muted font-medium">Recommended</th>
                        <th className="text-right py-2 text-text-muted font-medium">Avg Score</th>
                        <th className="text-right py-2 text-text-muted font-medium">Clicks</th>
                        <th className="text-right py-2 text-text-muted font-medium">Purchases</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recPerf.map((r, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-bg-hover transition-colors">
                          <td className="py-2.5 font-medium capitalize">{r.fragrance_family}</td>
                          <td className="py-2.5 text-right">{r.times_recommended}</td>
                          <td className="py-2.5 text-right text-accent">{r.avg_score}</td>
                          <td className="py-2.5 text-right text-emerald">{r.clicks}</td>
                          <td className="py-2.5 text-right text-gold">{r.purchases}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ChartCard>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
