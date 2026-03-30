import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import './MarketPage.css'

const MarketPage = () => {
  const [commodity, setCommodity] = useState('')
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [syncStatus, setSyncStatus] = useState('')

  const performSearch = async (cropName, districtFilter = '') => {
    if (!cropName.trim()) return

    const formattedCommodity = cropName.trim()[0].toUpperCase() + cropName.trim().slice(1).toLowerCase()
    
    // CHECK CACHE (Include district in cache key if available)
    const cacheKey = `agrisense_session_market_${formattedCommodity}_${districtFilter}`
    const cachedData = sessionStorage.getItem(cacheKey)
    
    if (cachedData) {
      setRecords(JSON.parse(cachedData))
      setHasSearched(true)
      return
    }

    setLoading(true)
    setError('')
    setHasSearched(true)
    setRecords([])
    setSyncStatus(districtFilter ? `🛰️ Loading prices for ${districtFilter}...` : '🛰️ Loading market prices...')

    try {
      const apiKey = import.meta.env.VITE_MARKET_API_KEY
      if (!apiKey) {
        throw new Error('API Key is missing. Please add VITE_MARKET_API_KEY in .env.')
      }
      
      let url = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${apiKey}&format=json&limit=100&filters[commodity]=${encodeURIComponent(formattedCommodity)}`
      
      if (districtFilter) {
        url += `&filters[district]=${encodeURIComponent(districtFilter)}`
      }

      const res = await fetch(url)
      
      if (!res.ok) {
        throw new Error('Network response was not ok.')
      }
      
      const data = await res.json()

      if (data.status === 'error' || data.error) {
        setError(data.message || 'Could not fetch market data.')
      } else {
        const fetched = data.records || []
        setRecords(fetched)
        // SAVE TO CACHE
        sessionStorage.setItem(cacheKey, JSON.stringify(fetched))
      }
    } catch (err) {
      console.error(err)
      setError('Failed to connect to the Government Market service. Make sure your API key is correct.')
    } finally {
      setLoading(false)
      setSyncStatus('')
    }
  }

  useEffect(() => {
    const autoFillAndSearch = async () => {
      const profile = JSON.parse(localStorage.getItem('agrisense_user_profile') || 'null')
      const lastCrop = profile?.crop_type || localStorage.getItem('agrisense_last_crop')

      if (!lastCrop) return 

      const cropName = lastCrop.trim()[0].toUpperCase() + lastCrop.trim().slice(1).toLowerCase()
      setCommodity(cropName)

      // Get district from profile if available
      let district = ''
      if (profile?.location) {
        district = profile.location.split(',')[0].trim()
      }

      await performSearch(cropName, district)
    }

    autoFillAndSearch()
    window.addEventListener('agrisense_profile_updated', autoFillAndSearch)
    return () => window.removeEventListener('agrisense_profile_updated', autoFillAndSearch)
  }, [])

  const fetchMarketPrices = async (e) => {
    e.preventDefault()
    await performSearch(commodity)
  }


  // ---- Analytics Logic ----
  const validRecords = records.filter(r => r.modal_price && !isNaN(parseFloat(r.modal_price)))
  const prices = validRecords.map(r => parseFloat(r.modal_price))

  const avgPrice = prices.length ? (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(0) : 0
  const maxPrice = prices.length ? Math.max(...prices).toFixed(0) : 0
  const minPrice = prices.length ? Math.min(...prices).toFixed(0) : 0

  // Group by State
  const stateData = {}
  validRecords.forEach(r => {
    if (!stateData[r.state]) stateData[r.state] = []
    stateData[r.state].push(parseFloat(r.modal_price))
  })

  // Calculate avg per state and sort for top 5
  const chartData = Object.keys(stateData).map(state => {
    const arr = stateData[state]
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length
    return { name: state, price: Math.round(avg) }
  })
  .sort((a, b) => b.price - a.price)
  .slice(0, 5)

  // Premium Gradients for Recharts
  const gradients = [
    { id: 'color1', start: '#2dd4bf', end: '#0d9488' }, // Teal
    { id: 'color2', start: '#38bdf8', end: '#0284c7' }, // Light Blue
    { id: 'color3', start: '#818cf8', end: '#4f46e5' }, // Indigo
    { id: 'color4', start: '#c084fc', end: '#9333ea' }, // Purple
    { id: 'color5', start: '#f472b6', end: '#db2777' }, // Pink
  ]

  return (
    <div className="market-page">
      {/* Hero / Search Banner */}
      <section className="market-hero">
        <div className="container">
          <div className="market-hero__content animate-fadeInUp">
            <h1 className="market-title">Market Prices</h1>
            <p className="market-subtitle">
              Fetch real-time mandis prices, analyze highest and lowest rates, and see state-wise averages for smarter selling.
            </p>
            
            <form className="market-search shadow-lg" onSubmit={fetchMarketPrices}>
              <div className="search-input-group">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Enter a crop name (e.g., Wheat, Rice, Tomato)..."
                  value={commodity}
                  onChange={(e) => setCommodity(e.target.value)}
                  className="search-input"
                  required
                />
              </div>
              <button type="submit" className="btn btn-teal btn-search" disabled={loading}>
                {loading ? 'Searching...' : 'Search'}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="market-content container">
        {loading && (
          <div className="market-loading">
            <div className="spinner"></div>
            <p>Fetching real-time market data...</p>
          </div>
        )}

        {error && (
          <div className="alert alert-error">
            <span className="alert-icon">⚠️</span>
            {error}
          </div>
        )}

        {!hasSearched && !loading && (
          <div className="market-placeholder animate-fadeInUp">
            <div className="placeholder-icon">💰</div>
            <h3>Search for a crop to view prices</h3>
            <p>Type complete crop names like "Wheat" or "Potato" to get the most accurate results from Indian Mandis.</p>
          </div>
        )}

        {hasSearched && !loading && !error && records.length === 0 && (
          <div className="market-placeholder animate-fadeInUp">
            <div className="placeholder-icon">📭</div>
            <h3>No Mandi Quotes Found</h3>
            <p>No recent records for <strong>"{commodity}"</strong> in the government APMC dataset.</p>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '8px' }}>
              💡 Try alternate spellings — e.g. <em>"Paddy"</em> instead of "Rice", <em>"Arhar"</em> instead of "Tur", <em>"Gram"</em> instead of "Chickpea".
            </p>
          </div>
        )}

        {hasSearched && !loading && !error && records.length > 0 && (
          <div className="market-dashboard animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
            {/* Summary Metrics */}
            <div className="metrics-grid">
              <div className="metric-card shadow-sm metric-avg">
                <div className="metric-title">Average Price</div>
                <div className="metric-value">₹{avgPrice} <span className="metric-unit">/ Quintal</span></div>
              </div>
              <div className="metric-card shadow-sm metric-high">
                <div className="metric-title">Highest Price</div>
                <div className="metric-value text-teal">₹{maxPrice}</div>
              </div>
              <div className="metric-card shadow-sm metric-low">
                <div className="metric-title">Lowest Price</div>
                <div className="metric-value text-blue">₹{minPrice}</div>
              </div>
            </div>

            {/* Chart Section */}
            {chartData.length > 0 && (
              <div className="chart-section shadow-md">
                <h3 className="section-heading">Average Price by State (Top 5)</h3>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height={380}>
                    <BarChart data={chartData} margin={{ top: 30, right: 30, left: 10, bottom: 10 }} barSize={48}>
                      <defs>
                        <linearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.9}/>
                          <stop offset="95%" stopColor="#0d9488" stopOpacity={0.9}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={13} 
                             tickLine={false} axisLine={false} dy={10} fontWeight={500} />
                      <YAxis stroke="#94a3b8" fontSize={13} 
                             tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} dx={-10} />
                      <Tooltip 
                        cursor={{fill: '#f8fafc', opacity: 0.6 }} 
                        contentStyle={{borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} 
                        formatter={(value) => [`₹${value}`, 'Avg Price']}
                        itemStyle={{ color: '#0f172a', fontWeight: '700' }}
                        labelStyle={{ color: '#64748b', marginBottom: '4px' }}
                      />
                      <Bar dataKey="price" radius={[8, 8, 0, 0]} fill="url(#primaryGradient)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Raw Data List */}
            <div className="records-section">
              <h3 className="section-heading">Recent Mandi Quotes</h3>
              <div className="records-grid">
                {validRecords.map((r, i) => (
                  <div key={i} className="record-card shadow-sm">
                    <div className="rc-header">
                      <span className="rc-state">{r.state}</span>
                      <span className="rc-date">{r.arrival_date}</span>
                    </div>
                    <div className="rc-market">{r.market} <span className="rc-district">({r.district})</span></div>
                    <div className="rc-variety">Variety: {r.variety}</div>
                    <div className="rc-price">₹{r.modal_price} <span className="rc-unit">/ Quintal</span></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

export default MarketPage
