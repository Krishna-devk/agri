import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Toast from '../components/Toast'
import './TreatmentPage.css'
import WeatherWarningCard from '../components/WeatherWarningCard'

const TreatmentPage = () => {
  const [form, setForm] = useState({
    crop_type: '',
    disease_info: ''
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [toast, setToast] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadProfile = () => {
      const profile = JSON.parse(localStorage.getItem('agrisense_user_profile') || 'null');
      if (profile?.crop_type) {
        setForm(prev => ({ ...prev, crop_type: profile.crop_type }));
      }
    };
    loadProfile();
    window.addEventListener('agrisense_profile_updated', loadProfile);
    return () => window.removeEventListener('agrisense_profile_updated', loadProfile);
  }, []);

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
  }

  const toggleSpeech = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("Speech recognition is not supported in this browser.", "error")
      return
    }

    if (isRecording) {
      setIsRecording(false)
      return
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN'; 
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setForm(prev => ({
        ...prev,
        disease_info: prev.disease_info 
          ? prev.disease_info + " " + transcript 
          : transcript
      }));
    };

    recognition.start();
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.crop_type || !form.disease_info) {
      setError('Please provide both Crop Type and Disease Information.')
      return
    }

    setIsLoading(true)
    
    try {
      const backendUri = import.meta.env.VITE_BACKEND_URI || 'http://localhost:8000'
      const payload = {
        crop_type: form.crop_type,
        disease_info: form.disease_info
      }

      let data = null;
      try {
        const res = await fetch(`${backendUri}/api/v1/treatment-plan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('API Request Failed')
        data = await res.json()
      } catch (err) {
        console.warn("Backend not reachable, using mock data", err)
        // Mock fallback reproducing the user's provided output
        await new Promise(r => setTimeout(r, 2000));
        data = {
          treatment_plan: `# 🌱 AI-Generated Recovery Schedule & Prescription\n\n**To the Farmer:**\n\nI understand your concern regarding ${form.disease_info} in your ${form.crop_type} crop... (This is a mock response because the backend is not running. Start the backend to see the full personalized treatment plan.)\n\n---\n\n## 1. Identification: Confirmation of Disease\n\nBased on your report, the detected issue is likely associated with the symptoms provided.\n\n---\n\n## 2. Recovery Schedule: Phase-by-Phase Plan\n\n### **Phase 1: Immediate Containment & Sanitation (Days 1-7)**\n\n**Goal:** Stop disease spread.\n\n*   **Action:** Systematically scout every tree and prune infected parts.\n*   **Sanitation:** Immediately collect all pruned material.\n\n### **Phase 2: Active Management & Protection (Weeks 2-4)**\n\n*   **Action:** Apply prescribed bactericide or fungicide.\n\n---\n\n## 4. Safety: Precautions & Things to Avoid\n\n*   **Personal Protective Equipment (PPE):** ALWAYS wear appropriate PPE.`,
          crop_type: form.crop_type,
          disease_info: form.disease_info
        }
      }

      setResult(data)
    } catch (err) {
      console.error(err)
      setError('Failed to fetch the treatment plan. Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="treatment-page">
      {/* Header */}
      <div className="treatment-page__header">
        <div className="floating-leaf" style={{ top: '10%', left: '10%', animationDelay: '0s' }}>🌿</div>
        <div className="floating-leaf" style={{ top: '60%', right: '15%', animationDelay: '7s' }}>💊</div>
        <div className="floating-leaf" style={{ bottom: '15%', left: '20%', animationDelay: '4s' }}>🔬</div>
        
        <div className="container">
          <div className="section-tag">🩺 AgriSense Rx</div>
          <h1>AI Crop Doctor & Treatment Center</h1>
          <p>Get a highly personalized, phase-by-phase agronomic recovery schedule to cure crop diseases and minimize yield losses.</p>
        </div>
      </div>

      <div className="container treatment-page__body">
        <WeatherWarningCard />
        
        <div className={`treatment-layout ${result ? 'has-result' : ''}`}>
          {/* Form Side */}
          <div className="rx-form-panel">
            <form onSubmit={handleSubmit} className="rx-form">
              <div className="form-section__header">
                <span>📝</span>
                <h3>Request Prescription</h3>
              </div>

              {error && <div className="error-alert">{error}</div>}

              <div className="form-group">
                <label className="form-label">Affected Crop Type *</label>
                <input 
                  type="text" 
                  name="crop_type" 
                  className="form-input" 
                  placeholder="e.g. Pomegranate, Tomato, Rice" 
                  value={form.crop_type} 
                  onChange={handleChange} 
                />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label">Disease & Status Information *</label>
                  <button 
                    type="button" 
                    onClick={toggleSpeech}
                    className={isRecording ? 'voice-btn recording' : 'voice-btn'}
                    style={{ 
                      background: isRecording ? '#fee2e2' : 'none', 
                      border: 'none', 
                      color: isRecording ? '#ef4444' : 'var(--primary-600)', 
                      fontSize: '0.75rem', 
                      fontWeight: '700', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '12px'
                    }}
                  >
                    {isRecording ? '🛑 Stop Recording...' : '🎙️ Speak instead of typing'}
                  </button>
                </div>
                <textarea 
                  name="disease_info" 
                  className="form-input form-textarea" 
                  placeholder="e.g. Bacterial Blight detected, 20% yield loss observed. Leaves have irregular brown spots."
                  value={form.disease_info}
                  onChange={handleChange}
                  rows="5"
                />
                <div className="field-hint">
                  Include the suspected disease name, severity, and any yield loss estimates for the best tailored plan.
                </div>
              </div>

              <button type="submit" className={`btn btn-teal btn-rx ${isLoading ? 'loading' : ''}`} disabled={isLoading}>
                {isLoading ? (
                  <><span className="spinner" /> Consulting AI Doctor...</>
                ) : (
                  <>💊 Generate Treatment Plan</>
                )}
              </button>
            </form>

            {!result && (
              <div className="rx-perks">
                <h3>Why use AgriSense Rx?</h3>
                <ul>
                  <li><strong>Phase-by-Phase Timeline:</strong> Know exactly what to do on Day 1 vs Week 3.</li>
                  <li><strong>Chemical & Cultural Tactics:</strong> Combines fungicide recommendations with pruning & soil health.</li>
                  <li><strong>Safety First:</strong> Includes crucial PPE and chemical interaction warnings.</li>
                </ul>
              </div>
            )}
          </div>

          {/* Result Side */}
          {result && (
            <div className="rx-result-panel animate-slide-up">
              <div className="prescription-pad">
                <div className="pad-header">
                  <div className="pad-brand">
                    <span>🌿</span> AgriSense Rx
                  </div>
                  <div className="pad-meta">
                    <div><strong>Patient:</strong> {result.crop_type} Crop</div>
                    <div><strong>Diagnosis:</strong> {result.disease_info}</div>
                    <div><strong>Date:</strong> {new Date().toLocaleDateString()}</div>
                  </div>
                </div>

                <div className="pad-body markdown-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.treatment_plan}</ReactMarkdown>
                </div>

                <div className="pad-footer">
                  <div className="doctor-signature">
                    <span>Generated by AI Crop Doctor</span>
                    <div className="signature-line">AgriSense AI Engine</div>
                  </div>
                  <button className="btn btn-outline print-btn" onClick={handlePrint}>
                    🖨️ Print Prescription
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  )
}

export default TreatmentPage
