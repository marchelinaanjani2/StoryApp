const CACHE_NAME = 'achel-cache-v5';
const API_URL = 'https://story-api.dicoding.dev/v1';
const DYNAMIC_CACHE = 'dynamic-cache-v1';
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



self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(name => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
          })
        );
      }),

      new Promise((resolve, reject) => {
        const request = indexedDB.open('StoryAppDB', 1);

        request.onerror = (event) => {
          console.error('Database error:', event.target.error);
          reject(event.target.error);
        };

        request.onsuccess = (event) => {
          resolve(event.target.result);
        };

        // Inside activate event:
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
      })
    ]).then(() => self.clients.claim())
  );
});


self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request)
        .then((cached) => cached || fetch(request))
    );
    return;
  }

  if (url.hostname.includes('story-api.dicoding.dev')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (request.method === 'GET') {
            const responseToCache = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then((cache) => cache.put(request, responseToCache));
          }
          return response;
        })

        .catch(() => caches.match(request))
    );
    return;

  }

  // Default behavior
  event.respondWith(
    caches.match(request).then(response => response || fetch(request)
    ));
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  let cleanURL = url.origin + url.pathname;

  // Handle API requests
  if (url.hostname.includes('story-api.dicoding.dev')) {
    event.respondWith(
      handleApiRequest(event)
    );
    return;
  }

  // Fallback ke cache untuk asset lainnya
  event.respondWith(
    caches.match(cleanURL).then((response) => {
      return response || fetch(event.request);
    }).catch(() => {
      return caches.match('/index.html'); // fallback kalau ada
    })
  );
});

async function handleApiRequest(event) {
  const { request } = event;
  
  try {
    // Coba fetch dari network
    const networkResponse = await fetch(request);
    
    // Jika sukses, simpan ke cache
    if (networkResponse.ok) {
      const cache = await caches.open('api-cache');
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Jika offline, kembalikan data dari IndexedDB
    if (request.method === 'GET' && request.url.includes('/stories')) {
      const db = await openDB();
      const stories = await db.getAllStories();
      
      if (stories.length > 0) {
        return new Response(JSON.stringify({ 
          listStory: stories,
          error: true,
          message: 'Showing offline data' 
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Fallback response
    return new Response(JSON.stringify({ 
      error: true,
      message: 'Network error and no cached data available' 
    }), {
      status: 408,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Sync event untuk sinkronisasi data ketika online kembali
self.addEventListener('sync', event => {
  if (event.tag === 'sync-stories') {
    event.waitUntil(
      syncOfflineStories()
    );
  }
});

async function syncOfflineStories() {
  const db = await openDB();
  const stories = await db.getAllStories();
  const offlineStories = stories.filter(story => story.isDraft);
  
  if (offlineStories.length > 0) {
    try {
      const token = await getAuthToken(); // Fungsi untuk mendapatkan token
      
      const results = await Promise.all(
        offlineStories.map(story => 
          fetch('https://story-api.dicoding.dev/v1/stories', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(story)
          }).then(res => res.json())
        )
      );
      
      // Hapus yang sudah sync
      await Promise.all(
        results
          .filter(res => !res.error)
          .map(res => db.deleteStory(res.id))
      );
      
      // Beri tahu client
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'SYNC_COMPLETE',
          count: results.length
        });
      });
    } catch (error) {
      console.error('Sync error:', error);
    }
  }
}

// Push notification (tetap sama)
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Notifikasi Baru';
  const options = {
    body: data.body || 'Anda punya notifikasi baru!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: {
      url: data.url || '/',
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handler (tetap sama)
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      const targetClient = clientList.find(client => client.url === event.notification.data.url);
      if (targetClient) {
        return targetClient.focus();
      }
      return clients.openWindow(event.notification.data.url);
    })
  );
});

// Message handler untuk komunikasi dengan client
self.addEventListener('message', event => {
  if (event.data.type === 'STORE_STORY') {
    // Simpan story ke IndexedDB
    event.waitUntil(
      openDB('StoryAppDB', 1).then(db => {
        return db.put('stories', event.data.story);
      }).then(() => {
        // Trigger sync
        self.registration.sync.register('sync-stories');
      })
    );
  }
});