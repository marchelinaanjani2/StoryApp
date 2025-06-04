const CACHE_NAME = 'achel-cache-v6'; // Increment version
const API_URL = 'https://story-api.dicoding.dev/v1';
const DYNAMIC_CACHE = 'dynamic-cache-v2';
const API_CACHE = 'api-cache-v1';
const MAP_CACHE = 'map-tiles-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles/styles.css',
  '/styles/responsives.css',
  '/scripts/index.js',
  '/pages/home/home-page.js',
  '/pages/home/home-presenter.js',
  '/pages/about/about-page.js',
  '/pages/add/add-story-page.js',
  '/pages/add/add-story-presenter.js',
  '/database.js',
  '/app.js',
  '/OfflineStories.js',
  '/manifest.json',
  '/images/images1.png',
  '/images/semangat1.png',
  '/icons/icon-x192.png',
  '/icons/icon-x512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// Database helper functions
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('StoryAppDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('stories')) {
        const store = db.createObjectStore('stories', {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

function getAllStories(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['stories'], 'readonly');
    const store = transaction.objectStore('stories');
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function deleteStory(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['stories'], 'readwrite');
    const store = transaction.objectStore('stories');
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

function putStory(db, story) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['stories'], 'readwrite');
    const store = transaction.objectStore('stories');
    const request = store.put(story);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Install event
self.addEventListener('install', event => {
  console.log('[SW] Installing');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(STATIC_ASSETS).catch(error => {
          console.error('Failed to cache some assets:', error);
          // Continue even if some assets fail to cache
        });
      })
      .then(() => {
        console.log('[SW] Assets cached successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Install failed:', error);
      })
  );
});

// Activate event
self.addEventListener('activate', event => {
  console.log('[SW] Activated');
  event.waitUntil(
    Promise.all([
      // Clean old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(name => {
            if (name !== CACHE_NAME && name !== DYNAMIC_CACHE && name !== API_CACHE && name !== MAP_CACHE) {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            }
          })
        );
      }),
      
      // Initialize IndexedDB
      openDB().catch(error => {
        console.error('[SW] IndexedDB initialization failed:', error);
      })
    ])
    .then(() => {
      console.log('[SW] Activation complete');
      return self.clients.claim();
    })
    .catch(error => {
      console.error('[SW] Activation failed:', error);
    })
  );
});

// Fetch event - Single consolidated handler
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle POST requests to API (for offline functionality)
  if (request.method === 'POST' && url.hostname.includes('story-api.dicoding.dev')) {
    event.respondWith(handlePostRequest(request));
    return;
  }
  
  // Skip other non-GET requests for caching
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle OpenStreetMap tiles
  if (url.hostname.includes('tile.openstreetmap.org')) {
    event.respondWith(handleMapTiles(request));
    return;
  }
  
  // Handle API requests
  if (url.hostname.includes('story-api.dicoding.dev')) {
    event.respondWith(handleApiRequest(request));
    return;
  }
  
  // Handle static assets
  if (STATIC_ASSETS.some(asset => {
    if (asset.startsWith('http')) {
      return asset === request.url;
    }
    return url.pathname === asset || url.pathname + '/' === asset;
  })) {
    event.respondWith(
      caches.match(request)
        .then(cached => {
          if (cached) {
            return cached;
          }
          return fetch(request).then(response => {
            if (response.ok) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(request, responseClone));
            }
            return response;
          });
        })
        .catch(() => {
          // Fallback to index.html for navigation requests
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          throw new Error('Network error and no cache available');
        })
    );
    return;
  }
  
  // Handle other requests with cache-first strategy
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(request).then(fetchResponse => {
          if (fetchResponse.ok) {
            const responseClone = fetchResponse.clone();
            caches.open(DYNAMIC_CACHE)
              .then(cache => cache.put(request, responseClone));
          }
          return fetchResponse;
        });
      })
      .catch(() => {
        // Fallback for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        throw new Error('Network error and no cache available');
      })
  );
});

// Handle map tiles with caching
async function handleMapTiles(request) {
  try {
    // Check cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fetch from network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache the tile
      const cache = await caches.open(MAP_CACHE);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Map tile failed, trying cache');
    
    // Try cache again in case of race condition
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return a placeholder tile or error response
    return new Response(new Uint8Array([]), {
      status: 404,
      statusText: 'Tile not available offline'
    });
  }
}

// Handle POST requests (for offline story submission)
async function handlePostRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.log('[SW] POST request failed, storing for later sync');
    
    // If offline, store the request data for later sync
    if (request.url.includes('/stories')) {
      try {
        const formData = await request.clone().formData();
        const storyData = {
          id: Date.now(), // Temporary ID
          name: formData.get('name') || 'Untitled',
          description: formData.get('description') || '',
          lat: parseFloat(formData.get('lat')) || 0,
          lon: parseFloat(formData.get('lon')) || 0,
          isDraft: true, // Mark as draft for sync later
          createdAt: new Date().toISOString(),
          photo: formData.get('photo') // Handle photo if present
        };
        
        const db = await openDB();
        await putStory(db, storyData);
        
        // Register background sync
        try {
          await self.registration.sync.register('sync-stories');
        } catch (syncError) {
          console.log('[SW] Background sync not available');
        }
        
        // Return success response
        return new Response(JSON.stringify({
          error: false,
          message: 'Story saved offline, will sync when online',
          data: storyData
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
        
      } catch (storeError) {
        console.error('[SW] Error storing offline story:', storeError);
        return new Response(JSON.stringify({
          error: true,
          message: 'Failed to save story offline'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // For other POST requests, return error
    return new Response(JSON.stringify({
      error: true,
      message: 'Network error: Unable to complete request offline'
    }), {
      status: 408,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// API request handler
async function handleApiRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(API_CACHE);
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    // If network fails, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache and IndexedDB');
    
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If it's a stories request, try IndexedDB
    if (request.url.includes('/stories')) {
      try {
        const db = await openDB();
        const stories = await getAllStories(db);
        
        if (stories.length > 0) {
          return new Response(JSON.stringify({ 
            listStory: stories,
            error: false,
            message: 'Showing offline data' 
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } catch (dbError) {
        console.error('[SW] IndexedDB error:', dbError);
      }
    }
    
    // Return error response
    return new Response(JSON.stringify({ 
      error: true,
      message: 'Network error and no cached data available' 
    }), {
      status: 408,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Background sync
self.addEventListener('sync', event => {
  console.log('[SW] Background sync triggered:', event.tag);
  if (event.tag === 'sync-stories') {
    event.waitUntil(syncOfflineStories());
  }
});

// Sync offline stories
async function syncOfflineStories() {
  console.log('[SW] Syncing offline stories');
  try {
    const db = await openDB();
    const stories = await getAllStories(db);
    const offlineStories = stories.filter(story => story.isDraft);
    
    if (offlineStories.length === 0) {
      console.log('[SW] No offline stories to sync');
      return;
    }
    
    const token = await getAuthToken();
    if (!token) {
      console.log('[SW] No auth token available');
      return;
    }
    
    const results = await Promise.allSettled(
      offlineStories.map(story => 
        fetch('https://story-api.dicoding.dev/v1/stories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(story)
        })
        .then(res => res.json())
        .then(data => ({ success: true, story, data }))
        .catch(error => ({ success: false, story, error }))
      )
    );
    
    // Remove successfully synced stories
    const successfulSyncs = results
      .filter(result => result.status === 'fulfilled' && result.value.success)
      .map(result => result.value.story);
    
    await Promise.all(
      successfulSyncs.map(story => deleteStory(db, story.id))
    );
    
    // Notify clients
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        count: successfulSyncs.length,
        total: offlineStories.length
      });
    });
    
    console.log(`[SW] Synced ${successfulSyncs.length}/${offlineStories.length} stories`);
  } catch (error) {
    console.error('[SW] Sync error:', error);
  }
}

// Get auth token (implement based on your auth system)
async function getAuthToken() {
  try {
    // This should be implemented based on how you store auth tokens
    // For example, you might get it from IndexedDB or communicate with the main thread
    const clients = await self.clients.matchAll();
    if (clients.length > 0) {
      return new Promise((resolve) => {
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data.token);
        };
        clients[0].postMessage({ type: 'GET_AUTH_TOKEN' }, [messageChannel.port2]);
      });
    }
    return null;
  } catch (error) {
    console.error('[SW] Error getting auth token:', error);
    return null;
  }
}

// Push notifications
self.addEventListener('push', event => {
  console.log('[SW] Push notification received');
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Notifikasi Baru';
  const options = {
    body: data.body || 'Anda punya notifikasi baru!',
    icon: '/icons/icon-x192.png',
    badge: '/icons/icon-x192.png',
    data: {
      url: data.url || '/',
    },
    actions: [
      {
        action: 'view',
        title: 'Lihat'
      },
      {
        action: 'close',
        title: 'Tutup'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked');
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      const url = event.notification.data.url || '/';
      const targetClient = clientList.find(client => client.url.includes(url));
      
      if (targetClient) {
        return targetClient.focus();
      }
      return clients.openWindow(url);
    })
  );
});

// Message handler
self.addEventListener('message', event => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'STORE_STORY') {
    event.waitUntil(
      openDB()
        .then(db => putStory(db, event.data.story))
        .then(() => {
          console.log('[SW] Story stored, registering sync');
          return self.registration.sync.register('sync-stories');
        })
        .catch(error => {
          console.error('[SW] Error storing story:', error);
        })
    );
  }
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Error handler
self.addEventListener('error', event => {
  console.error('[SW] Error:', event.error);
});

// Unhandled rejection handler
self.addEventListener('unhandledrejection', event => {
  console.error('[SW] Unhandled rejection:', event.reason);
  event.preventDefault();
});