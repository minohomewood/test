import type { IssueSeverity } from '@/types'

interface SeverityBadgeProps {
  severity: IssueSeverity
}

const CONFIG: Record<IssueSeverity, { label: string; classes: string }> = {
  critical: { label: 'Critical', classes: 'bg-red-100 text-red-800 border-red-200' },
  serious: { label: 'Serious', classes: 'bg-orange-100 text-orange-800 border-orange-200' },
  moderate: { label: 'Moderate', classes: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  minor: { label: 'Minor', classes: 'bg-blue-100 text-blue-800 border-blue-200' },
}

export default function SeverityBadge({ severity }: SeverityBadgeProps) {
  const { label, classes } = CONFIG[severity]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${classes}`}>
      {label}
    </span>
  )
}
