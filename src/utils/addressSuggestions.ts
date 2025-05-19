import type { AddressFeature } from '../types/address';

interface AddressResponse {
  type: string;
  version: string;
  features: AddressFeature[];
  attribution: string;
  licence: string;
  query: string;
  limit: number;
}

// Cache for address suggestions to reduce API calls
const suggestionCache = new Map<string, AddressFeature[]>();

// Circuit breaker configuration with more lenient settings
const circuitBreaker = {
  failures: 0,
  lastFailure: 0,
  threshold: 5, // Increased from 3 to 5 failures
  resetTimeout: 60000, // Increased from 30s to 60s
  isOpen: function() {
    if (this.failures >= this.threshold) {
      const timeSinceLastFailure = Date.now() - this.lastFailure;
      if (timeSinceLastFailure < this.resetTimeout) {
        return true;
      }
      // Reset circuit breaker after timeout
      this.failures = 0;
    }
    return false;
  },
  recordFailure: function() {
    this.failures++;
    this.lastFailure = Date.now();
  },
  reset: function() {
    this.failures = 0;
    this.lastFailure = 0;
  }
};

// Fallback data for common cities when API fails
const FALLBACK_CITIES: { [key: string]: { lat: number; lon: number } } = {
  'Paris': { lat: 48.8566, lon: 2.3522 },
  'Lyon': { lat: 45.7578, lon: 4.8320 },
  'Marseille': { lat: 43.2965, lon: 5.3698 },
  'Bordeaux': { lat: 44.8378, lon: -0.5792 },
  'Lille': { lat: 50.6292, lon: 3.0573 },
  'Toulouse': { lat: 43.6047, lon: 1.4442 },
  'Nice': { lat: 43.7102, lon: 7.2620 },
  'Nantes': { lat: 47.2184, lon: -1.5536 },
  'Strasbourg': { lat: 48.5734, lon: 7.5734 },
  'Montpellier': { lat: 43.6108, lon: 3.8767 }
};

export async function getSuggestions(query: string): Promise<AddressFeature[]> {
  if (!query || query.length < 3) return [];

  try {
    const cleanQuery = query.trim();
    
    // Check cache first
    const cacheKey = cleanQuery.toLowerCase();
    if (suggestionCache.has(cacheKey)) {
      console.log('Using cached address suggestions for:', cleanQuery);
      return suggestionCache.get(cacheKey) || [];
    }

    // Check circuit breaker
    if (circuitBreaker.isOpen()) {
      console.log('Circuit breaker is open - using fallback data');
      return getFallbackResults(cleanQuery);
    }
    
    // Increased timeout to 15 seconds for better reliability
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.log('Aborting address API request due to timeout (15s)');
    }, 15000); // Increased from 10s to 15s

    try {
      console.log('Fetching address suggestions for:', cleanQuery);
      
      const apiUrl = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(cleanQuery)}&limit=5&autocomplete=1`;
      
      const response = await fetchWithRetry(apiUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Simulateur Solaire/1.0'
        }
      }, 5); // Increased retries from 3 to 5
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error(`API address error: ${response.status} ${response.statusText}`);
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const data: AddressResponse = await response.json();
      
      if (!Array.isArray(data.features)) {
        console.error('Invalid response format:', data);
        throw new Error('Invalid response format');
      }

      // Filter for relevant results
      const filteredResults = data.features.filter(feature => 
        feature.properties.type === 'housenumber' || 
        feature.properties.type === 'street'
      );
      
      console.log(`Received ${filteredResults.length} address suggestions`);
      
      // Cache the results and reset circuit breaker on success
      suggestionCache.set(cacheKey, filteredResults);
      circuitBreaker.reset();
      
      return filteredResults;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      // Record failure in circuit breaker
      circuitBreaker.recordFailure();
      
      if (fetchError.name === 'AbortError') {
        console.error('Address API request timeout');
        // Check cache again in case it was populated by another request
        const cachedResults = suggestionCache.get(cacheKey);
        if (cachedResults) {
          return cachedResults;
        }
        return getFallbackResults(cleanQuery);
      }
      
      // Enhanced error logging for network errors
      console.error('Address API network error:', {
        message: fetchError.message,
        name: fetchError.name,
        stack: fetchError.stack,
        cause: fetchError.cause
      });
      
      return getFallbackResults(cleanQuery);
    }
  } catch (error) {
    console.error('Error retrieving address suggestions:', error);
    return getFallbackResults(query.trim());
  }
}

// Helper function to get fallback results
function getFallbackResults(query: string): AddressFeature[] {
  const normalizedQuery = query.toLowerCase();
  
  // Try to match query against fallback cities
  const matchingCity = Object.keys(FALLBACK_CITIES).find(city => 
    normalizedQuery.includes(city.toLowerCase())
  );

  if (matchingCity) {
    const coords = FALLBACK_CITIES[matchingCity];
    return [{
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [coords.lon, coords.lat]
      },
      properties: {
        label: matchingCity,
        score: 1,
        type: 'city',
        name: matchingCity,
        postcode: '',
        citycode: '',
        x: coords.lon,
        y: coords.lat,
        city: matchingCity,
        context: '',
        id: '',
        importance: 1,
        street: '',
        housenumber: ''
      }
    }];
  }
  
  return [];
}

// Utility function to retry fetch requests with improved error handling
async function fetchWithRetry(url: string, options: RequestInit, maxRetries: number): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Exponential backoff with jitter
        const backoffDelay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 15000);
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} for ${url} after ${Math.round(backoffDelay)}ms`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
      
      // Check if signal is already aborted before making the request
      if (options.signal?.aborted) {
        throw new Error('Request was aborted');
      }
      
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response;
    } catch (error) {
      // Enhanced error logging with detailed information
      console.error(`Fetch attempt ${attempt + 1} failed:`, {
        attempt: attempt + 1,
        maxRetries,
        url,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          cause: error.cause
        }
      });
      
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry if the request was aborted
      if (error instanceof Error && (error.name === 'AbortError' || options.signal?.aborted)) {
        throw error;
      }
      
      // On last attempt, throw the error
      if (attempt === maxRetries - 1) {
        throw lastError;
      }
    }
  }
  
  throw lastError || new Error(`Failed to fetch after ${maxRetries} attempts`);
}

// Fallback function for manual address entry
export function validateAddress(address: string, postalCode: string, city: string): boolean {
  return (
    address.length > 3 && 
    postalCode.length === 5 && 
    /^\d{5}$/.test(postalCode) && 
    city.length > 1
  );
}

// Get coordinates for a city when API fails
export function getFallbackCoordinates(city: string): { lat: number; lon: number } | null {
  const normalizedCity = city.trim().toLowerCase();
  
  for (const [key, coords] of Object.entries(FALLBACK_CITIES)) {
    if (key.toLowerCase() === normalizedCity) {
      return coords;
    }
  }
  
  // Default to center of France if city not found
  return { lat: 46.603354, lon: 1.888334 };
}