import { Link } from 'react-router-dom'
import './Footer.css'

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__brand">
          <div className="brand-icon-lg">🌿</div>
          <div>
            <div className="footer__logo">AgriSense <span>AI</span></div>
            <p className="footer__tagline">Empowering farmers with AI-driven crop intelligence</p>
          </div>
        </div>

        <div className="footer__links-group">
          <h4>Features</h4>
          <ul>
            <li><Link to="/detect">Disease Detection</Link></li>
            <li><Link to="/predict">Yield Prediction</Link></li>
            <li><Link to="/">How It Works</Link></li>
          </ul>
        </div>

        <div className="footer__links-group">
          <h4>Technology</h4>
          <ul>
            <li><span>🧠 Python ML (ResNet-50)</span></li>
            <li><span>⚡ Go REST API</span></li>
            <li><span>⚛️ React Frontend</span></li>
          </ul>
        </div>


      </div>

      <div className="footer__bottom">
        <p>© 2025 AgriSense AI — Built with 💚 for Smart Agriculture</p>
      </div>
    </footer>
  )
}

export default Footer
