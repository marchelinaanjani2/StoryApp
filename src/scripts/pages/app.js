import Database from './../data/database';
import { getActiveRoute } from '../routes/url-parser';
import {
  generateAuthenticatedNavigationListTemplate,
  generateMainNavigationListTemplate,
  generateUnauthenticatedNavigationListTemplate,
  generateUnsubscribeButtonTemplate,
  generateSubscribeButtonTemplate,
} from '../templates';
import { setupSkipToContent } from '../utils/index';
import { getAccessToken, getLogout } from '../utils/auth';
import { routes } from '../routes/routes';
import { isServiceWorkerAvailable } from '../utils';
import {
  isCurrentPushSubscriptionAvailable,
  subscribe,
  unsubscribe,
} from '../utils/notification-helper';


export default class App {
  #content;
  #skipLinkButton;
  #currentSkipRoute;

  constructor({ content, skipLinkButton }) {
    this.#content = content;
    this.#skipLinkButton = skipLinkButton;
    this.#currentSkipRoute = null;
    // this.#init();

    // Debug dan validasi
    console.log('[APP] Constructor - Content element:', this.#content);
    console.log('[APP] Constructor - Skip link button:', this.#skipLinkButton);

    if (!this.#skipLinkButton) {
      console.error('[APP] Skip link button is null! Skip-to-content functionality will be disabled.');
    }

    if (!this.#content) {
      console.error('[APP] Content element is null!');
    }
  }

  #setupNavigationList() {
    const isLogin = !!getAccessToken();
    const navListMain = document.getElementById('navlist-main');
    const navList = document.getElementById('navlist');

    if (!isLogin) {
      if (navListMain) navListMain.innerHTML = '';
      if (navList) navList.innerHTML = generateUnauthenticatedNavigationListTemplate();
      return;
    }

    // if (navListMain) navListMain.innerHTML = generateMainNavigationListTemplate();
    // if (navList) navList.innerHTML = generateAuthenticatedNavigationListTemplate();
    navListMain.innerHTML = generateMainNavigationListTemplate();
    navList.innerHTML = generateAuthenticatedNavigationListTemplate();

    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
      logoutButton.addEventListener('click', (event) => {
        event.preventDefault();

        if (confirm('Apakah Anda yakin ingin keluar?')) {
          getLogout();
          location.hash = '/login';
        }
      });
    }
  }

  async #setupPushNotification() {
    const pushNotificationTools = document.getElementById('push-notification-tools');
    const isSubscribed = await isCurrentPushSubscriptionAvailable();

    if (isSubscribed) {
      pushNotificationTools.innerHTML = generateUnsubscribeButtonTemplate();
      document.getElementById('unsubscribe-button').addEventListener('click', () => {
        unsubscribe().finally(() => {
          this.#setupPushNotification();
        });
      });

      return;
    }



    if (pushNotificationTools) {
      pushNotificationTools.innerHTML = generateSubscribeButtonTemplate();
    } else {
      console.warn('[PUSH] Element #push-notification-tools tidak ditemukan di halaman.');
    }

    document.getElementById('subscribe-button').addEventListener('click', () => {
      subscribe().finally(() => {
        this.#setupPushNotification();
      });
    });
  }



  async renderPage() {
    const url = getActiveRoute();
    console.log('[APP] Active route:', url);

    const route = routes[url];
    console.log('[APP] Route found:', route);

    if (!route) {
      console.log('[APP] Route not found, redirecting to login');
      location.hash = '/login';
      return;
    }

    const page = route();
    page.database = Database;

    if (document.startViewTransition) {
      document.startViewTransition(async () => {
        this.#content.innerHTML = await page.render();
        await page.afterRender();
        scrollTo({ top: 0, behavior: 'instant' });
        this.#setupNavigationList();

        if (url === '/stories' || url === '/') {
          this.#setupOfflineStories();
        }


        // Setup skip-to-content SETELAH DOM ready dengan delay
        setTimeout(() => {
          console.log('[APP] Setting up skip link for route:', url);
          this.#setupSkipToContentDynamic(url);
        }, 50);
      });
    } else {
      this.#content.innerHTML = await page.render();
      await page.afterRender();
      scrollTo({ top: 0, behavior: 'instant' });
      this.#setupNavigationList();

      // Setup offline stories jika diperlukan
      if (url === '/stories' || url === '/') {
        this.#setupOfflineStories();
      }

      // Setup skip-to-content SETELAH DOM ready dengan delay
      setTimeout(() => {
        console.log('[APP] Setting up skip link for route:', url);
        this.#setupSkipToContentDynamic(url);
      }, 50);
    }
  }

  async #setupOfflineStories() {
    try {
      const stories = await Database.getAllStories();
      const offlineStoriesContainer = document.getElementById('offline-stories-container');

      if (offlineStoriesContainer) {
        if (stories.length > 0) {
          offlineStoriesContainer.innerHTML = stories.map(story => `
            <div class="story-card">
              <h3>${story.title || 'Untitled Story'}</h3>
              <p>${story.description || ''}</p>
              <small>Saved offline on ${new Date(story.createdAt).toLocaleString()}</small>
              <button class="delete-offline-story" data-id="${story.id}">Delete</button>
            </div>
          `).join('');

          // Tambahkan event listener untuk tombol delete
          document.querySelectorAll('.delete-offline-story').forEach(button => {
            button.addEventListener('click', async (e) => {
              const id = e.target.dataset.id;
              if (confirm('Delete this offline story?')) {
                await Database.deleteStory(id);
                this.#setupOfflineStories(); // Refresh list
              }
            });
          });
        } else {
          offlineStoriesContainer.innerHTML = '<p>No offline stories saved yet.</p>';
        }
      }
    } catch (error) {
      console.error('Error loading offline stories:', error);
    }
  }


  #setupSkipToContentDynamic(currentRoute) {
    console.log('[SKIP-TO-CONTENT] setupSkipToContentDynamic called with route:', currentRoute);

    // Cegah setup berulang untuk route yang sama
    if (this.#currentSkipRoute === currentRoute) {
      console.log('[SKIP-TO-CONTENT] Route sama, skip setup');
      return;
    }

    this.#currentSkipRoute = currentRoute;

    let targetId, focusSelector, linkText;

    switch (currentRoute) {
      case '/':
        targetId = 'main-content';
        focusSelector = '#main-content';
        linkText = 'Lewati ke konten utama';
        break;
      case '/add':
        targetId = 'story-form';
        focusSelector = '#story-form';
        linkText = 'Lewati ke form cerita';
        break;
      default:
        targetId = 'main-content';
        focusSelector = '#main-content';
        linkText = 'Lewati ke konten utama';
        break;
    }

    // Update href dan text
    this.#skipLinkButton.setAttribute('href', `#${targetId}`);
    this.#skipLinkButton.textContent = linkText;

    // Remove existing event listeners dengan clone & replace
    const newSkipLink = this.#skipLinkButton.cloneNode(true);
    this.#skipLinkButton.replaceWith(newSkipLink);
    this.#skipLinkButton = newSkipLink;

    console.log('[SKIP-TO-CONTENT] Setup untuk route:', currentRoute, 'target:', targetId);

    // Setup event listener baru
    setupSkipToContent(
      this.#skipLinkButton,
      () => {
        const element = document.getElementById(targetId);
        console.log('[SKIP-TO-CONTENT] Getting target element:', element ? element.id : 'NOT FOUND');
        return element;
      },
      {
        focusElementSelector: focusSelector,
        scrollBehavior: 'smooth',
      }
    );
  }

}