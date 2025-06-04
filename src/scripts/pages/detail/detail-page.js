import { initStoryMap } from '../../components/story-map';
import {
  generateLoaderAbsoluteTemplate,
  generateStoryDetailErrorTemplate,
  generateStoryDetailTemplate,
  generateRemoveStoryButtonTemplate,
  generateSaveStoryButtonTemplate,
  generateSubscribeButtonTemplate,
  generateUnsubscribeButtonTemplate
} from '../../templates';
import { createCarousel } from '../../utils';
import StoryDetailPresenter from './detail-presenter';
import { parseActivePathname } from '../../routes/url-parser';
import * as StoryAPI from '../../data/api';
import Database from '../../data/database';

export default class DetailStoryPage {
  #presenter = null;
  #form = null;
  #map = null;
  #isSubscribed = false;
  #isBookmarked = false;

  async render() {
    return `
      <section>
        <div class="story-detail__container">
          <div id="story-detail" class="story-detail"></div>
          <div id="story-detail-loading-container"></div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    this.#presenter = new StoryDetailPresenter(parseActivePathname().id, {
      view: this,
      apiModel: StoryAPI,
      dbModel: Database,
    });

    await this.#presenter.showStoryDetail();
    
    // Check initial states
    await this.#checkBookmarkStatus();
    await this.#checkSubscriptionStatus();
  }

  async populateStoryDetailAndInitialMap(message, story) {
    document.getElementById('story-detail').innerHTML = generateStoryDetailTemplate({
      title: story.name || story.title,
      description: story.description,
      evidenceImages: story.photoUrl ? [story.photoUrl] : (story.Image || []),
      latitudeLocation: story.lat || story.location?.latitude,
      longitudeLocation: story.lon || story.location?.longitude,
      storyerName: story.user?.name || story.storyer?.name || 'Unknown',
      createdAt: story.createdAt,
    });

    // Initialize carousel if multiple images
    const imagesContainer = document.getElementById('images');
    if (imagesContainer) {
      createCarousel(imagesContainer);
    }

    // Initialize map
    await this.#initializeDetailMap(story);

    // Initialize all action buttons
    await this.#initializeActionButtons();
  }

  async #initializeDetailMap(story) {
    const lat = story.lat || story.location?.latitude;
    const lon = story.lon || story.location?.longitude;
    
    if (lat && lon) {
      try {
        const map = initStoryMap('map');
        
        const marker = L.marker([lat, lon])
          .addTo(map)
          .bindPopup(`
            <div class="story-popup-detail">
              <strong>${story.name || story.title}</strong><br>
              <small>Lat: ${lat.toFixed(6)}, Lng: ${lon.toFixed(6)}</small>
            </div>
          `)
          .openPopup();

        map.setView([lat, lon], 15);
        this.#map = map;
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    }
  }

  async #initializeActionButtons() {
    // Initialize save/remove button
    await this.#renderBookmarkButton();
    
    // Initialize subscribe/unsubscribe button
    await this.#renderSubscriptionButton();
    
    // Initialize notification button
    this.#initializeNotificationButton();
  }

  async #checkBookmarkStatus() {
    try {
      const storyId = parseActivePathname().id;
      const bookmarkedStories = await Database.getAllBookmarkedStories();
      this.#isBookmarked = bookmarkedStories.some(story => story.id === storyId);
    } catch (error) {
      console.error('Error checking bookmark status:', error);
      this.#isBookmarked = false;
    }
  }

  async #checkSubscriptionStatus() {
    // Implement your subscription check logic here
    // This is a placeholder - replace with actual subscription check
    try {
      // Example: check if user is subscribed to notifications for this story
      this.#isSubscribed = localStorage.getItem(`subscribed_${parseActivePathname().id}`) === 'true';
    } catch (error) {
      console.error('Error checking subscription status:', error);
      this.#isSubscribed = false;
    }
  }

  async #renderBookmarkButton() {
    const container = document.getElementById('save-actions-container');
    if (!container) return;

    if (this.#isBookmarked) {
      container.innerHTML = generateRemoveStoryButtonTemplate();
      this.#attachRemoveBookmarkListener();
    } else {
      container.innerHTML = generateSaveStoryButtonTemplate();
      this.#attachSaveBookmarkListener();
    }
  }

  async #renderSubscriptionButton() {
    const container = document.getElementById('subscribe-actions-container');
    if (!container) {
      // Create container if it doesn't exist
      const actionsContainer = document.querySelector('.story-detail__actions__buttons');
      if (actionsContainer) {
        const subscribeContainer = document.createElement('div');
        subscribeContainer.id = 'subscribe-actions-container';
        subscribeContainer.style.marginTop = '1rem';
        actionsContainer.insertBefore(subscribeContainer, document.getElementById('notify-me-actions-container'));
      }
    }

    const subscribeContainer = document.getElementById('subscribe-actions-container');
    if (!subscribeContainer) return;

    if (this.#isSubscribed) {
      subscribeContainer.innerHTML = generateUnsubscribeButtonTemplate();
      this.#attachUnsubscribeListener();
    } else {
      subscribeContainer.innerHTML = generateSubscribeButtonTemplate();
      this.#attachSubscribeListener();
    }
  }

  #attachSaveBookmarkListener() {
    const saveButton = document.getElementById('story-detail-save');
    if (saveButton) {
      saveButton.addEventListener('click', async () => {
        try {
          await this.#presenter.saveStory();
          this.#isBookmarked = true;
          await this.#renderBookmarkButton();
          this.saveToBookmarkSuccessfully('Story berhasil disimpan ke bookmark!');
        } catch (error) {
          this.saveToBookmarkFailed('Gagal menyimpan story ke bookmark');
        }
      });
    }
  }

  #attachRemoveBookmarkListener() {
    const removeButton = document.getElementById('story-detail-remove');
    if (removeButton) {
      removeButton.addEventListener('click', async () => {
        try {
          await this.#presenter.removeStory();
          this.#isBookmarked = false;
          await this.#renderBookmarkButton();
          this.removeFromBookmarkSuccessfully('Story berhasil dihapus dari bookmark!');
        } catch (error) {
          this.removeFromBookmarkFailed('Gagal menghapus story dari bookmark');
        }
      });
    }
  }

  #attachSubscribeListener() {
    const subscribeButton = document.getElementById('subscribe-button');
    if (subscribeButton) {
      subscribeButton.addEventListener('click', async () => {
        try {
          // Implement your subscription logic here
          await this.#subscribeToStory();
          this.#isSubscribed = true;
          await this.#renderSubscriptionButton();
          this.#showSuccessMessage('Berhasil berlangganan notifikasi untuk story ini!');
        } catch (error) {
          this.#showErrorMessage('Gagal berlangganan notifikasi');
        }
      });
    }
  }

  #attachUnsubscribeListener() {
    const unsubscribeButton = document.getElementById('unsubscribe-button');
    if (unsubscribeButton) {
      unsubscribeButton.addEventListener('click', async () => {
        try {
          // Implement your unsubscription logic here
          await this.#unsubscribeFromStory();
          this.#isSubscribed = false;
          await this.#renderSubscriptionButton();
          this.#showSuccessMessage('Berhasil berhenti berlangganan notifikasi!');
        } catch (error) {
          this.#showErrorMessage('Gagal berhenti berlangganan notifikasi');
        }
      });
    }
  }

  #initializeNotificationButton() {
    const notifyButton = document.getElementById('story-detail-notify-me');
    if (notifyButton) {
      notifyButton.addEventListener('click', async () => {
        try {
          // Test notification
          if ('Notification' in window) {
            if (Notification.permission === 'granted') {
              new Notification('Test Notification', {
                body: 'Ini adalah test notifikasi untuk story ini!',
                icon: '/images/icon-192x192.png'
              });
            } else if (Notification.permission !== 'denied') {
              const permission = await Notification.requestPermission();
              if (permission === 'granted') {
                new Notification('Test Notification', {
                  body: 'Notifikasi berhasil diaktifkan!',
                  icon: '/images/icon-192x192.png'
                });
              }
            }
          }
        } catch (error) {
          console.error('Error with notification:', error);
        }
      });
    }
  }

  async #subscribeToStory() {
    // Implement actual subscription logic
    const storyId = parseActivePathname().id;
    localStorage.setItem(`subscribed_${storyId}`, 'true');
    
    // You can also make API call here if needed
    // await StoryAPI.subscribeToStory(storyId);
  }

  async #unsubscribeFromStory() {
    // Implement actual unsubscription logic
    const storyId = parseActivePathname().id;
    localStorage.removeItem(`subscribed_${storyId}`);
    
    // You can also make API call here if needed
    // await StoryAPI.unsubscribeFromStory(storyId);
  }

  #showSuccessMessage(message) {
    // You can implement toast notification or use alert
    const toast = this.#createToast(message, 'success');
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  #showErrorMessage(message) {
    // You can implement toast notification or use alert
    const toast = this.#createToast(message, 'error');
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  #createToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      z-index: 1000;
      animation: slideIn 0.3s ease;
      background-color: ${type === 'success' ? '#4CAF50' : '#f44336'};
    `;
    return toast;
  }

  populateStoryDetailError(message) {
    document.getElementById('story-detail').innerHTML = generateStoryDetailErrorTemplate(message);
  }

  saveToBookmarkSuccessfully(message) {
    this.#showSuccessMessage(message);
  }

  saveToBookmarkFailed(message) {
    this.#showErrorMessage(message);
  }

  removeFromBookmarkSuccessfully(message) {
    this.#showSuccessMessage(message);
  }

  removeFromBookmarkFailed(message) {
    this.#showErrorMessage(message);
  }

  showStoryDetailLoading() {
    document.getElementById('story-detail-loading-container').innerHTML = generateLoaderAbsoluteTemplate();
  }

  hideStoryDetailLoading() {
    document.getElementById('story-detail-loading-container').innerHTML = '';
  }

  showMapLoading() {
    document.getElementById('map-loading-container').innerHTML = generateLoaderAbsoluteTemplate();
  }

  hideMapLoading() {
    document.getElementById('map-loading-container').innerHTML = '';
  }
}