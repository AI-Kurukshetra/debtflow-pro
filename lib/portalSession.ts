/**
 * Portal Session Helpers
 *
 * The Borrower Portal uses "email + reference number" as its identity proof —
 * no Supabase auth / password is needed for debtors (per AGENTS.md §18).
 *
 * After a successful lookup we persist a lightweight session in sessionStorage
 * so the debtor stays identified across soft reloads without re-entering their
 * credentials.  The session expires when the browser tab closes.
 *
 * Structure stored as JSON under PORTAL_SESSION_KEY:
 *   { email, reference_number, full_name, debtor_id, verified_at }
 */

export const PORTAL_SESSION_KEY = 'dfp_portal_session'

export interface PortalSession {
    email: string
    reference_number: string
    full_name: string
    debtor_id: string
    verified_at: string // ISO timestamp
}

/** Save a verified portal session to sessionStorage (browser only). */
export function savePortalSession(session: PortalSession): void {
    if (typeof window === 'undefined') return
    try {
        window.sessionStorage.setItem(PORTAL_SESSION_KEY, JSON.stringify(session))
    } catch {
        // sessionStorage may be blocked in private browsing sandboxes — ignore
    }
}

/** Read and validate the portal session from sessionStorage. Returns null if none / corrupt. */
export function readPortalSession(): PortalSession | null {
    if (typeof window === 'undefined') return null
    try {
        const raw = window.sessionStorage.getItem(PORTAL_SESSION_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw) as Partial<PortalSession>
        if (
            !parsed.email ||
            !parsed.reference_number ||
            !parsed.debtor_id ||
            !parsed.verified_at
        ) {
            return null
        }
        return parsed as PortalSession
    } catch {
        return null
    }
}

/** Clear the portal session (sign out). */
export function clearPortalSession(): void {
    if (typeof window === 'undefined') return
    try {
        window.sessionStorage.removeItem(PORTAL_SESSION_KEY)
    } catch { }
}
