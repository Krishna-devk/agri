/**
 * useLocationData — shared reactive hook for location + weather data.
 * 
 * Returns the latest synced data from localStorage and re-renders the
 * consuming component automatically whenever a new sync fires (GPS or profile).
 * 
 * Shape of returned object:
 * {
 *   city: string,           // "Mumbai", "Delhi" etc.
 *   temperature: number,    // °C
 *   humidity: number,       // %
 *   rainfall: number,       // mm annual
 *   weather_desc: string,   // "Partly Cloudy" etc.
 *   isLoaded: boolean,      // true once data is available
 * }
 */
import { useState, useEffect } from 'react'

const STORAGE_KEY = 'agrisense_location_data_v2'

function parseLocationStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function useLocationData() {
  const [locationData, setLocationData] = useState(() => parseLocationStorage())

  useEffect(() => {
    // Called whenever a new sync fires (GPS or profile-city)
    const handleSync = (e) => {
      if (e.detail) {
        setLocationData(e.detail)
      } else {
        setLocationData(parseLocationStorage())
      }
    }

    // Also react to raw storage events (cross-tab)
    const handleStorage = (e) => {
      if (e.key === STORAGE_KEY) {
        setLocationData(parseLocationStorage())
      }
    }

    window.addEventListener('agrisense_location_synced', handleSync)
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener('agrisense_location_synced', handleSync)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  if (!locationData) {
    return {
      city: '',
      temperature: '',
      humidity: '',
      rainfall: '',
      weather_desc: '',
      isLoaded: false,
    }
  }

  return {
    city: locationData.region_info || '',
    temperature: locationData.temperature ?? '',
    humidity: locationData.humidity ?? '',
    rainfall: locationData.rainfall ?? '',
    weather_desc: locationData.weather_description || '',
    isLoaded: true,
    raw: locationData,
  }
}
