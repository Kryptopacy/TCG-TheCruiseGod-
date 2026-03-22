'use client';

import { useState, useCallback } from 'react';

export function useDeviceLocation() {
  const [location, setLocation] = useState<string>('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showLocationInput, setShowLocationInput] = useState(false);

  const getDeviceLocation = useCallback((
    onSuccess?: (msg: string) => void,
    onError?: (msg: string) => void
  ) => {
    if (!navigator.geolocation) {
      onError?.('Geolocation not available on this device.');
      return;
    }
    
    setIsGettingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          // Reverse geocode using Google Maps
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
          );
          const data = await response.json();
          
          if (data.results?.[0]) {
            const addr = data.results[0].formatted_address;
            setLocation(addr);
            setShowLocationInput(false);
            onSuccess?.(`📍 Location set: ${addr}`);
          } else {
            const fallback = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            setLocation(fallback);
            setShowLocationInput(false);
            onSuccess?.(`📍 Location set`);
          }
        } catch {
          setLocation(`Lat/Lng detected`);
          setShowLocationInput(false);
          onSuccess?.(`📍 Location set`);
        }
        setIsGettingLocation(false);
      },
      (error) => {
        console.error('[TCG] Geolocation error:', error);
        onError?.('Could not get location. You can type it manually below.');
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  return { 
    location, 
    setLocation, 
    isGettingLocation, 
    showLocationInput, 
    setShowLocationInput, 
    getDeviceLocation 
  };
}
