import React from 'react'
import { getLeaveTypeTheme } from '../lib/leaveTypes'

interface LeaveTypeBadgeProps {
  codeOrName: string
  showName?: boolean
  className?: string
}

export const LeaveTypeBadge: React.FC<LeaveTypeBadgeProps> = ({
  codeOrName,
  showName = true,
  className = '',
}) => {
  const theme = getLeaveTypeTheme(codeOrName)

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-2xs font-semibold ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder} ${className}`}
    >
      <span className="font-bold tracking-wider">{theme.code}</span>
      {showName && (
        <span className="font-medium opacity-90 truncate max-w-40">{theme.name}</span>
      )}
    </span>
  )
}
