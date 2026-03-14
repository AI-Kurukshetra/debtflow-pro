import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { seedAll } from '@/lib/seed'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-seed-secret')
  if (secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const summary = await seedAll(supabase)
    return NextResponse.json({ success: true, ...summary })
  } catch (e: unknown) {
    console.error('Seed failed:', e)
    const message = e instanceof Error ? e.message : 'Seed failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
