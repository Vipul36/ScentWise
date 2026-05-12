import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Star, ArrowLeft, Sparkles, Loader2, Droplets, Clock, Wind } from 'lucide-react'
import { api } from '../api'

export default function PerfumeDetail() {
  const { id } = useParams()
  const [perfume, setPerfume] = useState(null)
  const [loading, setLoading] = useState(true)
  const [noteExplanations, setNoteExplanations] = useState({})
  const [expandedNote, setExpandedNote] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const result = await api.getPerfume(id)
        setPerfume(result.data)
        // Track view interaction
        api.trackInteraction({ event_type: 'perfume_viewed', perfume_id: id, session_id: `sess_${Date.now()}` }).catch(() => {})
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function explainNote(noteName) {
    if (noteExplanations[noteName]) {
      setExpandedNote(expandedNote === noteName ? null : noteName)
      return
    }
    setExpandedNote(noteName)
    try {
      const result = await api.explainNote(noteName)
      setNoteExplanations(prev => ({ ...prev, [noteName]: result.data.explanation }))
    } catch (err) {
      setNoteExplanations(prev => ({ ...prev, [noteName]: 'Explanation unavailable.' }))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  if (!perfume) {
    return (
      <div className="px-6 py-20 text-center">
        <p className="text-text-secondary mb-4">Perfume not found.</p>
        <Link to="/browse" className="btn-primary">Browse Catalog</Link>
      </div>
    )
  }

  const intensityMap = { light: 25, moderate: 50, strong: 75, intense: 100 }
  const longevityMap = { short: 25, moderate: 50, long: 75, very_long: 100 }
  const sillageMap = { intimate: 25, moderate: 50, strong: 75, enormous: 100 }

  function NoteSection({ title, notes, icon: Icon }) {
    if (!notes || notes.length === 0) return null
    return (
      <div>
        <h3 className="text-sm font-medium text-text-muted mb-2 flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5" />
          {title}
        </h3>
        <div className="flex flex-wrap gap-2">
          {notes.map(note => (
            <div key={note}>
              <button
                onClick={() => explainNote(note)}
                className={`tag cursor-pointer hover:border-accent hover:text-accent-light ${expandedNote === note ? 'tag-selected' : ''}`}
              >
                {note}
                <Sparkles className="h-3 w-3 ml-1 text-accent opacity-50" />
              </button>
              {expandedNote === note && noteExplanations[note] && (
                <div className="mt-1 p-2.5 rounded-lg bg-accent-glow border border-accent/20 text-xs text-text-secondary max-w-xs">
                  {noteExplanations[note]}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <Link to="/browse" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to catalog
        </Link>

        <div className="glass-card p-8 fade-in">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="tag">{perfume.fragrance_family}</span>
                <span className="tag">{perfume.gender}</span>
              </div>
              <h1 className="text-3xl font-bold font-[family-name:var(--font-display)] mb-1">
                {perfume.perfume_name}
              </h1>
              <p className="text-lg text-text-secondary">{perfume.brand}</p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-3xl font-bold text-emerald">₹{Number(perfume.price).toLocaleString()}</div>
              {perfume.rating && (
                <div className="flex items-center gap-1 justify-end mt-1 text-gold">
                  <Star className="h-4 w-4 fill-gold" />
                  <span className="font-semibold">{Number(perfume.rating).toFixed(1)}</span>
                  <span className="text-text-muted text-sm">({perfume.review_count} reviews)</span>
                </div>
              )}
            </div>
          </div>

          {/* AI Description */}
          {perfume.ai_description && (
            <div className="p-4 rounded-xl bg-accent-glow border border-accent/20 mb-6">
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-accent-light">What this perfume feels like</span>
              </div>
              <p className="text-text-secondary leading-relaxed">{perfume.ai_description}</p>
            </div>
          )}

          {/* Characteristics */}
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            {[
              { label: 'Intensity', value: perfume.intensity, pct: intensityMap[perfume.intensity] || 50, icon: Droplets, color: 'from-accent to-purple-600' },
              { label: 'Longevity', value: perfume.longevity, pct: longevityMap[perfume.longevity] || 50, icon: Clock, color: 'from-emerald to-teal-600' },
              { label: 'Sillage', value: perfume.sillage, pct: sillageMap[perfume.sillage] || 50, icon: Wind, color: 'from-sky to-blue-600' },
            ].map(({ label, value, pct, icon: Icon, color }) => (
              <div key={label} className="p-4 rounded-xl bg-bg-secondary border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4 text-text-muted" />
                  <span className="text-sm text-text-muted">{label}</span>
                </div>
                <div className="text-base font-medium capitalize mb-2">{value?.replace('_', ' ')}</div>
                <div className="score-bar">
                  <div className={`score-bar-fill bg-gradient-to-r ${color}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className="space-y-5 mb-6">
            <p className="text-xs text-text-muted flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-accent" />
              Click any note to see its AI explanation
            </p>
            <NoteSection title="Top Notes (first impression)" notes={perfume.top_notes} icon={Droplets} />
            <NoteSection title="Middle Notes (heart)" notes={perfume.middle_notes} icon={Sparkles} />
            <NoteSection title="Base Notes (dry down)" notes={perfume.base_notes} icon={Wind} />
          </div>

          {/* Seasons & Occasions */}
          <div className="grid gap-4 md:grid-cols-2">
            {perfume.seasons && perfume.seasons.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-text-muted mb-2">Best Seasons</h3>
                <div className="flex flex-wrap gap-2">
                  {perfume.seasons.map(s => <span key={s} className="tag capitalize">{s}</span>)}
                </div>
              </div>
            )}
            {perfume.occasions && perfume.occasions.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-text-muted mb-2">Best Occasions</h3>
                <div className="flex flex-wrap gap-2">
                  {perfume.occasions.map(o => <span key={o} className="tag capitalize">{o.replace('_', ' ')}</span>)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
