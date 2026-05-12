import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react'
import { api } from '../api'

const STEPS = [
  {
    key: 'gender',
    title: 'Who is this fragrance for?',
    subtitle: 'Select your preference',
    type: 'single',
    field: 'gender_preference',
    options: [
      { value: 'male', label: '👨 Men', desc: 'Masculine fragrances' },
      { value: 'female', label: '👩 Women', desc: 'Feminine fragrances' },
      { value: 'unisex', label: '✨ Unisex', desc: 'Gender-neutral scents' },
      { value: 'any', label: '🌈 No Preference', desc: 'Show me everything' },
    ]
  },
  {
    key: 'budget',
    title: 'What\'s your budget range?',
    subtitle: 'In Indian Rupees (₹)',
    type: 'budget',
    field: 'budget'
  },
  {
    key: 'occasion',
    title: 'Where will you wear it?',
    subtitle: 'Select one or more occasions',
    type: 'multi',
    field: 'preferred_occasions',
    options: [
      { value: 'office', label: '💼 Office', desc: 'Professional settings' },
      { value: 'casual', label: '☕ Casual', desc: 'Everyday wear' },
      { value: 'formal', label: '🎩 Formal', desc: 'Special events' },
      { value: 'date_night', label: '🌹 Date Night', desc: 'Romantic evenings' },
      { value: 'party', label: '🎉 Party', desc: 'Social gatherings' },
      { value: 'outdoor', label: '🌿 Outdoor', desc: 'Active & adventurous' },
      { value: 'wedding', label: '💒 Wedding', desc: 'Wedding ceremonies' },
      { value: 'sport', label: '🏃 Sport', desc: 'Athletic activities' },
    ]
  },
  {
    key: 'season',
    title: 'Which season(s)?',
    subtitle: 'When will you primarily wear it?',
    type: 'multi',
    field: 'preferred_seasons',
    options: [
      { value: 'spring', label: '🌸 Spring', desc: 'Mild & blooming' },
      { value: 'summer', label: '☀️ Summer', desc: 'Hot & sunny' },
      { value: 'autumn', label: '🍂 Autumn', desc: 'Cool & cozy' },
      { value: 'winter', label: '❄️ Winter', desc: 'Cold & festive' },
    ]
  },
  {
    key: 'time',
    title: 'Day or Night?',
    subtitle: 'When will you mostly wear it?',
    type: 'single',
    field: 'preferred_time_of_day',
    options: [
      { value: 'day', label: '🌅 Daytime', desc: 'Morning to evening' },
      { value: 'night', label: '🌙 Nighttime', desc: 'Evening to night' },
      { value: 'both', label: '🔄 Both', desc: 'Versatile, any time' },
    ]
  },
  {
    key: 'family',
    title: 'Preferred fragrance style?',
    subtitle: 'Pick the scent families you enjoy',
    type: 'multi',
    field: 'preferred_fragrance_families',
    options: [
      { value: 'citrus', label: '🍋 Citrus', desc: 'Fresh, zesty, energizing' },
      { value: 'floral', label: '🌹 Floral', desc: 'Romantic, elegant, soft' },
      { value: 'woody', label: '🌲 Woody', desc: 'Warm, earthy, refined' },
      { value: 'oriental', label: '🕌 Oriental', desc: 'Rich, spicy, exotic' },
      { value: 'fresh', label: '💧 Fresh', desc: 'Clean, light, airy' },
      { value: 'aquatic', label: '🌊 Aquatic', desc: 'Ocean-like, breezy' },
      { value: 'gourmand', label: '🍫 Gourmand', desc: 'Sweet, edible, warm' },
      { value: 'aromatic', label: '🌿 Aromatic', desc: 'Herbal, natural' },
      { value: 'fruity', label: '🍑 Fruity', desc: 'Playful, juicy, vibrant' },
      { value: 'spicy', label: '🌶️ Spicy', desc: 'Bold, warm, intense' },
    ]
  },
  {
    key: 'intensity',
    title: 'How strong should it be?',
    subtitle: 'Fragrance intensity preference',
    type: 'single',
    field: 'preferred_intensity',
    options: [
      { value: 'light', label: '🍃 Light', desc: 'Subtle, close to skin' },
      { value: 'moderate', label: '⚖️ Moderate', desc: 'Balanced projection' },
      { value: 'strong', label: '💪 Strong', desc: 'Noticeable presence' },
      { value: 'intense', label: '🔥 Intense', desc: 'Room-filling power' },
    ]
  },
]

const BUDGET_PRESETS = [
  { label: 'Under ₹1,000', min: 0, max: 1000 },
  { label: '₹1,000 – ₹3,000', min: 1000, max: 3000 },
  { label: '₹3,000 – ₹5,000', min: 3000, max: 5000 },
  { label: '₹5,000 – ₹10,000', min: 5000, max: 10000 },
  { label: '₹10,000 – ₹20,000', min: 10000, max: 20000 },
  { label: 'Above ₹20,000', min: 20000, max: 50000 },
  { label: 'No Budget Limit', min: 0, max: 99999 },
]

export default function Quiz() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [answers, setAnswers] = useState({
    gender_preference: '',
    budget_min: null,
    budget_max: null,
    preferred_occasions: [],
    preferred_seasons: [],
    preferred_time_of_day: '',
    preferred_fragrance_families: [],
    preferred_intensity: '',
    preferred_notes: [],
    session_id: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  })

  const currentStep = STEPS[step]
  const progress = ((step + 1) / STEPS.length) * 100

  const handleSingleSelect = (field, value) => {
    setAnswers(prev => ({ ...prev, [field]: value }))
  }

  const handleMultiSelect = (field, value) => {
    setAnswers(prev => {
      const current = prev[field] || []
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value]
      return { ...prev, [field]: updated }
    })
  }

  const handleBudgetSelect = (min, max) => {
    setAnswers(prev => ({ ...prev, budget_min: min, budget_max: max }))
  }

  const canProceed = () => {
    if (currentStep.type === 'single') return !!answers[currentStep.field]
    if (currentStep.type === 'multi') return (answers[currentStep.field] || []).length > 0
    if (currentStep.type === 'budget') return answers.budget_max !== null
    return true
  }

  const handleNext = async () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1)
      return
    }

    // Submit preferences
    setLoading(true)
    setError(null)
    try {
      const result = await api.submitPreferences(answers)
      if (result.success) {
        navigate(`/results/${result.data.preference_id}`)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-2xl">
        {/* Progress bar */}
        <div className="mb-10">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-text-secondary">Step {step + 1} of {STEPS.length}</span>
            <span className="text-sm text-text-muted">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-bg-card overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-rose transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="fade-in" key={step}>
          <h2 className="mb-2 text-2xl md:text-3xl font-bold font-[family-name:var(--font-display)]">
            {currentStep.title}
          </h2>
          <p className="mb-8 text-text-secondary">{currentStep.subtitle}</p>

          {/* Budget step */}
          {currentStep.type === 'budget' && (
            <div className="grid gap-3 sm:grid-cols-2">
              {BUDGET_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handleBudgetSelect(preset.min, preset.max)}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    answers.budget_min === preset.min && answers.budget_max === preset.max
                      ? 'border-accent bg-accent-glow text-accent-light'
                      : 'border-border bg-bg-card hover:border-accent/40 text-text-primary'
                  }`}
                >
                  <div className="font-semibold">{preset.label}</div>
                </button>
              ))}
            </div>
          )}

          {/* Single select */}
          {currentStep.type === 'single' && (
            <div className="grid gap-3 sm:grid-cols-2">
              {currentStep.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleSingleSelect(currentStep.field, opt.value)}
                  className={`p-5 rounded-2xl border text-left transition-all ${
                    answers[currentStep.field] === opt.value
                      ? 'border-accent bg-accent-glow'
                      : 'border-border bg-bg-card hover:border-accent/40'
                  }`}
                >
                  <div className="text-lg font-semibold mb-0.5">{opt.label}</div>
                  <div className="text-sm text-text-secondary">{opt.desc}</div>
                </button>
              ))}
            </div>
          )}

          {/* Multi select */}
          {currentStep.type === 'multi' && (
            <div className="grid gap-3 sm:grid-cols-2">
              {currentStep.options.map((opt) => {
                const selected = (answers[currentStep.field] || []).includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleMultiSelect(currentStep.field, opt.value)}
                    className={`p-5 rounded-2xl border text-left transition-all ${
                      selected
                        ? 'border-accent bg-accent-glow'
                        : 'border-border bg-bg-card hover:border-accent/40'
                    }`}
                  >
                    <div className="text-lg font-semibold mb-0.5">{opt.label}</div>
                    <div className="text-sm text-text-secondary">{opt.desc}</div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-10 flex items-center justify-between">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="btn-secondary flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <button
            onClick={handleNext}
            disabled={!canProceed() || loading}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Finding your matches...
              </>
            ) : step === STEPS.length - 1 ? (
              <>
                <Sparkles className="h-4 w-4" />
                Get Recommendations
              </>
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
