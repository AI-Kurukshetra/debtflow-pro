'use client'

import * as React from 'react'

export type Toast = { title?: string; description?: string }

type ToastContextValue = {
  toast: (t: Toast) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [, setTick] = React.useState(0)
  const toast = (t: Toast) => {
    if (typeof window !== 'undefined') {
      const message = t.title ? `${t.title}: ${t.description ?? ''}` : t.description ?? ''
      if (message) window.alert(message)
    }
    setTick((v) => v + 1)
  }
  return <ToastContext.Provider value={{ toast }}>{children}</ToastContext.Provider>
}

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) {
    return { toast: () => {} }
  }
  return ctx
}
