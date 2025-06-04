// ===== ENHANCED HOME-PRESENTER.JS =====
import { saveStory, getAllStory as getLocalStories, deleteStoryById } from '../../data/database.js';

export default class HomePresenter {
  #view;
  #model;
  #isOnline = true;

  constructor({ view, model }) {
    this.#view = view;
    this.#model = model;
    
    // Setup online status detector
    this.#isOnline = navigator.onLine;
    console.log('Initial connection status:', this.#isOnline ? 'Online' : 'Offline');
    
    window.addEventListener('online', () => this.#handleConnectionChange(true));
    window.addEventListener('offline', () => this.#handleConnectionChange(false));
  }

  #handleConnectionChange(online) {
    this.#isOnline = online;
    console.log(`Connection changed: ${online ? 'Online' : 'Offline'}`);
    
    // Jika kembali online, coba sync data
    if (online) {
      this.#trySyncOfflineData();
      // Refresh data when back online
      this.initialGalleryAndMap();
    }
  }

  async #trySyncOfflineData() {
    try {
      const localStories = await getLocalStories();
      const unsyncedStories = localStories.filter(story => story.isDraft);
      
      if (unsyncedStories.length > 0) {
        console.log(`Found ${unsyncedStories.length} unsynced stories`);

      }
    } catch (error) {
      console.error('Failed to sync offline data:', error);
    }
  }

  async showStoriesListMap(stories) {
    this.#view.showMapLoading();
    try {
      await this.#view.initialMap(stories);
    } catch (error) {
      console.error('showStoriesListMap error:', error);
    } finally {
      this.#view.hideMapLoading();
    }
  }

  async initialGalleryAndMap() {
    console.log('=== initialGalleryAndMap started ===');
    console.log('Current online status:', this.#isOnline);
    
    this.#view.showLoading();
    
    try {
      let stories = [];
      let dataSource = '';
      
      if (this.#isOnline) {
        console.log('Attempting to fetch from network...');
        try {
          // Use the correct function name that exists in API
          const response = await this.#model.getAllStories();
          console.log('Network response received:', response);
          
          if (Array.isArray(response)) {
            stories = response;
            dataSource = 'Network (Array)';
          } else if (response?.listStory) {
            stories = response.listStory;
            dataSource = 'Network (Object.listStory)';
          } else if (response?.error) {
            throw new Error(response.message || 'Failed to fetch stories');
          } else {
            console.warn('Unexpected response format:', response);
            stories = [];
            dataSource = 'Network (Empty)';
          }
          
          console.log(`Network fetch successful: ${stories.length} stories`);
          
          // Simpan ke local database
          if (stories.length > 0) {
            await this.#cacheStories(stories);
          }
          
        } catch (networkError) {
          console.error('Network request failed:', networkError);
          console.log('Falling back to local data...');
          
          // Fallback ke data lokal jika request gagal
          stories = await this.#getLocalStoriesWithFallback();
          dataSource = 'Local (Network Failed)';
        }
      } else {
        console.log('Offline mode - loading local data...');
        // Fallback ke local data jika offline
        stories = await this.#getLocalStoriesWithFallback();
        dataSource = 'Local (Offline)';
      }

      console.log(`Final stories count: ${stories.length} from ${dataSource}`);

      // Always try to display something
      if (stories.length > 0) {
        const displayMessage = this.#isOnline ? '' : `📱 Mode Offline - ${stories.length} cerita tersimpan`;
        this.#view.populateStoryList(displayMessage, stories);
        await this.showStoriesListMap(stories);
        console.log('Successfully displayed stories');
      } else {
        console.log('No stories to display');
        if (this.#isOnline) {
          this.#view.populateStoryListEmpty();
        } else {
          this.#view.populateStoryListError('Tidak ada cerita tersimpan untuk mode offline');
        }
      }

    } catch (error) {
      console.error('=== CRITICAL ERROR in initialGalleryAndMap ===', error);
      
      // Ultimate fallback: try one more time to get local data
      try {
        console.log('Attempting ultimate fallback to local data...');
        const fallbackStories = await this.#getLocalStoriesWithFallback();
        
        if (fallbackStories.length > 0) {
          console.log(`Ultimate fallback successful: ${fallbackStories.length} stories`);
          this.#view.populateStoryList('⚠️ Data darurat - mode offline', fallbackStories);
          await this.showStoriesListMap(fallbackStories);
        } else {
          console.log('Ultimate fallback failed - no local data');
          this.#view.populateStoryListError(
            this.#isOnline 
              ? 'Gagal memuat cerita dari server' 
              : 'Tidak ada cerita tersimpan untuk mode offline'
          );
        }
      } catch (fallbackError) {
        console.error('Ultimate fallback failed:', fallbackError);
        this.#view.populateStoryListError('Terjadi kesalahan sistem: ' + (error.message || 'Unknown error'));
      }
    } finally {
      this.#view.hideLoading();
      console.log('=== initialGalleryAndMap completed ===');
    }
  }

  // Helper method to get local stories with proper error handling
  async #getLocalStoriesWithFallback() {
    try {
      console.log('Attempting to get local stories...');
      const localStories = await getLocalStories();
      console.log(`Retrieved ${localStories.length} stories from IndexedDB`);
      
      // Validate stories data
      const validStories = localStories.filter(story => 
        story && story.id && (story.name || story.description)
      );
      
      if (validStories.length !== localStories.length) {
        console.warn(`Filtered out ${localStories.length - validStories.length} invalid stories`);
      }
      
      return validStories;
    } catch (error) {
      console.error('Failed to get local stories:', error);
      return [];
    }
  }

  async #cacheStories(stories) {
    try {
      console.log(`Attempting to cache ${stories.length} stories...`);
      
      // Validate stories before caching
      const validStories = stories.filter(story => story && story.id);
      
      if (validStories.length !== stories.length) {
        console.warn(`Skipping ${stories.length - validStories.length} invalid stories during caching`);
      }
      
      // Simpan semua story ke IndexedDB
      const cachePromises = validStories.map(story => {
        const storyToCache = {
          ...story,
          isDraft: false, 
          cachedAt: new Date().toISOString() 
        };
        
        return saveStory(storyToCache).catch(error => {
          console.error(`Failed to cache story ${story.id}:`, error);
          return null; 
        });
      });
      
      const results = await Promise.all(cachePromises);
      const successCount = results.filter(result => result !== null).length;
      
      console.log(`Successfully cached ${successCount}/${validStories.length} stories`);
    } catch (error) {
      console.error('Failed to cache stories:', error);
    }
  }


  async deleteStoryLocally(id) {
    try {
      console.log('Deleting story locally:', id);

      await deleteStoryById(id);
      console.log('Story deleted from local database:', id);
      return true;
    } catch (error) {
      console.error('Failed to delete story from local database:', error);
      throw error;
    }
  }
}