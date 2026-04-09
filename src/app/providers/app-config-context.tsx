'use client'

import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { APP_CONFIG_STORAGE_KEY, DEFAULT_CONFIG, loadAppConfigFromStorage } from '@/app/providers/constants'
import type { AppConfig, AppConfigContextType } from '@/app/providers/types'

const AppConfigContext = createContext<AppConfigContextType | undefined>(undefined)

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG)

  useEffect(() => {
    setConfig(loadAppConfigFromStorage())
  }, [])

  const updateConfig = useMemo(
    () => (newConfig: Partial<AppConfig>) => {
      setConfig((prev) => {
        const next = { ...prev, ...newConfig }
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(APP_CONFIG_STORAGE_KEY, JSON.stringify(next))
          } catch {
            // ignore
          }
        }
        return next
      })
    },
    []
  )

  const value = useMemo<AppConfigContextType>(() => ({ config, updateConfig }), [config, updateConfig])

  return <AppConfigContext.Provider value={value}>{children}</AppConfigContext.Provider>
}

export function useAppConfig() {
  const ctx = useContext(AppConfigContext)
  if (!ctx) throw new Error('useAppConfig must be used within AppConfigProvider')
  return ctx
}
