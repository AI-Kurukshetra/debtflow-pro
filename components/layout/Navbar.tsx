'use client'

import { useContext, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownContext,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/cn'
import Link from 'next/link'
import { Menu, X, ChevronDown, LogOut } from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Overview', href: '/dashboard' },
  { label: 'Debtors', href: '/debtors' },
  { label: 'Campaigns', href: '/campaigns' },
  { label: 'Payments', href: '/payments' },
  { label: 'Analytics', href: '/analytics' },
]

function SignOutItem({ onSignOut }: { onSignOut: () => void }) {
  const ctx = useContext(DropdownContext)
  return (
    <DropdownMenuItem
      onClick={() => {
        ctx?.setOpen(false)
        onSignOut()
      }}
      className="flex items-center gap-2 text-red-600 hover:bg-red-50 hover:text-red-700"
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </DropdownMenuItem>
  )
}

function getInitial(name: string | null, email: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }
  if (email) return email.slice(0, 2).toUpperCase()
  return '?'
}

export function Navbar({ orgName, userName, userEmail }: { orgName: string; userName: string | null; userEmail: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  async function signOut() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <>
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[280px] p-0">
              <div className="flex h-full flex-col">
                <SheetHeader className="border-b border-gray-200 px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <SheetTitle className="text-base font-semibold text-gray-900">DebtFlow Pro</SheetTitle>
                      <p className="text-xs text-gray-500 mt-0.5">Recovery operations</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMobileMenuOpen(false)}
                      className="h-10 w-10 shrink-0 rounded-full p-0"
                      aria-label="Close menu"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </SheetHeader>
                <nav className="flex-1 space-y-0.5 px-3 py-3">
                  {NAV_ITEMS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        pathname === item.href
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
                <div className="border-t border-gray-200 px-5 py-4 bg-gray-50/50">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
                      {getInitial(userName, userEmail)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 truncate">{userName || 'User'}</div>
                      <div className="text-xs text-gray-500 truncate">{userEmail}</div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={signOut} className="w-full">
                    Sign out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <div className="md:hidden">
            <div className="text-sm font-semibold text-gray-900">DebtFlow Pro</div>
          </div>
          <div className="hidden md:block">
            <div className="text-sm text-gray-500">Organization</div>
            <div className="text-sm font-semibold text-gray-900">{orgName}</div>
          </div>
        </div>
        <div className="relative">
          <DropdownMenu>
            <DropdownMenuTrigger>
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1.5 md:px-3 md:py-2 text-left text-sm hover:bg-gray-50 transition-colors md:min-w-[160px]"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
                  {getInitial(userName, userEmail)}
                </div>
                <div className="min-w-0 flex-1 hidden md:block">
                  <div className="font-medium text-gray-900 truncate">{userName || 'User'}</div>
                  <div className="text-xs text-gray-500 truncate">{userEmail}</div>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-gray-400 hidden md:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 right-0 left-auto">
              <div className="px-3 py-2 border-b border-gray-100">
                <div className="font-medium text-gray-900 truncate">{userName || 'User'}</div>
                <div className="text-xs text-gray-500 truncate">{userEmail}</div>
              </div>
              <SignOutItem onSignOut={signOut} />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  )
}
