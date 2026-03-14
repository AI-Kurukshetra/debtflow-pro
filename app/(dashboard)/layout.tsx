import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { Navbar } from '@/components/layout/Navbar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('users').select('org_id, full_name, email').eq('id', user.id).single()
  const { data: org } = me?.org_id
    ? await supabase.from('organizations').select('name').eq('id', me.org_id).single()
    : { data: null }
  const orgName = org?.name ?? 'Organization'
  const userName = me?.full_name ?? user.user_metadata?.full_name ?? null
  const userEmail = me?.email ?? user.email ?? ''

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar orgName={orgName} userName={userName} userEmail={userEmail} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
