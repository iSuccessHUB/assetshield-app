import { Hono } from 'hono'
import type { CloudflareBindings } from '../types'

export const globalRoutes = new Hono<{ Bindings: CloudflareBindings }>()

// Jurisdiction-specific legal information
const JURISDICTIONS = {
  'US': {
    name: 'United States',
    states: [
      'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 
      'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 
      'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 
      'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 
      'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 
      'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 
      'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 
      'Wisconsin', 'Wyoming'
    ],
    topAssetProtectionStates: ['Delaware', 'Nevada', 'Wyoming', 'South Dakota', 'Alaska'],
    currency: 'USD',
    language: 'en'
  },
  'UK': {
    name: 'United Kingdom',
    regions: ['England', 'Scotland', 'Wales', 'Northern Ireland'],
    currency: 'GBP',
    language: 'en'
  },
  'CA': {
    name: 'Canada',
    provinces: [
      'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador',
      'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island',
      'Quebec', 'Saskatchewan', 'Yukon'
    ],
    currency: 'CAD',
    language: 'en'
  },
  'AU': {
    name: 'Australia',
    states: [
      'New South Wales', 'Victoria', 'Queensland', 'Western Australia', 
      'South Australia', 'Tasmania', 'Northern Territory', 'Australian Capital Territory'
    ],
    currency: 'AUD',
    language: 'en'
  },
  'DE': {
    name: 'Germany',
    currency: 'EUR',
    language: 'de'
  },
  'FR': {
    name: 'France',
    currency: 'EUR',
    language: 'fr'
  },
  'CH': {
    name: 'Switzerland',
    currency: 'CHF',
    language: 'de'
  },
  'SG': {
    name: 'Singapore',
    currency: 'SGD',
    language: 'en'
  }
}

// Get available jurisdictions
globalRoutes.get('/jurisdictions', (c) => {
  return c.json({
    success: true,
    jurisdictions: Object.entries(JURISDICTIONS).map(([code, info]) => ({
      code,
      name: info.name,
      currency: info.currency,
      language: info.language
    }))
  })
})

// Get jurisdiction-specific information
globalRoutes.get('/jurisdiction/:code', (c) => {
  const code = c.req.param('code').toUpperCase()
  const jurisdiction = JURISDICTIONS[code]
  
  if (!jurisdiction) {
    return c.json({ error: 'Jurisdiction not found' }, 404)
  }
  
  return c.json({
    success: true,
    jurisdiction: {
      code,
      ...jurisdiction
    }
  })
})

// Get currency conversion rates (mock implementation)
globalRoutes.get('/currency/:from/:to', async (c) => {
  const from = c.req.param('from').toUpperCase()
  const to = c.req.param('to').toUpperCase()
  
  // Mock exchange rates - in production, integrate with real API
  const mockRates = {
    'USD': { 'GBP': 0.79, 'EUR': 0.85, 'CAD': 1.25, 'AUD': 1.45, 'CHF': 0.92, 'SGD': 1.35 },
    'GBP': { 'USD': 1.27, 'EUR': 1.08, 'CAD': 1.58, 'AUD': 1.84, 'CHF': 1.16, 'SGD': 1.71 },
    'EUR': { 'USD': 1.18, 'GBP': 0.93, 'CAD': 1.47, 'AUD': 1.71, 'CHF': 1.08, 'SGD': 1.59 }
  }
  
  const rate = mockRates[from]?.[to] || 1
  
  return c.json({
    success: true,
    from,
    to,
    rate,
    timestamp: new Date().toISOString()
  })
})

// Get time zone information
globalRoutes.get('/timezone/:jurisdiction', (c) => {
  const jurisdiction = c.req.param('jurisdiction').toUpperCase()
  
  const timezones = {
    'US': ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'],
    'UK': ['Europe/London'],
    'CA': ['America/Toronto', 'America/Vancouver', 'America/Winnipeg'],
    'AU': ['Australia/Sydney', 'Australia/Melbourne', 'Australia/Perth'],
    'DE': ['Europe/Berlin'],
    'FR': ['Europe/Paris'],
    'CH': ['Europe/Zurich'],
    'SG': ['Asia/Singapore']
  }
  
  return c.json({
    success: true,
    jurisdiction,
    timezones: timezones[jurisdiction] || ['UTC'],
    currentTime: new Date().toISOString()
  })
})