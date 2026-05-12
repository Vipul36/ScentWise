import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Sparkles, Star, Check, X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { api } from '../api'

function ScoreBar({ label, score, color = 'from-accent to-purple-600' }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-text-secondary w-20 shrink-0">{label}</span>
      <div className="score-bar flex-1">
        <div
          className={`score-bar-fill bg-gradient-to-r ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-medium w-8 text-right">{Math.round(score)}</span>
    </div>
  )
}

function RecommendationCard({ rec, rank }) {
  const [expanded, setExpanded] = useState(false)

  const scoreColor = rec.final_score >= 70
    ? 'text-emerald' : rec.final_score >= 50
    ? 'text-gold' : 'text-text-secondary'

  return (
    <div className="glass-card p-6 fade-in hover:border-accent/30 transition-all" style={{ animationDelay: `${rank * 100}ms` }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-accent bg-accent-glow px-2 py-0.5 rounded-full">
              #{rank}
            </span>
            <span className="text-sm text-text-muted">{rec.fragrance_family}</span>
          </div>

          <h3 className="text-lg font-bold mb-0.5">{rec.perfume_name || rec.brand}</h3>
          <p className="text-sm text-text-secondary mb-3">{rec.brand}</p>

          <div className="flex flex-wrap items-center gap-3 mb-3">
            <span className="text-lg font-bold text-emerald">₹{Number(rec.price).toLocaleString()}</span>
            {rec.rating && (
              <span className="flex items-center gap-1 text-sm text-gold">
                <Star className="h-3.5 w-3.5 fill-gold" />
                {Number(rec.rating).toFixed(1)}
              </span>
            )}
            <span className="tag">{rec.intensity}</span>
            <span className="tag">{rec.gender}</span>
          </div>

          {/* Top notes */}
          {rec.top_notes && rec.top_notes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {rec.top_notes.map(note => (
                <span key={note} className="tag text-xs">{note}</span>
              ))}
            </div>
          )}
        </div>

        <div className="text-center shrink-0">
          <div className={`text-3xl font-extrabold ${scoreColor} font-[family-name:var(--font-display)]`}>
            {Math.round(rec.final_score)}
          </div>
          <div className="text-xs text-text-muted">/ 100</div>
        </div>
      </div>

      {/* Matched preferences */}
      {rec.matched_preferences && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(Array.isArray(rec.matched_preferences) ? rec.matched_preferences : JSON.parse(rec.matched_preferences || '[]')).map((m, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-xs text-emerald bg-emerald/10 px-2 py-0.5 rounded-full">
              <Check className="h-3 w-3" /> {m}
            </span>
          ))}
        </div>
      )}

      {/* AI Explanation */}
      {rec.ai_explanation && (
        <div className="mt-3 p-3 rounded-xl bg-accent-glow border border-accent/20">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs font-medium text-accent-light">AI Insight</span>
          </div>
          <p className="text-sm text-text-secondary">{rec.ai_explanation}</p>
        </div>
      )}

      {/* Expandable score breakdown */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {expanded ? 'Hide' : 'Show'} score breakdown
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 p-3 rounded-xl bg-bg-secondary">
          <ScoreBar label="Family" score={rec.scores?.fragrance_score || rec.fragrance_score || 0} />
          <ScoreBar label="Occasion" score={rec.scores?.occasion_score || rec.occasion_score || 0} color="from-emerald to-teal-500" />
          <ScoreBar label="Season" score={rec.scores?.season_score || rec.season_score || 0} color="from-sky to-blue-500" />
          <ScoreBar label="Budget" score={rec.scores?.budget_score || rec.budget_score || 0} color="from-gold to-yellow-600" />
          <ScoreBar label="Notes" score={rec.scores?.notes_score || rec.notes_score || 0} color="from-rose to-pink-600" />
          <ScoreBar label="Time" score={rec.scores?.time_score || rec.time_score || 0} color="from-purple-400 to-purple-600" />
          <ScoreBar label="Intensity" score={rec.scores?.intensity_score || rec.intensity_score || 0} color="from-orange-400 to-orange-600" />
          <ScoreBar label="Gender" score={rec.scores?.gender_score || rec.gender_score || 0} color="from-teal-400 to-teal-600" />
        </div>
      )}

      <div className="mt-4">
        <Link
          to={`/perfume/${rec.perfume_id}`}
          className="btn-secondary text-sm inline-flex items-center gap-1.5"
        >
          View Details
        </Link>
      </div>
    </div>
  )
}

export default function Results() {
  const { preferenceId } = useParams()
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const result = await api.getRecommendations(preferenceId)
        setRecommendations(result.data || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [preferenceId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto mb-4" />
          <p className="text-text-secondary">Loading your recommendations...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-6 py-20 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <Link to="/quiz" className="btn-primary">Try Again</Link>
      </div>
    )
  }

  return (
    <div className="px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-bg-card/50 px-4 py-1.5 text-sm text-accent-light">
            <Sparkles className="h-4 w-4" />
            {recommendations.length} perfumes matched
          </div>
          <h1 className="text-3xl md:text-4xl font-bold font-[family-name:var(--font-display)] mb-2">
            Your Personalized Recommendations
          </h1>
          <p className="text-text-secondary">
            Ranked by how well each perfume matches your preferences.
          </p>
        </div>

        {recommendations.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-text-secondary mb-4">No perfumes matched your exact criteria. Try broadening your preferences.</p>
            <Link to="/quiz" className="btn-primary">Retake Quiz</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.map((rec, i) => (
              <RecommendationCard key={rec.perfume_id || i} rec={rec} rank={i + 1} />
            ))}
          </div>
        )}

        <div className="mt-10 text-center">
          <Link to="/quiz" className="btn-secondary inline-flex items-center gap-2">
            Retake Quiz
          </Link>
        </div>
      </div>
    </div>
  )
}
