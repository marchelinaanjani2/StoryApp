const DB_NAME = 'story-db';
const DB_VERSION = 1;
const STORE_NAME = 'stories';

let db;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (e) => reject(e);
    request.onsuccess = () => {
      db = request.result;
      console.log('IndexedDB opened successfully');
      resolve(db);
    };

   request.onupgradeneeded = () => {
      const db = request.result;
      console.log('IndexedDB upgrade needed');
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        console.log('Created object store:', STORE_NAME);
      }
    };
  });
}

export async function saveStory(story) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.put(story);
      request.onsuccess = () => {
        console.log('Story saved to IndexedDB:', story.id);
        resolve(request.result);
      };
      request.onerror = () => {
        console.error('Failed to save story:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('saveStory error:', error);
    throw error;
  }
}

// Fungsi untuk mendapatkan semua cerita
export async function getAllStory() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      if (store.getAll) {
        const request = store.getAll();
        request.onsuccess = () => {
          console.log(`Retrieved ${request.result.length} stories from IndexedDB`);
          resolve(request.result);
        };
        request.onerror = () => reject(request.error);
      } else {
        // Fallback for older browsers
        const request = store.openCursor();
        const result = [];
        request.onsuccess = function () {
          const cursor = request.result;
          if (cursor) {
            result.push(cursor.value);
            cursor.continue();
          } else {
            console.log(`Retrieved ${result.length} stories from IndexedDB (cursor method)`);
            resolve(result);
          }
        };
        request.onerror = () => reject(request.error);
      }
    });
  } catch (error) {
    console.error('getAllStory error:', error);
    throw error;
  }
}

// Fungsi untuk menghapus cerita
export async function deleteStoryById(id) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => {
        console.log('Story deleted from IndexedDB:', id);
        resolve(request.result);
      };
      request.onerror = () => {
        console.error('Failed to delete story:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('deleteStoryById error:', error);
    throw error;
  }
}

export default {
  saveStory,
  getAllStory,
  deleteStoryById
};