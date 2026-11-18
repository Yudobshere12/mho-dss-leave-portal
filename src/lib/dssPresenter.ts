/**
 * dssPresenter.ts
 * Presentation layer that converts raw DSS output into a friendly view model.
 * Does NOT change DSS logic, SQL, or RPC behavior.
 */

export interface DssReason {
  icon: 'check' | 'warning' | 'alert'
  text: string
}

export interface DssFact {
  label: string
  value: string
}

export type DssStatus = 'recommended' | 'needs_review' | 'unknown'

export interface DssViewModel {
  status: DssStatus
  statusLabel: string
  summary: string
  reasons: DssReason[]
  facts: DssFact[]
  raw: string
}

export interface DssContext {
  leaveTypeName?: string
  startDate?: string
  endDate?: string
  requestedDays?: number
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

function extractNumber(text: string, pattern: RegExp): number | null {
  const m = text.match(pattern)
  return m ? parseFloat(m[1]) : null
}

/** Map a raw reason string to a list of friendly DssReason entries */
function mapReasonToEntries(raw: string, ctx?: DssContext): DssReason[] {
  const upper = raw.toUpperCase()
  const typeName = ctx?.leaveTypeName ?? 'this leave type'
  const reasons: DssReason[] = []

  // ── All conditions satisfied (pure pass) ──────────────────────────────────
  if (
    upper.includes('ALL DSS PRE-CONDITIONS SATISFIED') ||
    upper.includes('SUFFICIENT BALANCE & DUTY STAFF') ||
    upper.includes('DUTY STAFFING COVERAGE AND BALANCE REQUIREMENTS SATISFIED') ||
    upper.includes('SUFFICIENT BALANCE AVAILABLE') ||
    upper.includes('BALANCE REQUIREMENTS SATISFIED') ||
    (upper.includes('SUFFICIENT') && upper.includes('COVERAGE SATISFIED'))
  ) {
    reasons.push({ icon: 'check', text: 'All system checks passed — leave credits and clinical coverage are sufficient.' })
    return reasons
  }

  // ── Walk-in ────────────────────────────────────────────────────────────────
  if (upper.includes('WALK-IN') || upper.includes('WALK_IN')) {
    reasons.push({ icon: 'check', text: 'Walk-in application — no leave credit record is required for this entry.' })
    return reasons
  }

  // ── Advance filing notice ─────────────────────────────────────────────────
  if (upper.includes('ADVANCE FILING') || upper.includes('ADVANCE NOTICE') || upper.includes('NOTICE REQUIREMENT')) {
    const filed = extractNumber(raw, /filed\s+(\d+)\s+day/i)
    const required = extractNumber(raw, /required\s+at\s+least\s+(\d+)\s+day/i) ??
                     extractNumber(raw, /at\s+least\s+(\d+)\s+day/i)
    if (filed !== null && required !== null) {
      reasons.push({
        icon: 'alert',
        text: `${typeName} must be filed at least ${required} calendar day${required !== 1 ? 's' : ''} before the start date. This application was submitted ${filed} day${filed !== 1 ? 's' : ''} in advance.`,
      })
    } else {
      reasons.push({
        icon: 'alert',
        text: `The advance notice requirement for ${typeName} was not met. Please file earlier next time.`,
      })
    }
    return reasons
  }

  // ── Insufficient balance ──────────────────────────────────────────────────
  if (upper.includes('INSUFFICIENT') && upper.includes('BALANCE')) {
    const requested = extractNumber(raw, /requested[:\s]+(\d+(?:\.\d+)?)\s+day/i)
    const available = extractNumber(raw, /available[:\s]+(\d+(?:\.\d+)?)\s+day/i)
    if (requested !== null && available !== null) {
      reasons.push({
        icon: 'alert',
        text: `The employee does not have enough ${typeName} credits. Requested: ${requested} day${requested !== 1 ? 's' : ''}, available: ${available} day${available !== 1 ? 's' : ''}.`,
      })
    } else {
      reasons.push({ icon: 'alert', text: `The employee does not have enough leave credits for this ${typeName} request.` })
    }
    return reasons
  }

  // ── Overlapping leave ─────────────────────────────────────────────────────
  if (upper.includes('OVERLAPPING') || upper.includes('OVERLAP')) {
    reasons.push({ icon: 'alert', text: 'The applicant already has an approved or pending leave that overlaps with the requested dates.' })
    return reasons
  }

  // ── Staffing threshold ────────────────────────────────────────────────────
  if (upper.includes('STAFFING') || upper.includes('MINIMUM STAFF') || upper.includes('DUTY STAFF')) {
    const onLeave = extractNumber(raw, /(\d+)\s+(?:of|out of)\s+\d+\s+staff/i)
    const total = extractNumber(raw, /\d+\s+(?:of|out of)\s+(\d+)\s+staff/i)
    if (onLeave !== null && total !== null) {
      reasons.push({
        icon: 'warning',
        text: `Approving this leave may leave ${onLeave} of ${total} clinic staff absent at the same time, which may fall below the minimum safe coverage level.`,
      })
    } else {
      reasons.push({ icon: 'warning', text: 'Approving this leave may reduce on-duty staff below the minimum safe level for clinical operations.' })
    }
    return reasons
  }

  // ── Non-credit / statutory / no deduction ────────────────────────────────
  if (upper.includes('NON-CREDIT') || upper.includes('STATUTORY') || upper.includes('NO DEDUCTION') || upper.includes('NO CREDIT')) {
    reasons.push({ icon: 'check', text: `${typeName} does not charge against leave credits — no balance deduction required.` })
    return reasons
  }

  // ── Generic fallback ──────────────────────────────────────────────────────
  reasons.push({ icon: 'warning', text: raw })
  return reasons
}

/** Extract key facts (numbers) from the reason text */
function extractFacts(raw: string, ctx?: DssContext): DssFact[] {
  const facts: DssFact[] = []

  // Requested / available balance
  const requested = extractNumber(raw, /requested[:\s]+(\d+(?:\.\d+)?)\s+day/i)
  const available = extractNumber(raw, /available[:\s]+(\d+(?:\.\d+)?)\s+day/i)
  if (requested !== null) facts.push({ label: 'Requested', value: `${requested} day${requested !== 1 ? 's' : ''}` })
  if (available !== null) facts.push({ label: 'Available balance', value: `${available} day${available !== 1 ? 's' : ''}` })

  // Staff on leave
  const onLeave = extractNumber(raw, /(\d+)\s+of\s+\d+\s+staff/i)
  const totalStaff = extractNumber(raw, /\d+\s+of\s+(\d+)\s+staff/i)
  if (onLeave !== null && totalStaff !== null) {
    facts.push({ label: 'Staff on leave', value: `${onLeave} of ${totalStaff}` })
  }

  // Date range from context
  if (ctx?.startDate && ctx?.endDate) {
    facts.push({ label: 'Period', value: `${formatDate(ctx.startDate)} – ${formatDate(ctx.endDate)}` })
  }

  if (ctx?.requestedDays !== undefined && requested === null) {
    facts.push({ label: 'Working days', value: `${ctx.requestedDays}` })
  }

  return facts
}

function buildViewModel(code: string, reason: string, ctx?: DssContext): DssViewModel {
  const upper = code.toUpperCase().trim()
  const raw = reason.trim()

  const isRecommended = upper === 'RECOMMENDED' || upper.startsWith('RECOMMENDED')
  const isNeedsReview =
    upper === 'NEEDS_REVIEW' ||
    upper.startsWith('NEEDS_REVIEW') ||
    upper.includes('NEEDS_REVIEW') ||
    upper.includes('WARNING') ||
    upper.includes('CAUTION')

  let status: DssStatus
  let statusLabel: string
  let summary: string

  if (isRecommended && !isNeedsReview) {
    status = 'recommended'
    statusLabel = 'Recommended'
    summary = `The system recommends approving this ${ctx?.leaveTypeName ?? 'leave'} application.`
  } else if (isNeedsReview || (!isRecommended)) {
    status = 'needs_review'
    statusLabel = 'Needs Review'
    summary = `This ${ctx?.leaveTypeName ?? 'leave'} application requires a manual review before it can be approved.`
  } else {
    status = 'unknown'
    statusLabel = 'Unknown'
    summary = 'The system could not evaluate this application automatically.'
  }

  const reasons = mapReasonToEntries(raw, ctx)
  const facts = extractFacts(raw, ctx)

  return { status, statusLabel, summary, reasons, facts, raw: `${code} — ${reason}` }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Parse from live RPC result fields (LeaveFilingPage preview).
 * @param recommendation  e.g. "RECOMMENDED" or "NEEDS_REVIEW"
 * @param reason          prose message from the DSS engine
 */
export function parseDssFromRpc(
  recommendation: string,
  reason: string,
  ctx?: DssContext
): DssViewModel {
  return buildViewModel(recommendation, reason, ctx)
}

/**
 * Parse from the stored `dss_recommendation` column.
 * Format: "RECOMMENDED (prose reason)" or "NEEDS_REVIEW (prose reason)"
 */
export function parseDssFromColumn(
  storedString: string | null | undefined,
  ctx?: DssContext
): DssViewModel | null {
  if (!storedString) return null

  // Extract code and reason from "CODE (reason)" or "CODE: reason" or just "CODE"
  const parenMatch = storedString.match(/^(\S+)\s+\((.+)\)\s*$/s)
  if (parenMatch) {
    return buildViewModel(parenMatch[1], parenMatch[2], ctx)
  }

  const colonMatch = storedString.match(/^(\S+):\s+(.+)$/s)
  if (colonMatch) {
    return buildViewModel(colonMatch[1], colonMatch[2], ctx)
  }

  // Fallback: treat whole string as code, no reason
  return buildViewModel(storedString, storedString, ctx)
}
