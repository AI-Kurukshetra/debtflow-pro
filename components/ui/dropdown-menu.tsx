'use client'

import * as React from 'react'
import { cn } from '@/lib/cn'

type DropdownContextValue = {
  open: boolean
  setOpen: (v: boolean) => void
}

export const DropdownContext = React.createContext<DropdownContextValue | null>(null)

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  return <DropdownContext.Provider value={{ open, setOpen }}>{children}</DropdownContext.Provider>
}

export function DropdownMenuTrigger({ children }: { children: React.ReactNode }) {
  const ctx = React.useContext(DropdownContext)
  if (!ctx) return null
  return (
    <span className="inline-flex" onClick={() => ctx.setOpen(!ctx.open)}>
      {children}
    </span>
  )
}

export function DropdownMenuContent({ className, children }: { className?: string; children: React.ReactNode }) {
  const ctx = React.useContext(DropdownContext)
  if (!ctx || !ctx.open) return null
  return (
    <div className={cn('absolute right-0 mt-2 w-48 rounded-md border border-gray-200 bg-white p-2 shadow-lg', className)}>
      {children}
    </div>
  )
}

export function DropdownMenuItem({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('cursor-pointer rounded px-3 py-2 text-sm hover:bg-gray-50', className)} {...props} />
}
