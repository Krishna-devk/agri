import { useLocation, useNavigate, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import './DiseaseResultPage.css'

const DiseaseResultPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const result = location.state?.result

  if (!result) {
    return (
      <div className="no-result">
        <div className="container no-result__inner">
          <span>🔍</span>
          <h2>No result found</h2>
          <p>Please upload a leaf image to get a disease diagnosis.</p>
          <Link to="/detect" className="btn btn-primary" id="go-detect-btn">Go to Detection</Link>
        </div>
      </div>
    )
  }

  // Parse fields
  const diseaseFull = result.most_probable_disease || "Unknown"
  const diseaseName = diseaseFull.split('(')[0].trim() || diseaseFull
  const pathogen = diseaseFull.match(/\(([^)]+)\)/)?.[1] || "Associated Pathogen"
  const healthProb = parseFloat(result.crop_health_probability || 0)
  const isHealthy = healthProb > 0.8
  
  // Determine if it's a plant explicitly checking backend AI phrases
  const checkText = (
    (result.identified_crop || "") + " " + 
    (result.most_probable_disease || "") + " " + 
    (result.visual_symptoms || "") + " " + 
    (result.raw_analysis || "")
  ).toLowerCase()
  
  const hasNotPlantPhrase = 
    checkText.includes("not a plant") || 
    checkText.includes("image is not a plant") || 
    checkText.includes("not a leaf") || 
    checkText.includes("unrecognized") || 
    diseaseName === "N/A" || 
    result.identified_crop === "N/A" ||
    (result.identified_crop === "None" && !result.most_probable_disease)
    
  const isPlant = !hasNotPlantPhrase && result.identified_crop && result.identified_crop !== "N/A" && result.identified_crop !== "None"
  
  // Calculate a generic visual severity
  const severityVal = Math.max(0, Math.min(100, (1 - healthProb) * 100))
  let sevConfig = { color: '#22c55e', bg: '#dcfce7', label: 'Healthy / No Risk', icon: '✅' }
  if (!isPlant) sevConfig = { color: '#64748b', bg: '#f1f5f9', label: 'Analysis Complete', icon: 'ℹ️' }
  else if (severityVal > 30) sevConfig = { color: '#f59e0b', bg: '#fef3c7', label: 'Moderate Risk', icon: '⚠️' }
  if (isPlant && severityVal > 60) sevConfig = { color: '#ef4444', bg: '#fee2e2', label: 'High Risk / Severe', icon: '🚨' }

  return (
    <div className="result-page">
      {/* Header Area */}
      <div className="result-page__header" style={{ background: `linear-gradient(135deg, ${sevConfig.color}22, ${sevConfig.color}11)`, borderBottom: `3px solid ${sevConfig.color}40` }}>
        <div className="container">
          <div className="result-header__top">
            <button className="back-btn" onClick={() => navigate('/detect')} id="back-detect-btn">
              ← Back to Detection
            </button>
            <div className="result-badge" style={{ background: sevConfig.bg, color: sevConfig.color }}>
              {sevConfig.icon} {sevConfig.label}
            </div>
          </div>
          
          <div className="result-header__main">
            <div className="result-header__info">
              <div className="section-tag">🔬 Analysis Complete</div>
              <h1>{diseaseName}</h1>
              {isPlant && !isHealthy && <p className="pathogen-label">Pathogen: <em>{pathogen}</em></p>}
              
              {isPlant && (
                <div className="confidence-grid">
                  <div className="conf-chip">
                    <span>Confidence</span>
                    <strong>{result.confidence_description || 'High'}</strong>
                  </div>
                  <div className="conf-chip">
                    <span>Health Prob.</span>
                    <strong style={{ color: isHealthy ? '#22c55e' : '#ef4444' }}>{(healthProb * 100).toFixed(1)}%</strong>
                  </div>
                  <div className="conf-chip">
                    <span>NDVI</span>
                    <strong>{result.ndvi_score || 'N/A'}</strong>
                  </div>
                </div>
              )}


              {/* Quick Action to Treatment */}
              {isPlant && !isHealthy && (
                <div className="treatment-promo">
                  <p>Require a phase-by-phase recovery plan?</p>
                  <Link to="/treatment" className="btn btn-teal btn-sm">🩺 Generate Agronomic Rx</Link>
                </div>
              )}
            </div>
            
            <div className="result-header__image">
              {result.imageUrl && (
                <img src={result.imageUrl} alt="Uploaded leaf for disease analysis" className="result-leaf-img" />
              )}
              {isPlant && (
                <div className="affected-overlay">
                  <span>🍃 {result.identified_crop}</span>
                  <span>📍 ~{severityVal.toFixed(0)}% Affected</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body Area */}
      <div className="container result-page__body">
        <div className="result-grid">
          
          {/* Visual Symptoms */}
          <div className="result-card result-card--symptoms">
            <div className="result-card__header">
              <span className="result-card__icon">👀</span>
              <h3>Visual Symptoms</h3>
            </div>
            <p className="description-text">{result.visual_symptoms}</p>
          </div>

          {/* Weather Causes */}
          {isPlant && result.weather_causes && result.weather_causes.length > 5 && (
            <div className="result-card result-card--weather">
              <div className="result-card__header">
                <span className="result-card__icon">🌦️</span>
                <h3>Weather Triggers & Environmental Causes</h3>
              </div>
              <p className="description-text">{result.weather_causes}</p>
            </div>
          )}

          {/* Potential Other Issues */}
          {isPlant && result.identified_issues && result.identified_issues.length > 0 && (
            <div className="result-card result-card--issues">
              <div className="result-card__header">
                <span className="result-card__icon">🧬</span>
                <h3>Other Suspect Pathogens</h3>
              </div>
              <ul className="symptom-list">
                {result.identified_issues.map((issue, i) => (
                  <li key={i} className="symptom-item">
                    <span className="symptom-dot" style={{ background: '#f59e0b' }} />
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Severity Meter */}
          {isPlant && (
            <div className="result-card result-card--severity">
              <div className="result-card__header">
                <span className="result-card__icon">📊</span>
                <h3>Infection Severity Index</h3>
              </div>
              <div className="severity-meter">
                <div className="severity-meter__bar">
                  <div className="severity-meter__fill" style={{ width: `${severityVal}%`, background: sevConfig.color }} />
                </div>
                <div className="severity-meter__labels">
                  <span>0%</span>
                  <span style={{ color: sevConfig.color, fontWeight: 700 }}>{severityVal.toFixed(1)}% Damage Risk</span>
                  <span>100%</span>
                </div>
              </div>
              <div className="severity-advice" style={{ background: sevConfig.bg, color: sevConfig.color }}>
                {sevConfig.icon} {isHealthy ? 'Crop appears relatively healthy. Maintain current care.' :
                  severityVal < 50 ? 'Monitor the plant closely. Early treatment can prevent rapid spread.' :
                  'Immediate action required! High risk of total crop loss without systemic treatment.'}
              </div>
            </div>
          )}
          
          {/* AI Raw Analysis (Full Recommendations layout) */}
          <div className="result-card result-card--full-width">
            <div className="result-card__header">
              <span className="result-card__icon">🧠</span>
              <h3>Complete AI General Recommendations</h3>
            </div>
            <div className="expanded-markdown">
              <ReactMarkdown>{result.raw_analysis || result.recommendations}</ReactMarkdown>
            </div>
          </div>

        </div>

        {/* Actions Bottom */}
        <div className="result-actions">
          <button className="btn btn-primary btn-lg" onClick={() => window.print()} id="print-report-btn">
            🖨️ Print Report
          </button>
          <Link to="/detect" className="btn btn-outline btn-lg" id="new-scan-btn">
            🔍 New Scan
          </Link>
          <Link to="/predict" className="btn btn-teal btn-lg" id="predict-from-result-btn">
            📊 Predict Yield →
          </Link>
        </div>
      </div>
    </div>
  )
}

export default DiseaseResultPage
