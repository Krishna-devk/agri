import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import DiseasePage from './pages/DiseasePage'
import DiseaseResultPage from './pages/DiseaseResultPage'
import YieldPage from './pages/YieldPage'
import YieldResultPage from './pages/YieldResultPage'
import WeatherPage from './pages/WeatherPage'
import MarketPage from './pages/MarketPage'
import SchemePage from './pages/SchemePage'
import TreatmentPage from './pages/TreatmentPage'
import './App.css'

function App() {
  return (
    <Router>
      <div className="app-wrapper">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/detect" element={<DiseasePage />} />
            <Route path="/disease-result" element={<DiseaseResultPage />} />
            <Route path="/predict" element={<YieldPage />} />
            <Route path="/yield-result" element={<YieldResultPage />} />
            <Route path="/weather" element={<WeatherPage />} />
            <Route path="/market" element={<MarketPage />} />
            <Route path="/schemes" element={<SchemePage />} />
            <Route path="/treatment" element={<TreatmentPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  )
}

export default App
