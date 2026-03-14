type RiskLabel = 'low' | 'medium' | 'high' | 'critical'

const STYLES: Record<RiskLabel, { pill: string; dot: string; label: string }> = {
  low: { pill: 'bg-green-100 text-green-800', dot: 'bg-green-500', label: 'Low Risk' },
  medium: { pill: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500', label: 'Medium Risk' },
  high: { pill: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500', label: 'High Risk' },
  critical: { pill: 'bg-red-100 text-red-800', dot: 'bg-red-500', label: 'Critical' },
}

export function RiskScoreBadge({
  score,
  label,
  size = 'sm',
}: {
  score: number
  label: RiskLabel
  size?: 'sm' | 'lg'
}) {
  const s = STYLES[label]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${s.pill} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {size === 'lg' && <span className="font-bold">{score}/100 -</span>}
      {s.label}
    </span>
  )
}
