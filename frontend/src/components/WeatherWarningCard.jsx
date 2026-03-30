import { useState, useEffect } from 'react'
import './WeatherWarningCard.css'
import { useLocationData } from '../lib/useLocationData'

const WeatherWarningCard = ({ city: cityProp }) => {
  const locationData = useLocationData()
  // Use explicit prop first, then live synced city, never hardcode a default
  const activeCity = cityProp || locationData.city || ''

  const [warnings, setWarnings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const handleProfileUpdate = () => {
       const profile = JSON.parse(localStorage.getItem('agrisense_user_profile') || 'null');
       if (profile?.location) {
         fetchWeatherForecast();
       }
    };
    if (!activeCity) return // Wait until we have a real city
    fetchWeatherForecast()
    window.addEventListener('agrisense_profile_updated', handleProfileUpdate);
    return () => window.removeEventListener('agrisense_profile_updated', handleProfileUpdate);
  }, [activeCity])

  const fetchWeatherForecast = async () => {
    setLoading(true)
    setError(false)
    try {
      const apiKey = import.meta.env.VITE_WEATHER_API_KEY || import.meta.env.VITE_OWM_API_KEY
      if (!apiKey) {
        throw new Error('Missing Weather API Key. Please add VITE_WEATHER_API_KEY to your .env file.')
      }

      const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(activeCity)}&appid=${apiKey}&units=metric`)
      if (!res.ok) throw new Error('Failed to fetch forecast from OpenWeatherMap')
      
      const rawData = await res.json()
      
      // Map OWM 3-hour list to abstract 'days' object for the crop warnings rules
      const dailyData = {}
      rawData.list.forEach(item => {
        const date = item.dt_txt.split(' ')[0]
        if (!dailyData[date]) {
          dailyData[date] = { temps: [], humidities: [], winds: [], icons: [], pops: [] }
        }
        dailyData[date].temps.push(item.main.temp_max, item.main.temp_min)
        dailyData[date].humidities.push(item.main.humidity)
        dailyData[date].winds.push(item.wind.speed) 
        dailyData[date].icons.push(item.weather[0].icon)
        dailyData[date].pops.push(item.pop || 0) // Probability of Precip
      })

      const days = Object.keys(dailyData).slice(0, 5).map(date => {
        const d = dailyData[date]
        return {
          date: date,
          icon: d.icons[Math.floor(d.icons.length / 2)],
          max_temp: Math.max(...d.temps),
          min_temp: Math.min(...d.temps),
          max_humidity: Math.max(...d.humidities),
          max_wind: Math.max(...d.winds),
          max_pop: Math.max(...d.pops)
        }
      })

      const generatedWarnings = getCropWarnings(days)
      setWarnings(generatedWarnings)
    } catch (err) {
      console.error("Failed to fetch forecast for warnings:", err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const getCropWarnings = (days) => {
    const alerts = new Set()

    days.forEach((day, index) => {
      const dateObj = new Date(day.date)
      const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const dayLabel = index === 0 ? "Today" : formattedDate

      // 1. Heavy Rain Check - Only if icon is Rain/Storm AND probability > 40%
      if (day.icon && (day.icon.startsWith('09') || day.icon.startsWith('10') || day.icon.startsWith('11'))) {
        if (day.max_pop > 0.4) {
          alerts.add(`Forecast for ${dayLabel}: Critical risk of heavy rainfall/thunderstorms (${Math.round(day.max_pop * 100)}% prob). Ensure drainage is clear.`)
        }
      }
      // 2. Extreme Heat Check
      if (day.max_temp >= 38) {
        alerts.add(`Forecast for ${dayLabel}: Extreme heat stress warning (Peak ${Math.round(day.max_temp)}°C). Increase irrigation frequency.`)
      }
      // 3. Frost Warning
      if (day.min_temp <= 5) {
        alerts.add(`Forecast for ${dayLabel}: Possible frost event (Low ${Math.round(day.min_temp)}°C). Protect sensitive seedlings.`)
      }
      // 4. Fungal Pathogen Risk
      if (day.max_humidity > 85 && day.max_temp > 25) {
        alerts.add(`Forecast for ${dayLabel}: High fungal risk detected (Humidity >85%). Maintain proper ventilation.`)
      }
      // 5. High Winds Alert
      if (day.max_wind > 10) { // Threshold 10 m/s (~36 km/h) for stronger warning
        alerts.add(`Forecast for ${dayLabel}: Strong winds expected (${Math.round(day.max_wind * 3.6)} km/h). Secure equipment.`)
      }
    })

    return Array.from(alerts)
  }

  if (loading) {
    return (
      <div className="container weather-warning-card__wrapper">
        <div className="ww-card skeleton-loader shadow-sm">
          <div className="spinner-small" /> Loading Agronomic Advisory...
        </div>
      </div>
    )
  }

  if (error) {
    // Fail silently in UI instead of breaking dashboard, or show a subtle error
    return null
  }

  const isOptimal = warnings.length === 0

  return (
    <div className="container weather-warning-card__wrapper animate-fadeInUp">
      <div className={`ww-card shadow-md ${isOptimal ? 'ww-optimal' : 'ww-warning'}`}>
        {isOptimal ? (
          <div className="ww-content">
            <div className="ww-icon safe-icon">✅</div>
            <div className="ww-text">
              <h4 className="ww-title">Optimal Weather Conditions ({activeCity})</h4>
              <p className="ww-desc">No critical weather warnings for the next 5 days. Conditions are optimal for your field.</p>
            </div>
          </div>
        ) : (
          <div className="ww-content">
            <div className="ww-icon alert-icon">⚠️</div>
            <div className="ww-text">
              <h4 className="ww-title">Agronomic Weather Advisory ({activeCity})</h4>
              <ul className="ww-list">
                {warnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default WeatherWarningCard
