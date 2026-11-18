import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export interface SystemSettingsValues {
  office_name: string
  hrmo_name: string
  hrmo_title: string
  mho_name: string
  mho_title: string
  min_duty_staff: number
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettingsValues = {
  office_name: 'Office of the Municipal Health',
  hrmo_name: 'Catherine C. Gatchalian',
  hrmo_title: 'MGDH I - HRMO',
  mho_name: 'Joanne Marie V. Dueñas',
  mho_title: 'Municipal Health Officer',
  min_duty_staff: 2,
}

export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettingsValues>(DEFAULT_SYSTEM_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadSettings() {
      try {
        const { data, error } = await supabase.from('system_settings').select('key, value')
        if (!error && data && data.length > 0 && isMounted) {
          const mapped = { ...DEFAULT_SYSTEM_SETTINGS }
          data.forEach((row) => {
            if (row.key === 'office_name') mapped.office_name = row.value
            if (row.key === 'hrmo_name') mapped.hrmo_name = row.value
            if (row.key === 'hrmo_title') mapped.hrmo_title = row.value
            if (row.key === 'mho_name') mapped.mho_name = row.value
            if (row.key === 'mho_title') mapped.mho_title = row.value
            if (row.key === 'min_duty_staff') mapped.min_duty_staff = parseInt(row.value, 10) || 2
          })
          setSettings(mapped)
        }
      } catch (err) {
        console.warn('Failed to load system_settings from Supabase, using defaults:', err)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadSettings()
    return () => {
      isMounted = false
    }
  }, [])

  return { settings, isLoading }
}
