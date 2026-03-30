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
import ProfilePage from './pages/ProfilePage'
import LocationBanner from './components/LocationBanner'

import './App.css'

import { useEffect } from 'react'

function App() {
  useEffect(() => {
    const BACKEND = import.meta.env.VITE_BACKEND_URI || 'http://localhost:8000';
    const COOLDOWN_MS = 1800000; // 30 minutes

    // Saves synced data to localStorage and notifies all listeners
    const commitSyncData = (data, extras = {}) => {
      const now = new Date().getTime();
      // Strip state from city display name
      let city = data.region_info || '';
      if (city.includes(',')) city = city.split(',')[0].trim();
      data.region_info = city;

      if (extras.source) {
         const currentSource = localStorage.getItem('agrisense_sync_source');
         if (currentSource === 'Profile' && extras.source !== 'Profile') {
             console.log("[Sync] Priority block: Ignoring lower-priority source.");
             return;
         }
         localStorage.setItem('agrisense_sync_source', extras.source);
      }
      
      localStorage.setItem('agrisense_location_data_v2', JSON.stringify(data));
      localStorage.setItem('agrisense_last_sync_v2', now.toString());
      localStorage.setItem('agrisense_weather_city', city);
      
      // Dispatch both custom event and profile update for maximum reactivity
      window.dispatchEvent(new CustomEvent('agrisense_location_synced', { detail: { ...data, source: extras.source || 'IP' } }));
      window.dispatchEvent(new Event('agrisense_profile_updated'));
      console.log(`[Sync] ✅ Committed: ${city} (via ${extras.source || 'unknown'})`);
    };

    // Fetches weather from backend using lat/lon
    const syncByCoords = async (lat, lon, source) => {
      console.log(`[Sync] Fetching weather for ${lat},${lon} (${source})...`);
      const res = await fetch(`${BACKEND}/api/v1/weather-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lon })
      });
      const data = await res.json();
      if (data.status === 'success') commitSyncData(data, { source });
      return data;
    };

    // Fetches weather from backend using a city name string
    const syncByCity = async (city, source) => {
      console.log(`[Sync] Fetching weather for city: "${city}" (${source})...`);
      // Clear legacy city name and show placeholder to avoid "Noida" persistence
      localStorage.setItem('agrisense_weather_city', 'Syncing...');
      
      const res = await fetch(`${BACKEND}/api/v1/weather-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city })
      });
      const data = await res.json();
      if (data.status === 'success') commitSyncData(data, { source });
      return data;
    };

    // GPS → IP-City fallback chain
    const syncWithGPS = (forceClearCache = false) => {
      if (forceClearCache) {
        // Wipe stale data so the UI shows "Syncing..." instead of the old city
        localStorage.removeItem('agrisense_location_data_v2');
        localStorage.removeItem('agrisense_last_sync_v2');
      }

      const ipFallback = async () => {
        try {
          console.log('[Sync] GPS unavailable. Trying ip-api.com...');
          const ipRes = await fetch('http://ip-api.com/json/');
          const ipData = await ipRes.json();
          if (ipData.status === 'success' && ipData.city && ipData.regionName) {
            await syncByCity(ipData.city, 'IP');
          } else if (ipData.lat && ipData.lon) {
            await syncByCoords(ipData.lat, ipData.lon, 'IP coords');
          }
        } catch (e) {
          console.error('[Sync] All fallbacks failed.', e);
        }
      };

      if (!navigator.geolocation) {
        ipFallback();
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => syncByCoords(pos.coords.latitude, pos.coords.longitude, 'GPS'),
        (err) => {
          console.warn('[Sync] GPS denied/failed:', err.message);
          ipFallback();
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
      );
    };

    // Profile-city sync (logged-in users)
    const syncWithProfileCity = (city) => syncByCity(city, 'Profile');

    // --- INITIAL MOUNT ---
    const initialSync = () => {
      const profile = JSON.parse(localStorage.getItem('agrisense_user_profile') || 'null');
      const lastSync = localStorage.getItem('agrisense_last_sync_v2');
      const hasData = !!localStorage.getItem('agrisense_location_data_v2');
      const syncSource = localStorage.getItem('agrisense_sync_source') || '';
      const now = new Date().getTime();

      // Only respect cooldown if: data exists, is fresh, AND was from GPS (not stale IP data)
      const isFresh = hasData && lastSync && (now - parseInt(lastSync)) < COOLDOWN_MS;
      const isGPSData = syncSource === 'GPS' || syncSource === 'Profile';

      if (profile && profile.location) {
        if (isFresh && isGPSData) { console.log('[Sync] Profile on cooldown, skipping.'); return; }
        syncWithProfileCity(profile.location);
      } else {
        if (isFresh && isGPSData) { console.log('[Sync] GPS on cooldown, skipping.'); return; }
        // Always re-sync if source was IP (IP data is less reliable)
        syncWithGPS(!isGPSData);
      }
    };

    initialSync();

    // LOGIN / PROFILE SAVE
    const handleProfileSync = () => {
      const profile = JSON.parse(localStorage.getItem('agrisense_user_profile') || 'null');
      if (profile && profile.location) {
        // Clear all caches first to ensure fresh data
        localStorage.removeItem('agrisense_last_sync_v2');
        localStorage.removeItem('agrisense_location_data_v2');
        localStorage.removeItem('agrisense_weather_city');
        syncWithProfileCity(profile.location);
      }
    };

    // MANUAL SYNC BUTTON or SIGN-OUT — always bypass cooldown
    const handleForceSync = () => {
      console.log('[Sync] Manual force sync — clearing cache and re-syncing...');
      const profile = JSON.parse(localStorage.getItem('agrisense_user_profile') || 'null');
      if (profile && profile.location) {
        localStorage.removeItem('agrisense_last_sync_v2');
        localStorage.removeItem('agrisense_location_data_v2');
        syncWithProfileCity(profile.location);
      } else {
        syncWithGPS(true); // true = forceClearCache
      }
    };
    
    // Safety check to prevent IP detections from overwriting a verified profile
    const shouldAllowSync = (incomingSource) => {
      const currentSource = localStorage.getItem('agrisense_sync_source');
      if (currentSource === 'Profile' && incomingSource !== 'Profile') {
        console.log(`[Sync] Blocked ${incomingSource} sync from overwriting verified Profile location.`);
        return false;
      }
      return true;
    };

    window.addEventListener('agrisense_force_profile_sync', handleProfileSync);
    window.addEventListener('agrisense_force_sync', handleForceSync);
    return () => {
      window.removeEventListener('agrisense_force_profile_sync', handleProfileSync);
      window.removeEventListener('agrisense_force_sync', handleForceSync);
    };
  }, [])

  return (
    <Router>
      <div className="app-wrapper">
        <Navbar />
        <LocationBanner />

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
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  )
}

export default App
