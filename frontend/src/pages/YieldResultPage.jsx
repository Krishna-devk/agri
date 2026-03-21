import { useLocation, useNavigate, Link } from 'react-router-dom'
import './YieldResultPage.css'

const YieldResultPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const result = location.state?.result

  if (!result) {
    return (
      <div className="no-result">
        <div className="container no-result__inner">
          <span>📊</span>
          <h2>No prediction found</h2>
          <p>Please fill in the yield prediction form to see results.</p>
          <Link to="/predict" className="btn btn-teal" id="go-predict-btn">Go to Prediction</Link>
        </div>
      </div>
    )
  }

  const variance = parseFloat(result.variancePercent)
  const isPositive = variance >= 0
  const yieldPct = Math.min(100, Math.max(0, (result.predictedYield / (result.averageYield * 1.5)) * 100))

  const factors = [
    { label: 'Climate Suitability', value: 82, color: '#22c55e' },
    { label: 'Soil Quality', value: 74, color: '#14b8a6' },
    { label: 'Irrigation Adequacy', value: 68, color: '#3b82f6' },
    { label: 'Nutrient Availability', value: 79, color: '#f59e0b' },
    { label: 'Pest/Disease Risk (Low is good)', value: 30, color: '#ef4444', inverse: true },
  ]

  return (
    <div className="yield-result-page">
      {/* Header */}
      <div className="yield-result__header">
        <div className="container">
          <div className="result-header__top">
            <button className="back-btn" onClick={() => navigate('/predict')} id="back-predict-btn">
              ← Back to Prediction
            </button>
            <div className="result-badge result-badge--teal">📊 Prediction Complete</div>
          </div>
          <div className="yield-result-hero">
            <div className="yield-result-hero__info">
              <div className="section-tag">🌾 Yield Forecast</div>
              <h1>{result.crop} Yield Prediction</h1>
              <div className="meta-pills">
                <span>📅 {result.season}</span>
                <span>🌍 {result.area} ha</span>
                <span>🌱 {result.soil}</span>
                {result.irrigation && <span>💧 {result.irrigation}</span>}
              </div>
            </div>
            <div className="yield-hero-stats">
              <div className="big-stat holographic-display">
                <div className="big-stat__value">
                  {result.predictedYield}
                  <span className="big-stat__unit">{result.yieldUnit}</span>
                </div>
                <div className="big-stat__label">Total Predicted Yield</div>

                <div className={`variance-badge ${isPositive ? 'positive' : 'negative'}`}>
                  {isPositive ? '↑' : '↓'} {Math.abs(variance)}% vs average
                </div>
              </div>
              <div className="small-stats">
                <div className="small-stat">
                  <div className="small-stat__val">{result.yieldPerHectare}</div>
                  <div className="small-stat__lbl">{result.yieldUnit}/ha</div>
                </div>
                <div className="small-stat">
                  <div className="small-stat__val">{result.confidence}%</div>
                  <div className="small-stat__lbl">Confidence</div>
                </div>
                <div className="small-stat">
                  <div className="small-stat__val">Grade {result.grade}</div>
                  <div className="small-stat__lbl">Quality</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="container yield-result__body">
        <div className="yield-result-grid">
          {/* Yield Gauge */}
          <div className="result-card-yr">
            <h3>📈 Yield Performance Meter</h3>
            <div className="gauge-wrap">
              <div className="gauge-track">
                <div className="gauge-fill" style={{ width: `${yieldPct}%` }} />
                <div className="gauge-marker" style={{ left: `66%` }}>
                  <div className="gauge-marker__line" />
                  <div className="gauge-marker__label">Avg</div>
                </div>
              </div>
              <div className="gauge-labels">
                <span>0</span>
                <span className="gauge-current">{result.predictedYield} {result.yieldUnit}</span>
                <span>{(parseFloat(result.averageYield) * 1.5).toFixed(1)}</span>
              </div>
            </div>
            <p className="gauge-desc">
              {isPositive
                ? `🎉 Your expected yield is ${Math.abs(variance)}% above district average. Excellent conditions!`
                : `⚠️ Yield is ${Math.abs(variance)}% below average. Check soil nutrients and irrigation.`}
            </p>
          </div>

          {/* Factor Analysis */}
          <div className="result-card-yr">
            <h3>🔍 Factor Analysis</h3>
            <div className="factors-list">
              {factors.map((f, i) => (
                <div key={i} className="factor-row">
                  <div className="factor-row__label">{f.label}</div>
                  <div className="factor-bar-track">
                    <div
                      className="factor-bar-fill"
                      style={{
                        width: `${f.value}%`,
                        background: f.inverse
                          ? f.value < 40 ? '#22c55e' : '#ef4444'
                          : f.color
                      }}
                    />
                  </div>
                  <span className="factor-value">{f.value}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Rainfall Mini Chart */}
          <div className="result-card-yr">
            <h3>🌧️ Rainfall Distribution (mm)</h3>
            <div className="bar-chart">
              {result.monthlyData?.map((m, i) => (
                <div key={i} className="bar-chart__col">
                  <div className="bar-chart__bar-wrap">
                    <div
                      className="bar-chart__bar"
                      style={{ height: `${(m.rainfall / 160) * 100}%` }}
                      title={`${m.rainfall}mm`}
                    />
                  </div>
                  <div className="bar-chart__label">{m.month}</div>
                  <div className="bar-chart__val">{m.rainfall}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="result-card-yr result-card-yr--recommendations">
            <h3>💡 AI Recommendations</h3>
            <div className="recommendation-list">
              {result.recommendations?.map((r, i) => (
                <div key={i} className="rec-item">
                  <div className="rec-num">{i + 1}</div>
                  <p>{r}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Input Summary */}
        <div className="input-summary-card">
          <h3>📋 Input Parameters Summary</h3>
          <div className="input-summary-grid">
            {result.rainfall && <div className="param-chip"><span>🌧️ Rainfall</span><strong>{result.rainfall}mm</strong></div>}
            {result.temperature && <div className="param-chip"><span>🌡️ Temperature</span><strong>{result.temperature}°C</strong></div>}
            {result.humidity && <div className="param-chip"><span>💨 Humidity</span><strong>{result.humidity}%</strong></div>}
            {result.ph && <div className="param-chip"><span>🧪 Soil pH</span><strong>{result.ph}</strong></div>}
            {result.nitrogen && <div className="param-chip"><span>🌿 Nitrogen</span><strong>{result.nitrogen} kg/ha</strong></div>}
            {result.phosphorus && <div className="param-chip"><span>⚗️ Phosphorus</span><strong>{result.phosphorus} kg/ha</strong></div>}
            {result.potassium && <div className="param-chip"><span>🔋 Potassium</span><strong>{result.potassium} kg/ha</strong></div>}
            {result.fertilizer && <div className="param-chip"><span>🌱 Fertilizer</span><strong>{result.fertilizer}</strong></div>}
          </div>
        </div>

        {/* Actions */}
        <div className="result-actions">
          <button className="btn btn-primary btn-lg" onClick={() => window.print()} id="print-yield-btn">🖨️ Print Report</button>
          <Link to="/predict" className="btn btn-outline btn-lg" id="new-prediction-btn">📊 New Prediction</Link>
          <Link to="/detect" className="btn btn-teal btn-lg" id="detect-from-yield-btn">🔬 Detect Disease →</Link>
        </div>
      </div>
    </div>
  )
}

export default YieldResultPage
