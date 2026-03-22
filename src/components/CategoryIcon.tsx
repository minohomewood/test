import type { IssueCategory } from '@/types'

interface CategoryIconProps {
  category: IssueCategory
  className?: string
}

export default function CategoryIcon({ category, className = 'w-5 h-5' }: CategoryIconProps) {
  switch (category) {
    case 'accessibility':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="Accessibility">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    case 'seo':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="SEO">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      )
    case 'links':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="Links">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      )
    case 'content':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="Content">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
  }
}
