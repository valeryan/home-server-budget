/**
 * ollamaInsight.ts
 *
 * Analyzes bank transactions with Ollama and returns a structured result that
 * includes:
 *   - suggested payee (cleaned merchant name)
 *   - suggested category
 *   - suggested recurring item match (from a list of candidates)
 *   - confidence level
 *
 * Results are persisted in the `teller-insights` collection so they are
 * reused on subsequent syncs instead of calling Ollama again.
 */

import type { Payload } from 'payload'
import type { RawTellerTransaction } from '@/domain/matching/engine'
import { getFirstOccurrenceDate, normalizeDate } from '@/domain/schedules/utils'

// ── Types ──────────────────────────────────────────────────────────────────

export interface RecurringCandidate {
  id: string
  name: string
  amount: number
  /** Next occurrence date near the transaction date, for context in the prompt */
  nextOccurrence?: string | null
}

export interface OllamaInsightResult {
  payee: string | null
  category: string | null
  recurringItemName: string | null
  confidence: 'high' | 'medium' | 'low'
  raw: unknown
}

// ── Normalizer ─────────────────────────────────────────────────────────────

/**
 * Produces a stable lookup key from a description + transaction type.
 * Strips special characters, lowercases, and collapses whitespace.
 * Numbers are retained because "stripe 1234" and "stripe 5678" are likely
 * different merchants; a fuzzy layer can be added later if needed.
 */
export function normalizeDescriptionKey(description: string, transactionType: string): string {
  const normalized = description
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return `${normalized}::${transactionType}`
}

// ── Recurring item candidate finder ────────────────────────────────────────

/**
 * Extracts meaningful tokens from a string for name-similarity scoring.
 * Strips short/common words so "Electronic Withdrawal" doesn't match "Sam's Allowance".
 */
function tokenize(text: string): Set<string> {
  const stop = new Set([
    'the',
    'and',
    'or',
    'a',
    'an',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
    'from',
    'via',
    'inc',
    'llc',
    'com',
    'net',
    'www',
    'electronic',
    'withdrawal',
    'payment',
    'purchase',
    'debit',
    'credit',
    'transfer',
    'deposit',
    'pos',
    'ach',
    'check',
  ])
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !stop.has(w)),
  )
}

/**
 * Returns true when the recurring item name shares at least one meaningful
 * token with the transaction description.
 */
function hasNameOverlap(description: string, itemName: string): boolean {
  const descTokens = tokenize(description)
  const nameTokens = tokenize(itemName)
  for (const nt of nameTokens) {
    for (const dt of descTokens) {
      if (dt === nt || dt.includes(nt) || nt.includes(dt)) return true
    }
  }
  return false
}

/**
 * Finds recurring items that plausibly match a transaction using the real
 * schedule system. Scores each candidate on up to 3 criteria:
 *
 *   1. Amount: item.amount within ±20% of the transaction amount
 *   2. Name:   meaningful token overlap between description and item name
 *   3. Timing: the item's schedule produces an occurrence within ±10 days
 *              of the transaction date (uses the full schedule system)
 *
 * Requires at least 2 matching criteria.
 */
export async function findRecurringCandidates(
  payload: Payload,
  transactionType: 'income' | 'expense' | 'transfer',
  amount: number,
  transactionDate: string,
  description = '',
): Promise<RecurringCandidate[]> {
  if (transactionType === 'transfer') return []

  // Fetch with a wide amount window — JS scoring will tighten it
  const minAmount = amount * 0.65
  const maxAmount = amount * 1.35

  const result = await payload.find({
    collection: 'recurring-items',
    where: {
      and: [
        { itemType: { equals: transactionType } },
        { isActive: { equals: true } },
        { amount: { greater_than_equal: minAmount } },
        { amount: { less_than_equal: maxAmount } },
      ],
    },
    limit: 100,
  })

  const txDate = normalizeDate(new Date(transactionDate))
  // Check a ±10-day window around the transaction date
  const windowStart = new Date(txDate)
  windowStart.setDate(windowStart.getDate() - 10)
  const windowEnd = new Date(txDate)
  windowEnd.setDate(windowEnd.getDate() + 10)

  const candidates: RecurringCandidate[] = []

  for (const item of result.docs) {
    const itemData = item as unknown as Record<string, unknown>
    const scheduleType = item.scheduleType as string | null

    // Score 1: amount within ±20%
    const itemAmount = item.amount as number
    const amountScore = itemAmount >= amount * 0.8 && itemAmount <= amount * 1.2 ? 1 : 0

    // Score 2: name token overlap with transaction description
    const nameScore = description && hasNameOverlap(description, item.name as string) ? 1 : 0

    // Score 3: schedule produces an occurrence near the transaction date
    let timingScore = 0
    let nextOccurrence: string | null = null
    if (scheduleType) {
      const occ = getFirstOccurrenceDate(scheduleType, itemData, windowStart, windowEnd)
      if (occ) {
        timingScore = 1
        nextOccurrence = occ.toISOString().slice(0, 10)
      }
    }

    const totalScore = amountScore + nameScore + timingScore
    if (totalScore >= 2) {
      candidates.push({
        id: item.id as string,
        name: item.name as string,
        amount: itemAmount,
        nextOccurrence,
      })
    }
  }

  return candidates
}

// ── Ollama call ─────────────────────────────────────────────────────────────

export async function askOllamaForInsight(
  description: string,
  amount: number,
  transactionType: string,
  categoryNames: string[],
  recurringCandidates: RecurringCandidate[],
  existingPayeeNames: string[] = [],
): Promise<OllamaInsightResult> {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://ollama:11434'
  const model = process.env.OLLAMA_MODEL || 'qwen2.5:0.5b'

  const candidateList =
    recurringCandidates.length > 0
      ? recurringCandidates
          .map(
            (r) =>
              `- "${r.name}": $${r.amount.toFixed(2)}${r.nextOccurrence ? ` (next occurrence: ${r.nextOccurrence})` : ''}`,
          )
          .join('\n')
      : 'None'

  // Keep prompt tight — smaller models struggle with long instructions
  const categoryLine = categoryNames.length > 0 ? categoryNames.join(', ') : 'none'
  // Cap payee list to avoid blowing up context on small models
  const payeeList = existingPayeeNames.slice(0, 80).join(', ')
  const payeeLine =
    payeeList.length > 0
      ? `Known payees (match one of these first if it fits, using the exact name as listed): ${payeeList}`
      : 'Known payees: none yet'
  const prompt = `You are a personal finance assistant. Respond ONLY with a JSON object, no explanation.

Bank transaction: "${description}"
Amount: $${amount.toFixed(2)} (${transactionType})

${payeeLine}

Known ${transactionType} categories: ${categoryLine}

Possible recurring items (pre-filtered by amount, name, and timing — only shown if already likely):
${candidateList}

Return JSON with exactly these keys:
- "payee": Identify the merchant or payee from the transaction description text. ONLY use names that appear in or are clearly abbreviated in the description (e.g. "AFFIRM.COM" -> "Affirm", "WHOLEFDS" -> "Whole Foods", "NETFLIX.COM" -> "Netflix"). If a known payee from the list matches, use the exact name. Do NOT invent names not connected to the description text.
- "category": the best matching category name from the list above based on the transaction description, or null
- "recurringItem": the name of the best matching recurring item from the candidate list above, or null. Only pick one if it genuinely matches this transaction — do not pick based on amount alone.
- "confidence": "high", "medium", or "low"`

  const fallback: OllamaInsightResult = {
    payee: null,
    category: null,
    recurringItemName: null,
    confidence: 'low',
    raw: null,
  }

  try {
    const res = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false, format: 'json' }),
      // CPU inference on 7GB model needs time — 90s is safe
      signal: AbortSignal.timeout(90000),
    })

    if (!res.ok) {
      console.error('[ollama] HTTP', res.status, await res.text().catch(() => ''))
      return fallback
    }

    const data = (await res.json()) as { response?: string }
    const raw = (data.response || '').trim()

    // Extract JSON from the response (model may still wrap in fences despite format:json)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { ...fallback, raw }

    const parsed = JSON.parse(jsonMatch[0]) as {
      payee?: string
      category?: string
      recurringItem?: string
      confidence?: string
    }

    const confidence =
      parsed.confidence === 'high' || parsed.confidence === 'medium' ? parsed.confidence : 'low'

    return {
      payee: parsed.payee || null,
      category: parsed.category || null,
      recurringItemName: parsed.recurringItem || null,
      confidence,
      raw: parsed,
    }
  } catch (err) {
    console.error('[ollama] inference error:', err instanceof Error ? err.message : err)
    return fallback
  }
}

// ── Main: analyse and persist ──────────────────────────────────────────────

export interface InsightLookupResult {
  /** ID of the teller-insights document */
  insightId: string
  status: 'pending' | 'accepted' | 'rejected'
  expenseCategoryId: string | null
  incomeCategoryId: string | null
  recurringItemId: string | null
  /** Resolved Payees collection ID */
  payeeId: string | null
  /** Display name for the payee (for setting displayTitle) */
  payeeName: string | null
}

/**
 * Looks up an existing insight for this description+type, or calls Ollama and
 * creates a new one.
 *
 * Sync flow (forceRefresh=false, default):
 *   - Accepted or pending insight found → return the cached insight
 *   - No insight + skipAI=true        → return null  (bulk import, skip Ollama)
 *   - No insight + skipAI=false       → call Ollama, save, return suggestions
 *
 * Frontend on-demand re-analysis (forceRefresh=true):
 *   - Always calls Ollama regardless of any cached pending suggestions
 *   - If an insight already exists → overwrite suggested fields, reset to pending
 *   - If it was already accepted   → keep status=accepted (don't overwrite user decisions)
 *   - skipAI is ignored when forceRefresh=true
 */
export async function getOrCreateInsight(
  payload: Payload,
  raw: RawTellerTransaction,
  description: string,
  transactionType: 'income' | 'expense' | 'transfer',
  amount: number,
  skipAI: boolean,
  forceRefresh = false,
): Promise<InsightLookupResult | null> {
  const descriptionKey = normalizeDescriptionKey(description, transactionType)

  // ── 1. Check cache ─────────────────────────────────────────────────────
  const existing = await payload.find({
    collection: 'teller-insights',
    where: { descriptionKey: { equals: descriptionKey } },
    limit: 1,
  })

  const existingDoc = existing.totalDocs > 0 ? existing.docs[0] : null

  // Return cached insight when not forcing a refresh
  if (existingDoc && !forceRefresh) {
    const getRelId = (rel: unknown): string | null => {
      if (!rel) return null
      if (typeof rel === 'string') return rel
      if (typeof rel === 'object' && rel !== null && 'id' in rel) return (rel as { id: string }).id
      return null
    }
    const getRelName = (rel: unknown): string | null => {
      if (!rel) return null
      if (typeof rel === 'object' && rel !== null && 'name' in rel)
        return (rel as { name: string }).name
      return null
    }

    // Use accepted values if confirmed, otherwise suggested values
    const isAccepted = existingDoc.status === 'accepted'
    const expenseCategoryId = isAccepted
      ? (getRelId(existingDoc.acceptedExpenseCategory) ??
        getRelId(existingDoc.suggestedExpenseCategory))
      : getRelId(existingDoc.suggestedExpenseCategory)
    const incomeCategoryId = isAccepted
      ? (getRelId(existingDoc.acceptedIncomeCategory) ??
        getRelId(existingDoc.suggestedIncomeCategory))
      : getRelId(existingDoc.suggestedIncomeCategory)
    const recurringItemId = isAccepted
      ? (getRelId(existingDoc.acceptedRecurringItem) ??
        (Array.isArray(existingDoc.suggestedRecurringItems) &&
        existingDoc.suggestedRecurringItems.length > 0
          ? getRelId(existingDoc.suggestedRecurringItems[0])
          : null))
      : null

    // Payee: prefer accepted, then suggested link, then raw string
    const payeeId = isAccepted
      ? (getRelId(existingDoc.acceptedPayee) ?? getRelId(existingDoc.suggestedPayeeLink))
      : getRelId(existingDoc.suggestedPayeeLink)
    const payeeName = isAccepted
      ? (getRelName(existingDoc.acceptedPayee) ??
        getRelName(existingDoc.suggestedPayeeLink) ??
        (existingDoc.suggestedPayee as string | null))
      : (getRelName(existingDoc.suggestedPayeeLink) ??
        (existingDoc.suggestedPayee as string | null))

    return {
      insightId: existingDoc.id as string,
      status: existingDoc.status as 'pending' | 'accepted' | 'rejected',
      expenseCategoryId,
      incomeCategoryId,
      recurringItemId,
      payeeId,
      payeeName,
    }
  }

  // ── 2. No cache (or forceRefresh) — skip Ollama for bulk import ────────
  if (skipAI && !forceRefresh) return null

  // ── 3. Fetch categories, payees, and recurring candidates ─────────────
  const [catResult, payeesResult, candidates] = await Promise.all([
    payload.find({
      collection: transactionType === 'income' ? 'income-categories' : 'expense-categories',
      limit: 50,
    }),
    payload.find({ collection: 'payees', limit: 200 }),
    findRecurringCandidates(payload, transactionType, amount, raw.date, description),
  ])

  const categoryNames = catResult.docs.map((c) => c.name as string)
  const existingPayeeNames = payeesResult.docs.map((p) => p.name as string)

  // ── 4. Call Ollama ────────────────────────────────────────────────────
  const insight = await askOllamaForInsight(
    description,
    amount,
    transactionType,
    categoryNames,
    candidates,
    existingPayeeNames,
  )

  // ── 5. Resolve IDs from Ollama strings ────────────────────────────────

  // Category
  let suggestedCatId: string | null = null
  if (insight.category) {
    const match = catResult.docs.find(
      (c) => (c.name as string).toLowerCase() === insight.category!.toLowerCase(),
    )
    if (match) suggestedCatId = match.id as string
  }

  // Payee — fuzzy match (exact name, then one-contains-the-other)
  let resolvedPayeeId: string | null = null
  let resolvedPayeeName: string | null = insight.payee
  if (insight.payee) {
    const needle = insight.payee.toLowerCase()
    const exactMatch = payeesResult.docs.find((p) => (p.name as string).toLowerCase() === needle)
    if (exactMatch) {
      resolvedPayeeId = exactMatch.id as string
      resolvedPayeeName = exactMatch.name as string
    } else {
      const containsMatch = payeesResult.docs.find((p) => {
        const haystack = (p.name as string).toLowerCase()
        return haystack.includes(needle) || needle.includes(haystack)
      })
      if (containsMatch) {
        resolvedPayeeId = containsMatch.id as string
        resolvedPayeeName = containsMatch.name as string
      }
    }
  }

  // Recurring item
  let suggestedRecurringItemIds: string[] = []
  let suggestedRecurringItemId: string | null = null
  if (insight.recurringItemName) {
    const match = candidates.find(
      (c) => c.name.toLowerCase() === insight.recurringItemName!.toLowerCase(),
    )
    if (match) {
      suggestedRecurringItemId = match.id
      suggestedRecurringItemIds = [match.id]
    }
  }
  // Always include all candidates so the admin can pick
  const allCandidateIds = candidates.map((c) => c.id)
  const suggestedIds = Array.from(new Set([...suggestedRecurringItemIds, ...allCandidateIds]))

  // ── 6. Persist insight (create or overwrite suggested fields) ──────────
  const freshFields: Record<string, unknown> = {
    descriptionKey,
    exampleDescription: description,
    transactionType,
    exampleAmount: amount,
    suggestedPayee: insight.payee,
    suggestedPayeeLink: resolvedPayeeId ?? null,
    ollamaConfidence: insight.confidence,
    ollamaRaw: insight.raw,
    suggestedRecurringItems: suggestedIds,
    suggestedExpenseCategory: transactionType === 'expense' ? (suggestedCatId ?? null) : null,
    suggestedIncomeCategory: transactionType === 'income' ? (suggestedCatId ?? null) : null,
  }

  let savedId: string

  if (existingDoc && forceRefresh) {
    // Overwrite suggestions; preserve accepted values.
    // Only reset status to 'pending' if it wasn't already accepted (user decisions survive).
    const statusUpdate = existingDoc.status !== 'accepted' ? { status: 'pending' } : {}
    await payload.update({
      collection: 'teller-insights',
      id: existingDoc.id as string,
      data: { ...freshFields, ...statusUpdate } as never,
    })
    savedId = existingDoc.id as string
  } else {
    const created = await payload.create({
      collection: 'teller-insights',
      data: { ...freshFields, status: 'pending' } as never,
    })
    savedId = created.id as string
  }

  return {
    insightId: savedId,
    status: existingDoc?.status === 'accepted' ? 'accepted' : 'pending',
    expenseCategoryId: transactionType === 'expense' ? suggestedCatId : null,
    incomeCategoryId: transactionType === 'income' ? suggestedCatId : null,
    recurringItemId: suggestedRecurringItemId,
    payeeId: resolvedPayeeId,
    payeeName: resolvedPayeeName,
  }
}
