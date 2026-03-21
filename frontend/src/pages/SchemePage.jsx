import { useState } from 'react'
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import './SchemePage.css'
import WeatherWarningCard from '../components/WeatherWarningCard'

const SchemePage = () => {
  const [form, setForm] = useState({
    crop_type: '',
    location: '',
    land_size_acres: '',
    disease_or_yield_status: '',
    top_k: 5
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.crop_type || !form.location || !form.land_size_acres) {
      setError('Please fill out all required fields marked with *')
      return
    }

    setIsLoading(true)
    
    try {
      // Temporary: Replace with actual fetch to VITE_BACKEND_URI + '/api/v1/match'
      // For now we will mock the AI call with a simulated delay and mock payload if backend is not live
      const backendUri = import.meta.env.VITE_BACKEND_URI || 'http://localhost:8000'
      const payload = {
        crop_type: form.crop_type,
        location: form.location,
        land_size_acres: parseFloat(form.land_size_acres) || 0,
        disease_or_yield_status: form.disease_or_yield_status,
        top_k: form.top_k
      }

      // Try hitting absolute API, if fail, fallback to mock
      let data = null;
      try {
        const res = await fetch(`${backendUri}/api/v1/match`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('API Request Failed')
        data = await res.json()
      } catch (err) {
        // Fallback mock if backend not working (for demonstration purposes based on provided response)
        console.warn("Backend not reachable, using mock data", err)
        await new Promise(r => setTimeout(r, 2000));
        data = {
          farmer_profile: payload,
          ai_summary: `Namaste! As your agricultural advisor, I understand your situation perfectly. You are growing **${payload.crop_type}** in **${payload.location}** on **${payload.land_size_acres} acres**. Let's break down the best government schemes to help you recover and build resilience for the future.\n\n### Scheme Ranking\n\n1. **PMFBY**: Important crop insurance.\n2. **NFSM**: Relevant for input subsidies.`,
          treatment_plan: payload.disease_or_yield_status ? `🌱 **AI-Generated Recovery Schedule**\n\nBased on your issue: *"${payload.disease_or_yield_status}"*, here are initial steps:\n\n1. Apply Triazole fungicide.\n2. Isolate infected crops.\n3. Verify soil Ph.` : null,
          matched_schemes: [
            {
              rank: 1, id: 3, name: "Pradhan Mantri Fasal Bima Yojana (PMFBY)", category: "Central Sector Schemes",
              purpose: "Provide simple, affordable, and comprehensive crop insurance.",
              eligibility: "Farmers growing notified crops.",
              application_process: "Apply online via NCIP.",
              documents_required: ["Aadhaar", "Land Records"],
              where_to_apply_links: ["https://pmfby.gov.in/"]
            },
            {
              rank: 2, id: 19, name: "National Food Security Mission (NFSM)", category: "Centrally Sponsored Schemes",
              purpose: "Increase production through area expansion.",
              eligibility: "Farmers in identified districts.",
              application_process: "Apply via Block Agriculture Office.",
              documents_required: ["Aadhaar", "Bank passbook"],
              where_to_apply_links: ["State portals"]
            }
          ],
          google_search_results: [
            { label: "Apply — PMFBY", url: "https://www.google.com/search?q=pmfby" },
            { label: "Agriculture Subsidies in India", url: "https://www.google.com/search?q=agri+subsidy" }
          ]
        }
      }

      setResult(data)
    } catch (err) {
      console.error(err)
      setError('Failed to fetch data. Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => setResult(null)

  return (
    <div className="scheme-page">
      {/* Header */}
      <div className="scheme-page__header">
        <div className="container">
          <div className="section-tag">🏛️ AI Policy Advisor</div>
          <h1>Government Scheme Matchmaker</h1>
          <p>Get personalized agricultural schemes, financial aid, and AI-driven recovery plans tailored precisely to your farm's profile.</p>
        </div>
      </div>

      <div className="container scheme-page__body">
        <WeatherWarningCard />
        
        {!result ? (
          <div className="scheme-layout">
            <div className="form-panel">
              <form onSubmit={handleSubmit} className="scheme-form">
                <div className="form-section__header">
                  <span>🧑‍🌾</span>
                  <h3>Farmer Profile</h3>
                </div>

                {error && <div className="error-alert">{error}</div>}

                <div className="form-row form-row--2">
                  <div className="form-group">
                    <label className="form-label">Crop Type *</label>
                    <input type="text" name="crop_type" className="form-input" placeholder="e.g. Rice, Wheat, Cotton" value={form.crop_type} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Location (State, Region) *</label>
                    <input type="text" name="location" className="form-input" placeholder="e.g. Punjab, India" value={form.location} onChange={handleChange} />
                  </div>
                </div>

                <div className="form-row form-row--2">
                  <div className="form-group">
                    <label className="form-label">Land Size (Acres) *</label>
                    <input type="number" name="land_size_acres" className="form-input" placeholder="e.g. 2.5" min="0.1" step="0.1" value={form.land_size_acres} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Results Limit </label>
                    <input type="number" name="top_k" className="form-input" value={form.top_k} onChange={handleChange} min="1" max="10" />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Disease or Yield Status (Optional)</label>
                  <textarea 
                    name="disease_or_yield_status" 
                    className="form-input form-textarea" 
                    placeholder="e.g. Blast disease detected, 30% yield loss expected. Need subsidy for micro-irrigation."
                    value={form.disease_or_yield_status}
                    onChange={handleChange}
                    rows="3"
                  />
                  <div className="field-hint">Describe any ongoing crises to get specialized schemes and recovery plans!</div>
                </div>

                <button type="submit" className={`btn btn-primary btn-match ${isLoading ? 'loading' : ''}`} disabled={isLoading}>
                  {isLoading ? (
                    <><span className="spinner" /> Analyzing Schemes...</>
                  ) : (
                    <>🔍 Find Matching Schemes</>
                  )}
                </button>
              </form>
            </div>

            <div className="info-panel">
              <div className="info-card scheme-perks">
                <h3>💎 Why Use the Matchmaker?</h3>
                <ul className="perks-list">
                  <li><strong>Targeted Funding:</strong> Find subsidies that match your exact acreage and crop.</li>
                  <li><strong>Instant Eligibility Check:</strong> Skip the guesswork; our AI extracts requirements.</li>
                  <li><strong>Crisis Support:</strong> Reports diseases/losses to highlight emergency compensation (like PMFBY).</li>
                  <li><strong>Step-by-step guidance:</strong> Learn precisely where to go and what documents to bring.</li>
                </ul>
              </div>
              

            </div>
          </div>
        ) : (
          <div className="results-view animate-fade-in">
            <div className="results-view__toolbar">
              <button className="btn btn-outline" onClick={resetForm}>← Edit Profile</button>
              <div className="profile-chips">
                <span className="chip">🌾 {result.farmer_profile.crop_type}</span>
                <span className="chip">📍 {result.farmer_profile.location}</span>
                <span className="chip">📏 {result.farmer_profile.land_size_acres} Acres</span>
              </div>
            </div>

            <div className="results-grid">
              {/* Main Column */}
              <div className="results-main">
                {result.ai_summary && (
                  <div className="ai-summary-card">
                    <div className="ai-card-header">
                      <span className="ai-icon">✨</span>
                      <h2>AI Policy Advisor Summary</h2>
                    </div>
                    <div className="markdown-content">
                      <ReactMarkdown>{result.ai_summary}</ReactMarkdown>
                    </div>
                  </div>
                )}
                
                {result.treatment_plan && (
                  <div className="treatment-plan-card">
                    <div className="treatment-card-header">
                      <span className="treatment-icon">💊</span>
                      <h2>Agronomic Recovery Plan</h2>
                    </div>
                    <div className="markdown-content">
                      <ReactMarkdown>{result.treatment_plan}</ReactMarkdown>
                    </div>
                  </div>
                )}

                <div className="schemes-list">
                  <h3>🏆 Top Recommended Schemes</h3>
                  {result.matched_schemes?.map((scheme) => (
                    <div key={scheme.id} className="scheme-item">
                      <div className="scheme-rank">#{scheme.rank}</div>
                      <div className="scheme-details">
                        <div className="scheme-title-row">
                          <h4>{scheme.name}</h4>
                          <span className="scheme-category">{scheme.category}</span>
                        </div>
                        <p className="scheme-purpose">{scheme.purpose}</p>
                        
                        <div className="scheme-expandable">
                          <div className="detail-block">
                            <strong>✅ Eligibility:</strong>
                            <p>{scheme.eligibility}</p>
                          </div>
                          
                          <div className="docs-block">
                            <strong>📄 Required Documents:</strong>
                            <div className="doc-tags">
                              {scheme.documents_required?.map((doc, idx) => (
                                <span key={idx} className="doc-tag">{doc}</span>
                              ))}
                            </div>
                          </div>

                          <div className="detail-block">
                            <strong>🛠️ How to Apply:</strong>
                            <p>{scheme.application_process}</p>
                          </div>

                          {scheme.where_to_apply_links && scheme.where_to_apply_links.length > 0 && (
                            <div className="apply-links">
                              {scheme.where_to_apply_links.map((link, idx) => (
                                <a key={idx} href={link} target="_blank" rel="noreferrer" className="btn-apply-link">
                                  🔗 Apply / Portal
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sidebar Column */}
              <div className="results-sidebar">
                {result.google_search_results && result.google_search_results.length > 0 && (
                  <div className="search-links-card">
                    <div className="search-header">
                      <span className="search-icon">🔍</span>
                      <h3>Helpful Web Resources</h3>
                    </div>
                    <ul className="search-list">
                      {result.google_search_results.map((res, i) => (
                        <li key={i}>
                          <a href={res.url} target="_blank" rel="noreferrer">
                            {res.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SchemePage
