'use client'

interface ScoreBadgeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-700 bg-green-100 border-green-200'
  if (score >= 60) return 'text-yellow-700 bg-yellow-100 border-yellow-200'
  if (score >= 40) return 'text-orange-700 bg-orange-100 border-orange-200'
  return 'text-red-700 bg-red-100 border-red-200'
}

function getScoreRingColor(score: number): string {
  if (score >= 80) return '#16a34a'
  if (score >= 60) return '#ca8a04'
  if (score >= 40) return '#ea580c'
  return '#dc2626'
}

export default function ScoreBadge({ score, size = 'md', label }: ScoreBadgeProps) {
  const radius = size === 'lg' ? 38 : size === 'sm' ? 22 : 30
  const strokeWidth = size === 'lg' ? 4 : 3
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const svgSize = (radius + strokeWidth + 2) * 2
  const textSize = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-sm' : 'text-lg'

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative inline-flex items-center justify-center">
        <svg width={svgSize} height={svgSize} className="-rotate-90">
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            fill="none"
            stroke={getScoreRingColor(score)}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <span className={`absolute font-bold ${textSize} ${score >= 80 ? 'text-green-700' : score >= 60 ? 'text-yellow-700' : score >= 40 ? 'text-orange-700' : 'text-red-700'}`}>
          {score}
        </span>
      </div>
      {label && <span className="text-xs text-gray-500 font-medium">{label}</span>}
    </div>
  )
}
