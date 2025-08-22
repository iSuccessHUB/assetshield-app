// Service Worker for AssetShield App
const CACHE_NAME = 'assetshield-v1.0.0'
const OFFLINE_URL = '/offline.html'

// Files to cache for offline functionality
const CACHE_FILES = [
  '/',
  '/static/app.js',
  '/static/styles.css',
  '/login',
  '/register',
  '/dashboard',
  '/offline.html',
  'https://cdn.tailwindcss.com/tailwind.min.css',
  'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js'
]

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...')
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching app shell')
        return cache.addAll(CACHE_FILES)
      })
      .then(() => {
        // Force the waiting service worker to become the active service worker
        return self.skipWaiting()
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...')
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => {
      // Ensure the new service worker takes control immediately
      return self.clients.claim()
    })
  )
})

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return
  }
  
  // Skip external requests (except CDN resources)
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin && 
      !url.hostname.includes('cdn.tailwindcss.com') &&
      !url.hostname.includes('cdn.jsdelivr.net')) {
    return
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          return response
        }
        
        // Try to fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response
            }
            
            // Clone the response
            const responseToCache = response.clone()
            
            // Add to cache for future requests
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache)
              })
            
            return response
          })
          .catch(() => {
            // If fetch fails and we're requesting an HTML page, return offline page
            if (event.request.headers.get('Accept').includes('text/html')) {
              return caches.match(OFFLINE_URL)
            }
          })
      })
  )
})

// Handle background sync for offline form submissions
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag)
  
  if (event.tag === 'assessment-submit') {
    event.waitUntil(syncAssessments())
  } else if (event.tag === 'consultation-submit') {
    event.waitUntil(syncConsultations())
  }
})

// Sync pending assessments when back online
async function syncAssessments() {
  try {
    const db = await openIndexedDB()
    const assessments = await getStoredAssessments(db)
    
    for (const assessment of assessments) {
      try {
        const response = await fetch('/api/assessment/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(assessment.data)
        })
        
        if (response.ok) {
          await removeStoredAssessment(db, assessment.id)
          console.log('Synced assessment:', assessment.id)
        }
      } catch (error) {
        console.error('Failed to sync assessment:', error)
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error)
  }
}

// Sync pending consultations when back online
async function syncConsultations() {
  try {
    const db = await openIndexedDB()
    const consultations = await getStoredConsultations(db)
    
    for (const consultation of consultations) {
      try {
        const response = await fetch('/api/consultation/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(consultation.data)
        })
        
        if (response.ok) {
          await removeStoredConsultation(db, consultation.id)
          console.log('Synced consultation:', consultation.id)
        }
      } catch (error) {
        console.error('Failed to sync consultation:', error)
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error)
  }
}

// IndexedDB helpers for offline storage
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AssetShieldDB', 1)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      
      if (!db.objectStoreNames.contains('assessments')) {
        db.createObjectStore('assessments', { keyPath: 'id', autoIncrement: true })
      }
      
      if (!db.objectStoreNames.contains('consultations')) {
        db.createObjectStore('consultations', { keyPath: 'id', autoIncrement: true })
      }
    }
  })
}

function getStoredAssessments(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['assessments'], 'readonly')
    const store = transaction.objectStore('assessments')
    const request = store.getAll()
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

function getStoredConsultations(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['consultations'], 'readonly')
    const store = transaction.objectStore('consultations')
    const request = store.getAll()
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

function removeStoredAssessment(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['assessments'], 'readwrite')
    const store = transaction.objectStore('assessments')
    const request = store.delete(id)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

function removeStoredConsultation(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['consultations'], 'readwrite')
    const store = transaction.objectStore('consultations')
    const request = store.delete(id)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event)
  
  const options = {
    body: event.data ? event.data.text() : 'New notification from AssetShield App',
    icon: '/static/icons/icon-192x192.png',
    badge: '/static/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'explore',
        title: 'View Details',
        icon: '/static/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/static/icons/xmark.png'
      }
    ]
  }
  
  event.waitUntil(
    self.registration.showNotification('AssetShield App', options)
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event)
  
  event.notification.close()
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/dashboard')
    )
  } else if (event.action === 'close') {
    // Just close the notification
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    )
  }
})