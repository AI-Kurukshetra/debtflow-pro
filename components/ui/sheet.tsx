'use client'

import * as React from 'react'
import { cn } from '@/lib/cn'

type SheetContextValue = {
  open: boolean
  setOpen: (v: boolean) => void
}

const SheetContext = React.createContext<SheetContextValue | null>(null)

export function Sheet({ open, onOpenChange, children }: { open: boolean; onOpenChange: (v: boolean) => void; children: React.ReactNode }) {
  return <SheetContext.Provider value={{ open, setOpen: onOpenChange }}>{children}</SheetContext.Provider>
}

export function SheetTrigger({ children, onClick, asChild }: { children: React.ReactNode; onClick?: () => void; asChild?: boolean }) {
  const ctx = React.useContext(SheetContext)
  if (!ctx) return null
  
  const handleClick = () => {
    onClick?.()
    ctx.setOpen(true)
  }
  
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(
      children as React.ReactElement<{ onClick?: () => void }>,
      { onClick: handleClick }
    )
  }
  
  return (
    <span
      onClick={handleClick}
      className="inline-flex cursor-pointer"
    >
      {children}
    </span>
  )
}

export function SheetContent({ className, children }: { className?: string; children: React.ReactNode }) {
  const ctx = React.useContext(SheetContext)
  if (!ctx || !ctx.open) return null
  
  return (
    <div 
      className="fixed inset-0 z-50 flex justify-end bg-black/30"
      onClick={() => ctx.setOpen(false)}
    >
      <div 
        className={cn('h-full w-full max-w-md bg-white p-6 shadow-xl overflow-y-auto', className)}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4', className)} {...props} />
}

export function SheetTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-lg font-semibold', className)} {...props} />
}
