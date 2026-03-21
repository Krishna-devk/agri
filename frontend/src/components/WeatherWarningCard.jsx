import { useState, useEffect } from 'react'
import './WeatherWarningCard.css'

const WeatherWarningCard = ({ city }) => {
  // Use prop if provided, else use last searched city, else default to Pune
  const activeCity = city || localStorage.getItem('agrisense_weather_city') || "Pune"
  
  const [warnings, setWarnings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetchWeatherForecast()
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
          dailyData[date] = { temps: [], humidities: [], winds: [], icons: [] }
        }
        dailyData[date].temps.push(item.main.temp_max, item.main.temp_min)
        dailyData[date].humidities.push(item.main.humidity)
        dailyData[date].winds.push(item.wind.speed) // m/s
        dailyData[date].icons.push(item.weather[0].icon)
      })

      const days = Object.keys(dailyData).slice(0, 5).map(date => {
        const d = dailyData[date]
        return {
          icon: d.icons[Math.floor(d.icons.length / 2)], // take mid-day icon
          max_temp: Math.max(...d.temps),
          min_temp: Math.min(...d.temps),
          max_humidity: Math.max(...d.humidities),
          max_wind: Math.max(...d.winds)
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

    days.forEach(day => {
      // 1. Heavy Rain Check
      if (day.icon && (day.icon.startsWith('09') || day.icon.startsWith('10') || day.icon.startsWith('11'))) {
        alerts.add("Heavy rainfall or thunderstorms expected. Avoid irrigation and ensure proper field drainage.")
      }
      // 2. Extreme Heat Check
      if (day.max_temp >= 38) {
        alerts.add("Extreme heat wave forecasted. Increase soil moisture and monitor for heat stress.")
      }
      // 3. Frost Warning
      if (day.min_temp <= 5) {
        alerts.add("Frost conditions detected. Protect sensitive crops and apply light irrigation.")
      }
      // 4. Fungal Pathogen Risk
      if (day.max_humidity > 85 && day.max_temp > 25) {
        alerts.add("High humidity and warm temperatures ahead. Highly favorable for fungal diseases. Keep a close watch.")
      }
      // 5. High Winds Alert (m/s to km/h rough conversion: x 3.6)
      // OWM Metric returns m/s, so threshold is ~7 m/s (25 km/h)
      if (day.max_wind > 7) {
        alerts.add("Strong winds forecasted (>25 km/h equivalents). Secure loose structures and delay spraying pesticides.")
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
