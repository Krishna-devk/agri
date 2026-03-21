import { useState } from 'react'
import Globe from 'react-globe.gl'
import './WeatherPage.css'



const WeatherPage = () => {
  const [city, setCity] = useState('')
  const [weather, setWeather] = useState(null)
  const [forecast, setForecast] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchWeather = async (e) => {
    e.preventDefault()
    if (!city.trim()) return

    setLoading(true)
    setError('')
    setWeather(null)
    setForecast(null)

    try {
      const apiKey = import.meta.env.VITE_WEATHER_API_KEY || import.meta.env.VITE_OWM_API_KEY
      if (!apiKey) {
        throw new Error("Missing Weather API Key. Add VITE_WEATHER_API_KEY to your .env file.")
      }

      const encodedCity = encodeURIComponent(city.trim())
      const [resWeather, resForecast] = await Promise.all([
        fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodedCity}&appid=${apiKey}&units=metric`),
        fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${encodedCity}&appid=${apiKey}&units=metric`)
      ])

      if (!resWeather.ok) {
        const errorData = await resWeather.json()
        throw new Error(errorData.message || 'Could not fetch weather data from OpenWeatherMap.')
      }

      const dataWeather = await resWeather.json()
      
      const mappedWeather = {
        city: dataWeather.name,
        description: dataWeather.weather[0].description,
        icon: dataWeather.weather[0].icon,
        temp: dataWeather.main.temp,
        feels_like: dataWeather.main.feels_like,
        humidity: dataWeather.main.humidity,
        wind_speed: dataWeather.wind.speed
      }

      setWeather(mappedWeather)
      localStorage.setItem('agrisense_weather_city', mappedWeather.city)

      if (resForecast.ok) {
        const dataForecast = await resForecast.json()
        
        // Group 3-hour chunks into a daily forecast for UI representation
        const dailyData = {}
        dataForecast.list.forEach(item => {
          const date = item.dt_txt.split(' ')[0]
          if (!dailyData[date]) {
            // Find day name
            let dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' })
            dailyData[date] = { temps: [], icons: [], day_name: dayName }
          }
          dailyData[date].temps.push(item.main.temp_max, item.main.temp_min)
          dailyData[date].icons.push(item.weather[0].icon)
        })

        const mappedForecast = Object.keys(dailyData).slice(0, 5).map(date => {
          const d = dailyData[date]
          return {
            day_name: d.day_name,
            icon: d.icons[Math.floor(d.icons.length / 2)],
            max_temp: Math.max(...d.temps),
            min_temp: Math.min(...d.temps)
          }
        })

        setForecast(mappedForecast)
      }
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to connect to the weather service.')
    } finally {
      setLoading(false)
    }
  }

  const getWeatherBg = (icon) => {
    if (!icon) return 'linear-gradient(135deg, #74ebd5, #9face6)'
    if (icon.startsWith('01')) return 'linear-gradient(135deg, #f6d365, #fda085)' // clear
    if (icon.startsWith('02') || icon.startsWith('03') || icon.startsWith('04'))
      return 'linear-gradient(135deg, #c9d6ff, #e2e2e2)' // clouds
    if (icon.startsWith('09') || icon.startsWith('10'))
      return 'linear-gradient(135deg, #4e54c8, #8f94fb)' // rain
    if (icon.startsWith('11')) return 'linear-gradient(135deg, #373b44, #4286f4)' // thunder
    if (icon.startsWith('13')) return 'linear-gradient(135deg, #e0eafc, #cfdef3)' // snow
    return 'linear-gradient(135deg, #74ebd5, #9face6)'
  }

  return (
    <div className="weather-page">
      {/* Header */}
      <div className="weather-header">
        <div className="weather-header__shapes">
          <div className="w-shape w-shape-1" />
          <div className="w-shape w-shape-2" />
        </div>
        
        <div className="container weather-header__content">


          <div className="section-tag">🌦️ Live Weather</div>
          <h1 className="weather-title">
            Field Weather <span className="gradient-text">Insights</span>
          </h1>
          <p className="weather-subtitle">
            Check real-time weather conditions for any location to make smarter crop management decisions.
          </p>

          {/* Search */}
          <form className="weather-search" onSubmit={fetchWeather} id="weather-search-form">
            <input
              type="text"
              className="weather-input"
              placeholder="Enter city name (e.g. Mumbai, London...)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              id="weather-city-input"
            />
            <button type="submit" className="btn btn-primary" id="weather-search-btn" disabled={loading}>
              {loading ? (
                <span className="weather-spinner" />
              ) : (
                '🔍 Search'
              )}
            </button>
          </form>
        </div>
      </div>

      <div className="container weather-body">
        {/* Error */}
        {error && (
          <div className="weather-error" id="weather-error-msg">
            <span>⚠️</span>
            <p>{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="weather-loading">
            <div className="weather-spinner-lg" />
            <p>Fetching weather data...</p>
          </div>
        )}

        {/* Result Card */}
        {weather && !loading && (
          <div
            className="weather-card"
            style={{ background: getWeatherBg(weather.icon) }}
            id="weather-result-card"
          >
            <div className="weather-card__glass">
              {/* City & Icon */}
              <div className="weather-card__top">
                <div>
                  <div className="weather-card__city">{weather.city}</div>
                  <div className="weather-card__desc">{weather.description}</div>
                </div>
                {weather.icon && (
                  <img
                    className="weather-card__icon"
                    src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
                    alt={weather.description}
                  />
                )}
              </div>

              {/* Temperature */}
              <div className="weather-card__temp">
                {Math.round(weather.temp)}°C
              </div>
              <div className="weather-card__feels">
                Feels like {Math.round(weather.feels_like)}°C
              </div>

              {/* Stats */}
              <div className="weather-card__stats">
                <div className="weather-stat">
                  <span className="weather-stat__icon">💧</span>
                  <span className="weather-stat__value">{weather.humidity}%</span>
                  <span className="weather-stat__label">Humidity</span>
                </div>
                <div className="weather-stat">
                  <span className="weather-stat__icon">💨</span>
                  <span className="weather-stat__value">{weather.wind_speed} m/s</span>
                  <span className="weather-stat__label">Wind Speed</span>
                </div>
                <div className="weather-stat">
                  <span className="weather-stat__icon">🌡️</span>
                  <span className="weather-stat__value">{Math.round(weather.temp)}°C</span>
                  <span className="weather-stat__label">Temperature</span>
                </div>
              </div>

              {/* Crop Tip */}
              <div className="weather-card__tip">
                <span>🌾</span>
                <p>
                  {weather.humidity > 75
                    ? 'High humidity — watch for fungal diseases on your crops.'
                    : weather.humidity < 40
                    ? 'Low humidity — consider irrigation to maintain soil moisture.'
                    : 'Humidity levels are optimal for most crops.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Forecast Section */}
        {forecast && forecast.length > 0 && !loading && (
          <div className="forecast-section animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
            <h3 className="forecast-title">5-Day Forecast</h3>
            <div className="forecast-grid">
              {forecast.map((day, i) => (
                <div key={i} className="forecast-card">
                  <div className="forecast-card__day">{day.day_name}</div>
                  {day.icon && (
                    <img
                      className="forecast-card__icon"
                      src={`https://openweathermap.org/img/wn/${day.icon}.png`}
                      alt={day.description}
                    />
                  )}
                  <div className="forecast-card__temps">
                    <span className="fc-max">{Math.round(day.max_temp)}°</span>
                    <span className="fc-min">{Math.round(day.min_temp)}°</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Placeholder */}
        {!weather && !loading && !error && (
          <div className="weather-placeholder">
            <div className="weather-placeholder__globe">
              <Globe
                width={300}
                height={300}
                backgroundColor="rgba(0,0,0,0)"
                showAtmosphere={true}
                atmosphereColor="#00f3ff"
                atmosphereAltitude={0.2}
                globeImageUrl="//unpkg.com/three-globe/example/img/earth-day.jpg"
                enablePointerInteraction={true}
              />
            </div>
            <h3>Search for any city</h3>

            <p>Get real-time temperature, humidity, and wind data to plan your agricultural activities.</p>
            <div className="weather-placeholder__hints">
              {['Mumbai', 'Delhi', 'Pune', 'Bengaluru', 'Chennai'].map((c) => (
                <button
                  key={c}
                  className="weather-hint-chip"
                  onClick={() => { setCity(c); }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default WeatherPage
