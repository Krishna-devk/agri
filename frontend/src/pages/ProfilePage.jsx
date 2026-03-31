import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleLogin, googleLogout } from '@react-oauth/google'
import { jwtDecode } from 'jwt-decode'
import './ProfilePage.css'
import Toast from '../components/Toast'

const cropOptions = ['Wheat', 'Rice', 'Corn', 'Cotton', 'Soybean', 'Sugarcane', 'Potato', 'Tomato', 'Onion', 'Groundnut']
const soilOptions = ['Alluvial', 'Black (Regur)', 'Red & Yellow', 'Laterite', 'Loamy', 'Sandy']

const ProfilePage = () => {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [toast, setToast] = useState(null)
  const [syncing, setSyncing] = useState(!!localStorage.getItem('agrisense_user_email'))
  
  const [form, setForm] = useState({
    email: localStorage.getItem('agrisense_user_email') || '',
    full_name: '',
    phone: '',
    location: '',
    crop_type: '',
    land_size_acres: '',
    soil_type: '',
    irrigation_method: '',
    photo_url: localStorage.getItem('agrisense_user_photo') || ''
  })


  const saveProfile = async (payload) => {
    if (!payload.email) return false
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URI || 'https://agri-jet.vercel.app'}/api/v1/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      return res.ok
    } catch (e) {
      console.error("Save error", e)
      return false
    } finally {
      window.dispatchEvent(new Event('agrisense_profile_updated'))
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const newPhoto = reader.result
        const newForm = { ...form, photo_url: newPhoto }
        
        // Local update
        setForm(newForm)
        localStorage.setItem('agrisense_user_photo', newPhoto)
        
        // Backend update
        const success = await saveProfile(newForm)
        if (success) {
          setToast({ message: "Photo saved to dashboard!", type: 'success' })
        } else {
          setToast({ message: "Photo updated locally (offline)", type: 'warning' })
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const fetchProfile = async (emailToFetch) => {
    const email = emailToFetch || localStorage.getItem('agrisense_user_email')
    if (!email) {
      setSyncing(false)
      return null
    }
    
    setSyncing(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URI || 'https://agri-jet.vercel.app'}/api/v1/profile/${email}`)
      if (res.ok) {
        const data = await res.json()
        setForm(data)
        if (data.photo_url) {
          localStorage.setItem('agrisense_user_photo', data.photo_url)
        }
        window.dispatchEvent(new Event('agrisense_profile_updated'))
        return data
      }
    } catch (e) {
      console.error("Profile fetch error", e)
    } finally {
      setSyncing(false)
    }
    return null
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const decoded = jwtDecode(credentialResponse.credential)
      
      localStorage.setItem('agrisense_user_email', decoded.email)
      localStorage.setItem('agrisense_user_name', decoded.name)
      if (decoded.picture) {
        localStorage.setItem('agrisense_user_photo', decoded.picture)
      }
      
      // Clear stale GPS-based location data so profile location takes priority
      localStorage.removeItem('agrisense_last_sync_v2')
      localStorage.removeItem('agrisense_location_data_v2')
      localStorage.removeItem('agrisense_weather_city')
      localStorage.removeItem('agrisense_last_coords')
      
      // Try to fetch existing profile
      const existingProfile = await fetchProfile(decoded.email)
      
      if (existingProfile) {
        // Save profile to localStorage for App.jsx to use in re-sync
        localStorage.setItem('agrisense_user_profile', JSON.stringify(existingProfile))
        // Trigger location re-sync using profile city (not GPS)
        window.dispatchEvent(new Event('agrisense_force_profile_sync'))
        setToast({ message: `Welcome back! Syncing data for ${existingProfile.location || 'your location'}...`, type: 'success' })
      } else {
        setForm(prev => ({ 
          ...prev, 
          email: decoded.email, 
          full_name: decoded.name || prev.full_name,
          photo_url: decoded.picture || prev.photo_url
        }))
        setToast({ message: "Logged in with Google! Please complete your profile.", type: 'success' })
      }
    } catch (err) {
      console.error("JWT Decode Error", err)
      setToast({ message: "Login parsing failed", type: 'error' })
    }
  }

  const handleGoogleError = () => {
    setToast({ message: "Google Sign-In was unsuccessful. Try again.", type: 'error' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    
    const success = await saveProfile(form)
    
    if (success) {
      localStorage.setItem('agrisense_user_email', form.email)
      localStorage.setItem('agrisense_user_profile', JSON.stringify(form))
      // Clear stale location data and re-sync using new profile location
      localStorage.removeItem('agrisense_last_sync_v2')
      localStorage.removeItem('agrisense_location_data_v2')
      localStorage.removeItem('agrisense_weather_city')
      window.dispatchEvent(new Event('agrisense_force_profile_sync'))
      setToast({ message: `Profile saved! Syncing data for ${form.location || 'your location'}...`, type: 'success' })
      setIsEditing(false)
    } else {
      setToast({ message: "Failed to save profile", type: 'error' })
    }
    setIsLoading(false)
  }

  const handleSignOut = () => {
    googleLogout()
    // Clear user data
    localStorage.removeItem('agrisense_user_email')
    localStorage.removeItem('agrisense_user_name')
    localStorage.removeItem('agrisense_user_photo')
    localStorage.removeItem('agrisense_user_profile')
    
    // Clear ALL location sync data so GPS fallback runs fresh
    localStorage.removeItem('agrisense_last_sync_v2')
    localStorage.removeItem('agrisense_location_data_v2')
    localStorage.removeItem('agrisense_weather_city')
    localStorage.removeItem('agrisense_last_coords')
    localStorage.removeItem('agrisense_last_crop')
    
    setForm({
      email: '',
      full_name: '',
      phone: '',
      location: '',
      crop_type: '',
      land_size_acres: '',
      soil_type: '',
      irrigation_method: ''
    })
    setIsEditing(false)
    setToast({ message: "Signed out successfully", type: 'success' })
    window.dispatchEvent(new Event('agrisense_profile_updated'))
    
    // Trigger immediate GPS-based fresh sync
    window.dispatchEvent(new Event('agrisense_force_sync'))
  }

  const isProfileComplete = form.full_name && form.location && form.crop_type

  if (syncing) {
    return (
      <div className="profile-page container">
        <div className="profile-card glass shadow-lg animate-fadeInUp" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
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
          <p className="processing-text" style={{ marginTop: '1rem' }}>Checking Farm Records...</p>
        </div>
      </div>
    )
  }

  const userEmail = localStorage.getItem('agrisense_user_email')

  return (
    <div className="profile-page container">
      <div className="profile-card glass shadow-lg">
        
        {/* DASHBOARD: LOGGED IN AND COMPLETE */}
        {userEmail && isProfileComplete && !isEditing ? (
          <div className="dashboard-view">
            <div className="dashboard-header">
              <div className="avatar-wrapper" onClick={() => document.getElementById('photo-upload').click()}>
                {form.photo_url ? (
                  <img src={form.photo_url} alt="Profile" className="profile-img shadow-md" />
                ) : (
                  <div className="avatar-placeholder">👨‍🌾</div>
                )}
                <div className="upload-overlay">📷</div>
                <input type="file" id="photo-upload" hidden accept="image/*" onChange={handleFileChange} />
              </div>
              <h2>Welcome back, {form.full_name}!</h2>
              <p>Your agricultural profile is active and synced.</p>
            </div>

            <div className="stats-grid">
              <div className="stat-card shadow-sm">
                <span className="icon">📍</span>
                <div className="stat-info">
                  <label>Location</label>
                  <p>{form.location}</p>
                </div>
              </div>
              <div className="stat-card shadow-sm">
                <span className="icon">🌱</span>
                <div className="stat-info">
                  <label>Crop Type</label>
                  <p>{form.crop_type}</p>
                </div>
              </div>
              <div className="stat-card shadow-sm">
                <span className="icon">📏</span>
                <div className="stat-info">
                  <label>Land Size</label>
                  <p>{form.land_size_acres} Acres</p>
                </div>
              </div>
              <div className="stat-card shadow-sm">
                <span className="icon">🏜️</span>
                <div className="stat-info">
                  <label>Soil Type</label>
                  <p>{form.soil_type}</p>
                </div>
              </div>
            </div>

            <div className="dashboard-actions">
              <button className="btn btn-teal" onClick={() => setIsEditing(true)}>Edit Profile</button>
              <button className="btn btn-outline" onClick={() => navigate('/')}>Dashboard Home</button>
              <button className="btn btn-danger" onClick={handleSignOut}>Sign Out</button>
            </div>
          </div>
        ) : !userEmail && !isEditing ? (
          /* LOGGED OUT VIEW */
          <div className="login-view">
            <div className="profile-header">
              <div className="avatar-placeholder big">👨‍🌾</div>
              <h2>Join AgriSense AI</h2>
              <p>Sign in to save your farm details and get personalized insights.</p>
            </div>

            <div className="google-quick-login shadow-sm">
              <div className="google-btn-wrapper">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap
                  theme="outline"
                  shape="pill"
                  text="signin_with"
                  width="280"
                />
              </div>
              <div className="divider"><span>OR</span></div>
              <button className="btn btn-outline btn-full" onClick={() => setIsEditing(true)}>
                📝 Create Account Manually
              </button>
            </div>

            <div className="login-benefits">
              <div className="benefit-item">📍 <strong>Smart Location:</strong> Auto-synced weather & markets.</div>
              <div className="benefit-item">📊 <strong>Easy Prediction:</strong> No need to re-type crop info.</div>
              <div className="benefit-item">☁️ <strong>Cloud Sync:</strong> Access from any device.</div>
            </div>
          </div>
        ) : (
          /* EDIT / REGISTRATION FORM */
          <>
            <div className="profile-header">
              <div className="avatar-wrapper" onClick={() => document.getElementById('photo-upload-form').click()}>
                {form.photo_url ? (
                  <img src={form.photo_url} alt="Profile" className="profile-img-sm" />
                ) : (
                  <div className="avatar">👨‍🌾</div>
                )}
                <div className="upload-overlay-sm">📷</div>
                <input type="file" id="photo-upload-form" hidden accept="image/*" onChange={handleFileChange} />
              </div>
              <h2>{userEmail ? "Update Your Profile" : "Register Your Farm"}</h2>
              <p>Tailor your experience by completing your agricultural profile.</p>
            </div>

            <form className="profile-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email Address *</label>
                <input 
                  type="email" 
                  name="email" 
                  value={form.email} 
                  onChange={handleChange} 
                  required 
                  placeholder="farmer@example.com"
                  readOnly={!!userEmail}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" name="full_name" value={form.full_name} onChange={handleChange} placeholder="Enter your name" />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="+91 ..." />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Field Location</label>
                  <input type="text" name="location" value={form.location} onChange={handleChange} placeholder="District, State" />
                </div>
                <div className="form-group">
                  <label>Main Crop Type</label>
                  <select name="crop_type" value={form.crop_type} onChange={handleChange}>
                    <option value="">Select Crop</option>
                    {cropOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Land Size (Acres)</label>
                  <input type="number" name="land_size_acres" value={form.land_size_acres} onChange={handleChange} step="0.1" placeholder="e.g. 5.5" />
                </div>
                <div className="form-group">
                  <label>Soil Type</label>
                  <select name="soil_type" value={form.soil_type} onChange={handleChange}>
                    <option value="">Select Soil</option>
                    {soilOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="dashboard-actions">
                <button type="submit" className={`btn btn-teal ${isLoading ? 'loading' : ''}`} disabled={isLoading}>
                  {isLoading ? "Saving..." : (userEmail ? "Update Profile" : "Create Profile")}
                </button>
                {(userEmail || isEditing) && (
                  <button type="button" className="btn btn-outline" onClick={() => setIsEditing(false)}>Cancel</button>
                )}
              </div>
            </form>
          </>
        )}
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

export default ProfilePage
