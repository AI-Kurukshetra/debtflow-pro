'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { TrendingUp } from 'lucide-react'
import { cn } from '@/lib/cn'

const ITEMS = [
  { label: 'Overview', href: '/dashboard' },
  { label: 'Debtors', href: '/debtors' },
  { label: 'Campaigns', href: '/campaigns' },
  { label: 'Payments', href: '/payments' },
  { label: 'Analytics', href: '/analytics' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-gray-200 bg-white">
      <div className="px-6 py-5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shrink-0">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">DebtFlow<span className="text-blue-600">Pro</span></span>
        </Link>
        <p className="text-xs text-gray-500 mt-1 ml-10">Recovery operations</p>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'block rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
              pathname === item.href
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="px-6 py-4 text-xs text-gray-400">v0.1</div>
    </aside>
  )
}
