// ===== ENHANCED HOME-PAGE.JS =====
import {
  generateLoaderAbsoluteTemplate,
  generateStoryListEmptyTemplate,
  generateStoryListErrorTemplate,
} from '../../templates';
import HomePresenter from './home-presenter';
import * as StoryAPI from '../../data/api';
import { initStoryMap, initStoryMapInCard } from '../../components/story-map';
import { createStoryCard } from '../../components/story-card';
import { showSuccess, showError } from '../../utils/index';
import { getAllStory, deleteStoryById } from '../../data/database.js';

export default class HomePage {
  #presenter = null;

  async render() {
    return `
      <section>
        <div class="story-list__map__container">
          <div id="map" class="story-list__map" style="height: 400px;"></div>
          <div id="map-loading-container"></div>
        </div>
      </section>

      <section class="container">
        <h1 class="section-title">Daftar Cerita</h1>
        
        <!-- Connection Status Indicator -->
        <div id="connection-status" class="connection-status" style="margin-bottom: 1rem;">
          <!-- Will be populated by JavaScript -->
        </div>
        
        <div class="story-list__container">
          <div id="story-list" class="story-list"></div>
          <div id="story-list-loading-container"></div>
        </div>
        
        <div class="notification-controls" style="margin-top: 2rem; text-align: center;">
          <button id="subscribe-btn" class="btn">Aktifkan Notifikasi</button>
          <button id="unsubscribe-btn" class="btn btn-secondary">Nonaktifkan Notifikasi</button>
        </div>
      </section>
    `;
  }

  async afterRender() {
    console.log('=== HomePage afterRender started ===');
    
    this.#presenter = new HomePresenter({
      view: this,
      model: StoryAPI,
    });

    // Setup connection status indicator
    this.#setupConnectionStatusIndicator();

    // Setup offline data handling first
    this.#setupOfflineHandlers();

    // Initialize gallery and map
    await this.#presenter.initialGalleryAndMap();

    // Setup notification buttons
    await this.#setupNotificationButtons();

    // Setup delete functionality
    this.#setupDeleteHandlers();

    console.log('=== HomePage afterRender completed ===');
  }

  #setupConnectionStatusIndicator() {
    const updateConnectionStatus = () => {
      const statusEl = document.getElementById('connection-status');
      if (!statusEl) return;
      
      if (navigator.onLine) {
        statusEl.innerHTML = '<div class="alert alert-success">🟢 Online - Data terbaru tersedia</div>';
        statusEl.style.display = 'block';
        setTimeout(() => {
          if (statusEl) statusEl.style.display = 'none';
        }, 3000);
      } else {
        statusEl.innerHTML = '<div class="alert alert-warning">🔴 Offline - Menampilkan data tersimpan</div>';
        statusEl.style.display = 'block';
      }
    };

    // Set initial status
    updateConnectionStatus();

    // Listen for connection changes
    window.addEventListener('online', () => {
      console.log('Connection restored');
      updateConnectionStatus();
    });

    window.addEventListener('offline', () => {
      console.log('Connection lost');
      updateConnectionStatus();
    });
  }

  async #setupNotificationButtons() {
    try {
      // Import fungsi notifikasi
      const {
        subscribe,
        unsubscribe,
        isCurrentPushSubscriptionAvailable
      } = await import('../../utils/notification-helper');

      // Dapatkan tombol-tombol
      const subscribeBtn = document.getElementById('subscribe-btn');
      const unsubscribeBtn = document.getElementById('unsubscribe-btn');

      if (!subscribeBtn || !unsubscribeBtn) {
        console.error('Notification buttons not found');
        return;
      }

      // Fungsi untuk update tampilan tombol
      const updateButtonVisibility = async () => {
        try {
          const isSubscribed = await isCurrentPushSubscriptionAvailable();
          subscribeBtn.style.display = isSubscribed ? 'none' : 'block';
          unsubscribeBtn.style.display = isSubscribed ? 'block' : 'none';
        } catch (error) {
          console.error('Error updating button visibility:', error);
        }
      };

      // Set initial state
      await updateButtonVisibility();

      // Subscribe button handler
      subscribeBtn.addEventListener('click', async () => {
        subscribeBtn.disabled = true;
        subscribeBtn.textContent = 'Processing...';

        try {
          await subscribe();
          await updateButtonVisibility();
          showSuccess('Notifications enabled successfully!');
        } catch (error) {
          console.error('Subscription error:', error);
          showError(`Failed to enable notifications: ${error.message}`);
        } finally {
          subscribeBtn.disabled = false;
          subscribeBtn.textContent = 'Aktifkan Notifikasi';
        }
      });

      // Unsubscribe button handler
      unsubscribeBtn.addEventListener('click', async () => {
        unsubscribeBtn.disabled = true;
        unsubscribeBtn.textContent = 'Processing...';

        try {
          await unsubscribe();
          await updateButtonVisibility();
          showSuccess('Notifikasi berhasil dimatikan!');
        } catch (error) {
          console.error('Gagal unsubscribe:', error);
          showError('Gagal mematikan notifikasi: ' + error.message);
        } finally {
          unsubscribeBtn.disabled = false;
          unsubscribeBtn.textContent = 'Nonaktifkan Notifikasi';
        }
      });

    } catch (error) {
      console.error('Failed to setup notification buttons:', error);
    }
  }

  #setupOfflineHandlers() {
    console.log('Setting up offline handlers...');
    
    // Handle page visibility change (when user returns to tab)
    document.addEventListener('visibilitychange', async () => {
      if (!document.hidden) {
        console.log('Page became visible, checking offline data...');
        
        if (!navigator.onLine) {
          console.log('Page visible in offline mode - refreshing data');
          try {
            const offlineStories = await getAllStory();
            console.log(`Found ${offlineStories.length} offline stories on visibility change`);
            
            if (offlineStories.length > 0) {
              this.populateStoryList(`📱 Mode Offline - ${offlineStories.length} cerita tersimpan`, offlineStories);
            } else {
              this.populateStoryListError('Tidak ada cerita tersimpan untuk mode offline');
            }
          } catch (error) {
            console.error('Failed to refresh offline stories on visibility change:', error);
          }
        }
      }
    });

    // Enhanced page load handler
    window.addEventListener('load', async () => {
      console.log('Page load event triggered');
      
      if (!navigator.onLine) {
        console.log('Page loaded in offline mode - checking for cached data');
        
        // Give some time for IndexedDB to initialize
        setTimeout(async () => {
          try {
            const offlineStories = await getAllStory();
            console.log(`Page load offline check: Found ${offlineStories.length} stories`);
            
            if (offlineStories.length > 0) {
              this.populateStoryList(`📱 Mode Offline - ${offlineStories.length} cerita tersimpan`, offlineStories);
            }
          } catch (error) {
            console.error('Failed to load offline stories on page load:', error);
          }
        }, 500);
      }
    });

    // Force offline data check after a delay
    setTimeout(async () => {
      if (!navigator.onLine) {
        console.log('Delayed offline check...');
        try {
          const stories = await getAllStory();
          console.log(`Delayed offline check: ${stories.length} stories found`);
          
          const storyListEl = document.getElementById('story-list');
          if (storyListEl && (!storyListEl.innerHTML || storyListEl.innerHTML.includes('error'))) {
            console.log('Story list appears empty or has error, forcing offline data display');
            if (stories.length > 0) {
              this.populateStoryList(`📱 Mode Offline - ${stories.length} cerita tersimpan`, stories);
            }
          }
        } catch (error) {
          console.error('Delayed offline check failed:', error);
        }
      }
    }, 1000);
  }

  #setupDeleteHandlers() {
    const storyListEl = document.getElementById('story-list');
    if (!storyListEl) {
      console.error('Story list element not found');
      return;
    }

    storyListEl.addEventListener('click', async (event) => {
      const deleteBtn = event.target.closest('.story-delete');
      if (!deleteBtn) return;

      const id = deleteBtn.dataset.storyId;
      if (!id) {
        console.error('Story ID not found on delete button');
        return;
      }

      const confirmed = confirm("Yakin ingin menghapus cerita ini? (Hanya akan dihapus dari perangkat ini)");
      if (!confirmed) return;

      // Get original button text and disable button
      const originalText = deleteBtn.textContent;
      deleteBtn.disabled = true;
      deleteBtn.textContent = 'Menghapus...';

      try {
        // Delete from local IndexedDB only
        await this.#presenter.deleteStoryLocally(id);
        console.log('Story deleted locally:', id);

        // Update UI immediately
        const updatedStories = await getAllStory();
        const message = navigator.onLine ? 'Cerita berhasil dihapus' : `📱 Mode Offline - ${updatedStories.length} cerita tersimpan`;
        this.populateStoryList(message, updatedStories);
        showSuccess("Cerita berhasil dihapus dari perangkat!");

      } catch (error) {
        console.error("Failed to delete story locally:", error);
        showError("Gagal menghapus cerita: " + error.message);
        
        // Try to restore the story list since deletion failed
        try {
          const stories = await getAllStory();
          const message = navigator.onLine ? '' : `📱 Mode Offline - ${stories.length} cerita tersimpan`;
          this.populateStoryList(message, stories);
        } catch (restoreError) {
          console.error("Failed to restore story list:", restoreError);
        }
      } finally {
        // Re-enable button with original text
        deleteBtn.disabled = false;
        deleteBtn.textContent = originalText;
      }
    });
  }

  populateStoryList(message, stories) {
    console.log(`=== populateStoryList called ===`);
    console.log(`Message: "${message}"`);
    console.log(`Stories count: ${stories?.length || 0}`);
    
    const storyListEl = document.getElementById('story-list');
    if (!storyListEl) {
      console.error('Story list element not found');
      return;
    }

    if (!stories || stories.length === 0) {
      console.log('No stories provided - showing empty template');
      this.populateStoryListEmpty();
      return;
    }

    try {
      // Add message if provided
      let messageHtml = '';
      if (message) {
        const alertClass = message.includes('Offline') || message.includes('📱') ? 'alert-info' : 'alert-success';
        messageHtml = `<div class="data-source-info alert ${alertClass}" style="margin-bottom: 1rem; padding: 0.75rem; border-radius: 4px; text-align: center; font-weight: 500;">${message}</div>`;
      }

      const storiesHtml = stories.map((story, index) => {
        try {
          console.log(`Creating card for story ${index + 1}:`, story.id || 'no-id');
          return createStoryCard(story);
        } catch (cardError) {
          console.error('Error creating story card:', cardError, story);
          return `<div class="story-card error" style="padding: 1rem; border: 1px solid #ccc; margin-bottom: 1rem;">
            <h3>Error loading story</h3>
            <p>ID: ${story.id || 'unknown'}</p>
            <p>Error: ${cardError.message}</p>
          </div>`;
        }
      }).join('');

      storyListEl.innerHTML = messageHtml + storiesHtml;
      console.log('Story list HTML updated successfully');

      // Initialize maps in cards
      let mapInitCount = 0;
      stories.forEach(story => {
        try {
          if (story.lat && story.lon) {
            initStoryMapInCard(story);
            mapInitCount++;
          }
        } catch (mapError) {
          console.error('Error initializing map for story:', story.id, mapError);
        }
      });

      console.log(`Initialized ${mapInitCount} maps in story cards`);
      console.log('=== populateStoryList completed successfully ===');
    } catch (error) {
      console.error('Error populating story list:', error);
      this.populateStoryListError('Error displaying stories: ' + error.message);
    }
  }

  populateStoryListEmpty() {
    console.log('Populating empty story list template');
    const storyListEl = document.getElementById('story-list');
    if (storyListEl) {
      storyListEl.innerHTML = generateStoryListEmptyTemplate();
    }
  }

  populateStoryListError(message) {
    console.log('Populating error template with message:', message);
    const storyListEl = document.getElementById('story-list');
    if (storyListEl) {
      storyListEl.innerHTML = generateStoryListErrorTemplate(message);
    }
  }

  async initialMap(stories) {
    try {
      console.log(`Initializing map with ${stories.length} stories`);
      const map = initStoryMap('map');
      const storiesWithCoords = stories.filter((story) =>
        typeof story.lat === 'number' && typeof story.lon === 'number'
      );

      console.log(`${storiesWithCoords.length} stories have coordinates`);

      if (storiesWithCoords.length > 0) {
        const latitudes = storiesWithCoords.map((s) => s.lat);
        const longitudes = storiesWithCoords.map((s) => s.lon);

        const minLat = Math.min(...latitudes);
        const maxLat = Math.max(...latitudes);
        const minLon = Math.min(...longitudes);
        const maxLon = Math.max(...longitudes);

        const bounds = L.latLngBounds([minLat, minLon], [maxLat, maxLon]);
        map.fitBounds(bounds, { padding: [50, 50] });
      } else {
        // Default fallback ke Jakarta
        map.setView([-6.200000, 106.816666], 5);
      }

      this.addStoryMarkersToMap(map, storiesWithCoords);
      console.log('Map initialized successfully');
      return map;
    } catch (error) {
      console.error('Error initializing map:', error);
      throw error;
    }
  }

  addStoryMarkersToMap(map, stories) {
    let markerCount = 0;
    stories.forEach((story) => {
      try {
        if (story.lat && story.lon) {
          L.marker([story.lat, story.lon])
            .addTo(map)
            .bindPopup(`
              <strong>${story.name || 'Unknown'}</strong><br>
              ${story.description || 'No description'}<br>
              <small>${story.date ? new Date(story.date).toLocaleDateString() : 'No date'}</small><br>
              <small>Lokasi: ${story.lat.toFixed(4)}, ${story.lon.toFixed(4)}</small>
            `);
          markerCount++;
        }
      } catch (error) {
        console.error('Error adding marker for story:', story.id, error);
      }
    });
    console.log(`Added ${markerCount} markers to map`);
  }

  showMapLoading() {
    const loadingContainer = document.getElementById('map-loading-container');
    if (loadingContainer) {
      loadingContainer.innerHTML = generateLoaderAbsoluteTemplate();
    }
  }

  hideMapLoading() {
    const loadingContainer = document.getElementById('map-loading-container');
    if (loadingContainer) {
      loadingContainer.innerHTML = '';
    }
  }

  showLoading() {
    const loadingContainer = document.getElementById('story-list-loading-container');
    if (loadingContainer) {
      loadingContainer.innerHTML = generateLoaderAbsoluteTemplate();
    }
  }

  hideLoading() {
    const loadingContainer = document.getElementById('story-list-loading-container');
    if (loadingContainer) {
      loadingContainer.innerHTML = '';
    }
  }
}