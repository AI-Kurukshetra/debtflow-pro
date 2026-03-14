/**
 * POST /api/portal/session
 *
 * Validates that a stored portal session is still valid (debtor still exists
 * in the DB with the same email + reference_number).  Called on load when the
 * browser has an existing sessionStorage entry so we can auto-restore the
 * dashboard view without asking the debtor to re-enter credentials.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { PortalLookupRequest } from '@/lib/types'

export async function POST(req: NextRequest) {
    const body = (await req.json()) as Partial<PortalLookupRequest>
    const email = body.email?.trim().toLowerCase() ?? ''
    const reference_number = body.reference_number?.trim().toUpperCase() ?? ''

    if (!email || !reference_number) {
        return NextResponse.json({ valid: false }, { status: 400 })
    }

    const supabase = createServiceRoleClient()
    if (!supabase) {
        return NextResponse.json({ valid: false }, { status: 500 })
    }

    const { data, error } = await supabase
        .from('debtors')
        .select('id, full_name')
        .ilike('email', email)
        .eq('reference_number', reference_number)
        .limit(1)
        .maybeSingle()

    if (error || !data) {
        return NextResponse.json({ valid: false })
    }

    return NextResponse.json({ valid: true, debtor_id: data.id, full_name: data.full_name })
}
