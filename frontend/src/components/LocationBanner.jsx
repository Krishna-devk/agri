import { useState, useEffect } from 'react'
import './LocationBanner.css'

const LocationBanner = () => {
    const [isVisible, setIsVisible] = useState(false)
    const [location, setLocation] = useState('')
    const [syncSource, setSyncSource] = useState('')

    useEffect(() => {
        const checkSync = () => {
            const lastSync = localStorage.getItem('agrisense_last_sync_v2')
            const locationData = localStorage.getItem('agrisense_location_data_v2')
            const source = localStorage.getItem('agrisense_sync_source') || ''
            
            if (lastSync && locationData) {
                const now = new Date().getTime()
                const data = JSON.parse(locationData)
                
                // Extended to 2 mins for easier debugging
                if (now - parseInt(lastSync) < 120000) {
                    setLocation(data.region_info)
                    setSyncSource(source)
                    setIsVisible(true)
                    
                    // Auto-hide after 9 seconds
                    const timer = setTimeout(() => setIsVisible(false), 9000)
                    return () => clearTimeout(timer)
                }
            }
        }

        const handleSyncEvent = (e) => {
            setLocation(e.detail.region_info)
            setIsVisible(true)
            // Use metadata from event or localStorage
            const source = e.detail.source || localStorage.getItem('agrisense_sync_source') || 'detect'
            setSyncSource(source)
        }

        checkSync()
        window.addEventListener('agrisense_location_synced', handleSyncEvent)
        window.addEventListener('storage', checkSync)
        return () => {
            window.removeEventListener('agrisense_location_synced', handleSyncEvent)
            window.removeEventListener('storage', checkSync)
        }
    }, [])

    if (!isVisible) return null
 
    return (
        <div className={`location-banner animate-slideIn ${syncSource === 'Profile' ? 'banner--profile' : ''}`}>
            <div className="location-banner__content">
                <span className="location-banner__icon">
                    {syncSource === 'Profile' ? '🧑‍🌾' : '🛰️'}
                </span>
                <span className="location-banner__text">
                    {syncSource === 'Profile' 
                      ? <>Profile location <strong>{location}</strong> synced!</>
                      : <>Automatic field detection for <strong>{location}</strong>.</>
                    }
                </span>
                <button className="location-banner__close" onClick={() => setIsVisible(false)}>✕</button>
            </div>
            <div className="location-banner__progress" />
        </div>
    )
}

export default LocationBanner
