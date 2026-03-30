import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import WeatherWarningCard from '../components/WeatherWarningCard'
import { useLocationData } from '../lib/useLocationData'
import './HomePage.css'


const stats = [
  { value: '95%', label: 'Detection Accuracy', icon: '🎯' },
  { value: '50+', label: 'Crop Diseases', icon: '🦠' },
  { value: '30+', label: 'Crop Types', icon: '🌾' },
  { value: '<2s', label: 'Analysis Time', icon: '⚡' },
]

const features = [
  {
    icon: '🔬',
    image: '/images/detect.png',
    title: 'AI Disease Detection',
    desc: 'Upload a leaf image and our  powered model identifies diseases with 95%+ accuracy in under 2 seconds.',
    color: 'green',
    link: '/detect',
    cta: 'Detect Now',
    badges: ['Qwen-3vl',  'Real-time'],
  },
  {
    icon: '📈',
    image: '/images/predict.png',
    title: 'Yield Prediction',
    desc: 'Enter crop parameters and environmental data to get accurate yield forecasts powered by ensemble ML models.',
    color: 'teal',
    link: '/predict',
    cta: 'Predict Yield',
    badges: ['XGBoost'],
  },
  {
    icon: '🌦️',
    image: '/images/weather.png',
    title: 'Weather Insights',
    desc: 'Check real-time temperature, humidity, and wind speed for any city to make smarter crop management decisions.',
    color: 'sky',
    link: '/weather',
    cta: 'Check Weather',
    badges: ['OpenWeatherMap', 'Live API'],
  },
  {
    icon: '💰',
    image: '/images/market.png',
    title: 'Market Prices',
    desc: 'Track real-time MSPs and mandi prices across different states to optimize your selling strategy.',
    color: 'indigo',
    link: '/market',
    cta: 'View Prices',
    badges: ['Live Data', 'Market Trends', 'MSP'],
  },
]

const testimonials = [
  { text: "AgriSense AI changed the way I manage my wheat crop. The disease detection is remarkably accurate!", author: "Suresh Patel", role: "Wheat Farmer", avatar: "👨‍🌾" },
  { text: "The yield predictions help me plan my sales way in advance. A must-have tool for modern farmers.", author: "Rajesh Kumar", role: "Rice Farmer", avatar: "👨‍🌾" },
]

const advisory = [
  { title: "Soil Health", desc: "Test your soil every year to maintain optimum nutrient levels.", icon: "🌱" },
  { title: "Water Management", desc: "Drip irrigation can save up to 40% more water compared to traditional methods.", icon: "💧" },
]


const howItWorks = [
  { step: '01', icon: '📸', title: 'Upload / Enter Data', desc: 'Upload a crop image or enter field parameters like crop type, area, and climate data.' },
  { step: '02', icon: '🧠', title: 'AI Processing', desc: 'Our Python ML models analyze the data using deep learning and ensemble algorithms.' },
  { step: '03', icon: '⚡', title: 'Go API Layer', desc: 'Results are served through a high-performance Golang REST API.' },
  { step: '04', icon: '📊', title: 'Actionable Insights', desc: 'Get detailed results: disease name, severity, treatment advice, or yield forecast.' },
]

const diseases = [
  { name: 'Leaf Blight', crop: 'Wheat', severity: 'High', color: '#ef4444' },
  { name: 'Powdery Mildew', crop: 'Grapes', severity: 'Medium', color: '#f59e0b' },
  { name: 'Early Blight', crop: 'Tomato', severity: 'Low', color: '#22c55e' },
  { name: 'Rust Disease', crop: 'Corn', severity: 'High', color: '#ef4444' },
  { name: 'Fusarium Wilt', crop: 'Cotton', severity: 'Medium', color: '#f59e0b' },
  { name: 'Anthracnose', crop: 'Mango', severity: 'Low', color: '#22c55e' },
]

const HomePage = () => {
  const locationData = useLocationData()

  return (

    <div className="home-page">
      <section className="hero">
        <div className="hero__bg-image" style={{ backgroundImage: "url('/images/hero.png')" }} />
        <div className="hero__bg-shapes">
          <div className="shape shape-1" />
          <div className="shape shape-2" />
          <div className="shape shape-3" />
        </div>
        <div className="container hero__content">
          <div className="hero__text animate-fadeInUp">
            <div className="hero__glass-panel shadow-elevated-lg">
              <h1 className="hero__title">
                Smart Crop Intelligence<br />
                <span className="gradient-text">Powered by AI</span>
              </h1>
              <p className="hero__desc">
                Detect crop diseases instantly and predict yields accurately using advanced machine learning. 
                Empowering farmers with data-driven decisions for smarter, more sustainable agriculture.
              </p>
            </div>

            {/* Live Location Weather Bar */}
            {locationData.isLoaded && (
              <div className="hero__location-bar animate-fadeInUp" id="location-weather-bar">
                <span className="location-bar__pulse" />
                <span className="location-bar__city">📍 {locationData.city}</span>
                <div className="location-bar__divider" />
                <span className="location-bar__stat">🌡️ {locationData.temperature}°C</span>
                <span className="location-bar__stat">💧 {locationData.humidity}%</span>
                <span className="location-bar__stat">🌧️ {locationData.rainfall}mm</span>
                <Link to="/weather" className="location-bar__link">Full Forecast →</Link>
              </div>
            )}

            <div className="hero__actions">

              <Link to="/detect" className="btn btn-primary btn-lg" id="hero-detect-btn">
                🔍 Detect Disease
              </Link>
              <Link to="/predict" className="btn btn-teal btn-lg" id="hero-predict-btn">
                📊 Predict Yield
              </Link>
              <a href="#how-it-works" className="btn btn-outline btn-lg">
                Learn More ↓
              </a>
            </div>
            <div className="hero__trust">
              <span>✅ No signup required</span>
              <span>✅ Free to use</span>
              <span>✅ Instant results</span>
            </div>
          </div>
          <div className="hero__visual animate-bounceIn">
            <div className="hero__card-stack">
              <div className="hero__floating-card card-dis glass">
                <span className="fc-icon">🔬</span>
                <div>
                  <div className="fc-label">Detected</div>
                  <div className="fc-value">Leaf Blight</div>
                </div>
                <div className="fc-badge high">High Risk</div>
              </div>
              <div className="hero__circle shadow-elevated-lg">
                <div className="circle-inner">
                  <span>🌿</span>
                  <span className="circle-pct">95%</span>
                  <span className="circle-sub">Accuracy</span>
                </div>
              </div>
              <div className="hero__floating-card card-yield glass">
                <span className="fc-icon">📈</span>
                <div>
                  <div className="fc-label">Predicted Yield</div>
                  <div className="fc-value">4.2 tons/ha</div>
                </div>
                <div className="fc-badge good">+18% vs avg</div>
              </div>

            </div>
          </div>
        </div>
      </section>

      <section className="stats-bar">
        <div className="container stats-bar__inner">
          {stats.map((s, i) => (
            <div key={i} className="stat-item">
              <span className="stat-icon">{s.icon}</span>
              <span className="stat-value">{s.value}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="advisory section">
        <div className="container">
          <div className="section-header">
            <div className="section-tag">💡 Expert Tips</div>
            <h2 className="section-title">Agricultural Advisory</h2>
          </div>
          <div className="advisory__grid">
            {advisory.map((item, i) => (
              <div key={i} className="advisory-card glass-premium">
                <span className="advisory-icon">{item.icon}</span>
                <div>
                  <h4>{item.title}</h4>
                  <p>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>


      <WeatherWarningCard />

      <section className="features section">
        <div className="container">
          <div className="section-header">
            <div className="section-tag">🚀 Core Features</div>
            <h2 className="section-title">Four Powerful AI Tools</h2>
            <p className="section-subtitle">Comprehensive crop intelligence from diagnosis to harvest forecasting — plus live weather data</p>
          </div>
          <div className="features__grid features__grid--4">
            {features.map((f, i) => (
              <div
                key={i}
                className={`feature-card feature-card--${f.color} shadow-elevated-md graceful-z-lift`}
              >



                <div className="feature-card__inner-3d">
                  <div className="feature-card__img-container">
                    <img src={f.image} alt={f.title} className="feature-card__img" />
                    <div className="feature-card__img-icon glass">{f.icon}</div>
                  </div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                  <div className="feature-card__badges">
                    {f.badges.map((b, j) => <span key={j} className="tech-badge">{b}</span>)}
                  </div>
                  <Link to={f.link} className={`btn ${f.color === 'green' ? 'btn-primary' : f.color === 'teal' ? 'btn-teal' : 'btn-sky'}`} id={`feature-${f.color}-btn`}>
                    {f.cta} →
                  </Link>
                </div>
              </div>

            ))}
          </div>

        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="how-it-works section" id="how-it-works">
        <div className="container">
          <div className="section-header">
            <div className="section-tag">⚙️ Process</div>
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle">Four simple steps from input to actionable agricultural insights</p>
          </div>
          <div className="steps-grid">
            {howItWorks.map((step, i) => (
              <div key={i} className="step-card">
                <div className="step-number">{step.step}</div>
                <div className="step-icon">{step.icon}</div>
                <h4>{step.title}</h4>
                <p>{step.desc}</p>
                {i < howItWorks.length - 1 && <div className="step-connector">→</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="disease-showcase section">
        <div className="container">
          <div className="section-header">
            <div className="section-tag">🦠 Disease Library</div>
            <h2 className="section-title">Detectable Diseases</h2>
            <p className="section-subtitle">Our model is trained on 50+ crop diseases across multiple crop types</p>
          </div>
          <div className="disease-grid">
            {diseases.map((d, i) => (
              <div key={i} className="disease-chip">
                <span className="disease-dot" style={{ background: d.color }} />
                <div>
                  <div className="disease-name">{d.name}</div>
                  <div className="disease-crop">{d.crop}</div>
                </div>
                <span className="disease-severity" style={{ color: d.color }}>{d.severity}</span>
              </div>
            ))}
          </div>
          <div className="disease-cta">
            <Link to="/detect" className="btn btn-primary btn-lg" id="disease-library-cta">
              🔍 Check Your Crop
            </Link>
          </div>
        </div>
      </section>

      <section className="testimonials section">
        <div className="container">
          <div className="section-header">
            <div className="section-tag">💬 Feedback</div>
            <h2 className="section-title">Trusted by Farmers</h2>
          </div>
          <div className="testimonials__grid">
            {testimonials.map((t, i) => (
              <div key={i} className="testimonial-card">
                <div className="testimonial-quote">"</div>
                <p className="testimonial-text">{t.text}</p>
                <div className="testimonial-author">
                  <span className="testimonial-avatar">{t.avatar}</span>
                  <div>
                    <strong>{t.author}</strong>
                    <span>{t.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="tech-stack section">
        <div className="container">
          <div className="section-header">
            <div className="section-tag">🔧 Technology</div>
            <h2 className="section-title">Built with Modern Tech</h2>
          </div>
          <div className="tech-grid">
            <div className="tech-card tech-card--frontend">
              <div className="tech-card__icon">⚛️</div>
              <h4>React Frontend</h4>
              <p>Vite + React Router for blazing-fast SPA with dynamic UI and smooth transitions</p>
              <div className="tech-tags"><span>React</span><span>Vite</span><span>Axios</span></div>
            </div>
            <div className="tech-card tech-card--backend">
              <div className="tech-card__icon">⚡</div>
              <h4>REST API</h4>
              <p>High-performance Golang backend handling 10K+ requests/sec with minimal latency</p>
              <div className="tech-tags"><span>Golang</span><span>Gin</span><span>CORS</span></div>
            </div>
            <div className="tech-card tech-card--ml">
              <div className="tech-card__icon">🧠</div>
              <h4>Python ML</h4>
              <p>Qwen-3vl for disease detection and XGBoost ensemble for yield prediction</p>
              <div className="tech-tags"><span>Qwen-3vl</span><span>XGBoost</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-banner">
        <div className="container cta-banner__inner">
          <div>
            <h2>Ready to protect your harvest? 🌾</h2>
            <p>Join thousands of farmers using AI to make smarter agricultural decisions</p>
          </div>
          <div className="cta-banner__actions">
            <Link to="/detect" className="btn btn-primary btn-lg" id="cta-detect-btn">🔍 Detect Disease</Link>
            <Link to="/predict" className="btn btn-teal btn-lg" id="cta-predict-btn">📊 Predict Yield</Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomePage
