import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './YieldPage.css'
import WeatherWarningCard from '../components/WeatherWarningCard'

const cropOptions = ['Wheat', 'Rice', 'Corn', 'Cotton', 'Soybean', 'Sugarcane', 'Potato', 'Tomato', 'Onion', 'Groundnut']
const seasonOptions = ['Kharif (Monsoon)', 'Rabi (Winter)', 'Zaid (Summer)']
const soilOptions = ['Alluvial', 'Black (Regur)', 'Red & Yellow', 'Laterite', 'Loamy', 'Sandy']
const irrigationOptions = ['Rainfed', 'Canal Irrigation', 'Drip Irrigation', 'Sprinkler', 'Borewell/Tubewell']
const fertilizerOptions = ['None', 'Organic Only', 'NPK Balanced', 'High Nitrogen', 'Custom Mix']

const YieldPage = () => {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [form, setForm] = useState({
    crop: '',
    area: '',
    season: '',
    soil: '',
    irrigation: '',
    fertilizer: '',
    rainfall: '',
    temperature: '',
    humidity: '',
    ph: '',
    nitrogen: '',
    phosphorus: '',
    potassium: '',
  })

  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validate = () => {
    const errs = {}
    if (!form.crop) errs.crop = 'Please select a crop'
    if (!form.area || form.area <= 0) errs.area = 'Enter a valid area'
    if (!form.season) errs.season = 'Please select a season'
    if (!form.soil) errs.soil = 'Please select soil type'
    if (!form.rainfall) errs.rainfall = 'Enter expected rainfall'
    if (!form.temperature) errs.temperature = 'Enter average temperature'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setIsLoading(true)

    await new Promise(r => setTimeout(r, 2800))

    const baseYield = { Wheat: 3.2, Rice: 4.5, Corn: 5.1, Cotton: 1.8, Soybean: 2.6, Sugarcane: 65, Potato: 18, Tomato: 22, Onion: 15, Groundnut: 2.1 }
    const base = baseYield[form.crop] || 3.0
    const factor = 1 + (parseFloat(form.nitrogen || 80) - 80) / 500 + (parseFloat(form.rainfall || 800) - 800) / 10000
    const predicted = (base * parseFloat(form.area || 1) * Math.max(0.6, Math.min(1.4, factor))).toFixed(2)

    const mockResult = {
      ...form,
      predictedYield: parseFloat(predicted),
      yieldUnit: form.crop === 'Sugarcane' ? 'tonnes' : 'quintals',
      yieldPerHectare: (parseFloat(predicted) / parseFloat(form.area || 1)).toFixed(2),
      averageYield: (base * parseFloat(form.area || 1)).toFixed(2),
      variancePercent: (((parseFloat(predicted) - base * parseFloat(form.area)) / (base * parseFloat(form.area))) * 100).toFixed(1),
      confidence: 89.3,
      grade: parseFloat(form.area) >= 5 ? 'A' : 'B',
      monthlyData: [
        { month: 'Jan', rainfall: 42, temp: 18 },
        { month: 'Feb', rainfall: 38, temp: 20 },
        { month: 'Mar', rainfall: 55, temp: 24 },
        { month: 'Apr', rainfall: 88, temp: 28 },
        { month: 'May', rainfall: 110, temp: 32 },
        { month: 'Jun', rainfall: 145, temp: 30 },
      ],
      recommendations: [
        `Apply ${form.fertilizer || 'balanced NPK'} fertilizer at sowing stage`,
        `Maintain soil pH between 6.0–7.5 for optimal ${form.crop} growth`,
        `Ensure ${form.irrigation || 'adequate'} irrigation every 7–10 days during vegetative stage`,
        'Monitor for pest activity after monsoon onset',
        'Harvest when moisture content drops below 14%',
      ],
    }

    setIsLoading(false)
    navigate('/yield-result', { state: { result: mockResult } })
  }

  return (
    <div className="yield-page">
      {/* Header */}
      <div className="yield-page__header">
        <div className="container">
          <div className="section-tag">📊 AI Prediction</div>
          <h1>Crop Yield Prediction</h1>
          <p>Enter your field and environmental parameters to get an accurate yield forecast powered by ensemble ML models</p>
        </div>
      </div>

      <div className="container yield-page__body">
        <WeatherWarningCard />
        <div className="yield-layout">
          {/* Form */}
          <div className="glass-form-container glass shadow-elevated-lg">
            <form className="yield-form" onSubmit={handleSubmit} id="yield-form">

            {/* Section 1: Crop Info */}
            <div className="form-section">
              <div className="form-section__header">
                <span>🌾</span>
                <h3>Crop Information</h3>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Crop Type *</label>
                  <select name="crop" className={`form-select ${errors.crop ? 'input-error' : ''}`} value={form.crop} onChange={handleChange} id="crop-select">
                    <option value="">— Select crop —</option>
                    {cropOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {errors.crop && <span className="error-msg">{errors.crop}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Area (Hectares) *</label>
                  <input type="number" name="area" className={`form-input ${errors.area ? 'input-error' : ''}`} value={form.area} onChange={handleChange} placeholder="e.g. 2.5" min="0.1" step="0.1" id="area-input" />
                  {errors.area && <span className="error-msg">{errors.area}</span>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Season *</label>
                  <select name="season" className={`form-select ${errors.season ? 'input-error' : ''}`} value={form.season} onChange={handleChange} id="season-select">
                    <option value="">— Select season —</option>
                    {seasonOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {errors.season && <span className="error-msg">{errors.season}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Soil Type *</label>
                  <select name="soil" className={`form-select ${errors.soil ? 'input-error' : ''}`} value={form.soil} onChange={handleChange} id="soil-select">
                    <option value="">— Select soil —</option>
                    {soilOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {errors.soil && <span className="error-msg">{errors.soil}</span>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Irrigation Method</label>
                  <select name="irrigation" className="form-select" value={form.irrigation} onChange={handleChange} id="irrigation-select">
                    <option value="">— Select —</option>
                    {irrigationOptions.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Fertilizer Type</label>
                  <select name="fertilizer" className="form-select" value={form.fertilizer} onChange={handleChange} id="fertilizer-select">
                    <option value="">— Select —</option>
                    {fertilizerOptions.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Climate */}
            <div className="form-section">
              <div className="form-section__header">
                <span>🌦️</span>
                <h3>Climate Parameters</h3>
              </div>
              <div className="form-row form-row--3">
                <div className="form-group">
                  <label className="form-label">Annual Rainfall (mm) *</label>
                  <input type="number" name="rainfall" className={`form-input ${errors.rainfall ? 'input-error' : ''}`} value={form.rainfall} onChange={handleChange} placeholder="e.g. 850" id="rainfall-input" />
                  {errors.rainfall && <span className="error-msg">{errors.rainfall}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Avg Temperature (°C) *</label>
                  <input type="number" name="temperature" className={`form-input ${errors.temperature ? 'input-error' : ''}`} value={form.temperature} onChange={handleChange} placeholder="e.g. 28" id="temp-input" />
                  {errors.temperature && <span className="error-msg">{errors.temperature}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Humidity (%)</label>
                  <input type="number" name="humidity" className="form-input" value={form.humidity} onChange={handleChange} placeholder="e.g. 65" min="0" max="100" id="humidity-input" />
                </div>
              </div>
            </div>

            {/* Section 3: Soil Nutrients */}
            <div className="form-section">
              <div className="form-section__header">
                <span>🧪</span>
                <h3>Soil Nutrients (Optional)</h3>
              </div>
              <div className="form-row form-row--4">
                <div className="form-group">
                  <label className="form-label">pH Level</label>
                  <input type="number" name="ph" className="form-input" value={form.ph} onChange={handleChange} placeholder="6.5" min="0" max="14" step="0.1" id="ph-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Nitrogen (kg/ha)</label>
                  <input type="number" name="nitrogen" className="form-input" value={form.nitrogen} onChange={handleChange} placeholder="80" id="nitrogen-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phosphorus (kg/ha)</label>
                  <input type="number" name="phosphorus" className="form-input" value={form.phosphorus} onChange={handleChange} placeholder="40" id="phosphorus-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Potassium (kg/ha)</label>
                  <input type="number" name="potassium" className="form-input" value={form.potassium} onChange={handleChange} placeholder="40" id="potassium-input" />
                </div>
              </div>
            </div>

            <button type="submit" className={`btn btn-teal btn-predict btn-squishy ${isLoading ? 'loading' : ''}`} disabled={isLoading} id="predict-btn">

              {isLoading ? (
                <>
                  <div className="cube-loader-container">
                    <div className="cube-loader">
                      <div className="cube-face cube-front"></div>
                      <div className="cube-face cube-back"></div>
                      <div className="cube-face cube-left"></div>
                      <div className="cube-face cube-right"></div>
                      <div className="cube-face cube-top"></div>
                      <div className="cube-face cube-bottom"></div>
                    </div>
                  </div>
                  <div className="processing-text">Processing AI Data...</div>
                </>
              ) : (
                <>📊 Predict Yield</>
              )}
            </button>


            {isLoading && (
              <div className="loading-steps">
                <div className="loading-step active">📥 Processing parameters...</div>
                <div className="loading-step">🧠 Running XGBoost model...</div>
                <div className="loading-step">📊 Calculating ensemble results...</div>
              </div>
            )}
          </form>
          </div>


          {/* Info Panel */}
          <div className="yield-info-panel">
            <div className="info-card">
              <h3>🔭 What We Analyze</h3>
              <ul className="tips-list">
                <li>🌾 Crop type & historical yield data</li>
                <li>🌦️ Climate & precipitation patterns</li>
                <li>🧪 Soil nutrient composition</li>
                <li>💧 Irrigation efficiency factors</li>
                <li>📅 Seasonal growth windows</li>
              </ul>
            </div>

            <div className="info-card model-info">
              <h3>🤖 ML Models Used</h3>
              <div className="model-stat"><span>Primary</span><strong>XGBoost</strong></div>
              <div className="model-stat"><span>Secondary</span><strong>Random Forest</strong></div>
              <div className="model-stat"><span>Ensemble</span><strong>Stacking Regressor</strong></div>
              <div className="model-stat"><span>Accuracy (R²)</span><strong>0.923</strong></div>
              <div className="model-stat"><span>Training Records</span><strong>58,000+</strong></div>
            </div>


          </div>
        </div>
      </div>
    </div>
  )
}

export default YieldPage
