import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { populateStarterOrgData } from '@/lib/seed'

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function buildUniqueOrganizationSlug(
  slugBase: string,
  checkSlug: (slug: string) => Promise<boolean>
) {
  if (!(await checkSlug(slugBase))) {
    return slugBase
  }

  let attempt = 1
  while (attempt < 50) {
    const candidate = `${slugBase}-${attempt}`
    if (!(await checkSlug(candidate))) {
      return candidate
    }
    attempt += 1
  }

  return `${slugBase}-${Math.random().toString(36).slice(2, 7)}`
}

export async function POST(req: NextRequest) {
  const { email, password, full_name, organization_name } = (await req.json()) as {
    email?: string
    password?: string
    full_name?: string
    organization_name?: string
  }

  if (!email || !password || !full_name || !organization_name) {
    return NextResponse.json(
      { error: 'email, password, full_name, and organization_name are required' },
      { status: 400 }
    )
  }

  const supabase = createServiceRoleClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const slugBase = slugify(organization_name)
  const slug = await buildUniqueOrganizationSlug(slugBase, async (candidate) => {
    const { data } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle()

    return Boolean(data)
  })

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({ name: organization_name, slug })
    .select('id, name, slug')
    .single()

  if (orgError || !org) {
    return NextResponse.json({ error: orgError?.message ?? 'Failed to create organization.' }, { status: 400 })
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    await supabase.from('organizations').delete().eq('id', org.id)
    return NextResponse.json({ error: authError?.message ?? 'Failed to create user.' }, { status: 400 })
  }

  const { error: profileError } = await supabase.from('users').insert({
    id: authData.user.id,
    org_id: org.id,
    email,
    full_name,
    role: 'admin',
  })

  if (profileError) {
    await supabase.auth.admin.deleteUser(authData.user.id)
    await supabase.from('organizations').delete().eq('id', org.id)
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  await populateStarterOrgData(supabase, {
    orgId: org.id,
    orgName: org.name,
    slug: org.slug,
  })

  return NextResponse.json({ success: true })
}
