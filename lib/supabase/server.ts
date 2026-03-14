import { createServerClient as createSsrServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database, Json, TableInsert } from '@/lib/types'

export type AppSupabaseClient = SupabaseClient<Database>

export async function createServerClient(): Promise<AppSupabaseClient> {
  const cookieStore = await cookies()

  return createSsrServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {}
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {}
        },
      },
    }
  ) as unknown as AppSupabaseClient
}

export function createServiceRoleClient(): AppSupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    return null
  }

  return createClient<Database>(url, serviceRoleKey) as AppSupabaseClient
}

export async function ensureUserOrg(user: Pick<User, 'id'>) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('users')
    .select('org_id, role, full_name, email')
    .eq('id', user.id)
    .single()

  return {
    orgId: data?.org_id ?? null,
    role: data?.role ?? null,
    profile: data ?? null,
    error,
  }
}

export async function logAuditEvent(
  supabase: AppSupabaseClient,
  event: {
    orgId: string
    action: string
    entityType: string
    entityId?: string | null
    userId?: string | null
    metadata?: Json
  }
) {
  const entry: TableInsert<'audit_logs'> = {
    org_id: event.orgId,
    user_id: event.userId ?? null,
    action: event.action,
    entity_type: event.entityType,
    entity_id: event.entityId ?? null,
    metadata: event.metadata ?? null,
  }

  const { error } = await supabase.from('audit_logs').insert(entry)
  return { error }
}
