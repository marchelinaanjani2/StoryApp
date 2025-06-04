import '../styles/styles.css';
import '../styles/responsives.css';
import 'tiny-slider/dist/tiny-slider.css';
import { isNotificationAvailable, requestNotificationPermission } from './utils/notification-helper';
import App from './pages/app';
import Camera from './utils/camera';
import { registerServiceWorker } from './utils';


function handleSkipLink() {
  const contentElement = document.getElementById('main-content');
  let skipLinkElement = document.querySelector('.skip-link') || 
                       document.querySelector('a[href*="skip"]');

  if (!skipLinkElement) {
    console.warn('Skip link element tidak ditemukan, membuat secara dinamis');
    skipLinkElement = document.createElement('a');
    skipLinkElement.href = '#main-content';
    skipLinkElement.className = 'skip-link';
    skipLinkElement.textContent = 'Lewati ke konten utama';
    document.body.insertBefore(skipLinkElement, document.body.firstChild);
  }

  if (contentElement) {
    skipLinkElement.addEventListener('click', (e) => {
      e.preventDefault();
      contentElement.focus();
    });
  }
}


function handlePWAInstallation() {
  let deferredPrompt;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    

    if (!window.matchMedia('(display-mode: standalone)').matches) {
      const installButton = document.createElement('button');
      installButton.textContent = 'Install Aplikasi';
      installButton.className = 'install-button';
      installButton.style.position = 'fixed';
      installButton.style.bottom = '20px';
      installButton.style.right = '20px';
      installButton.style.zIndex = '9999';
      document.body.appendChild(installButton);

      installButton.addEventListener('click', () => {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User menginstall aplikasi');
          }
          installButton.remove();
        });
      });
    }
  });
}

// Fungsi untuk memeriksa status offline
function checkOfflineStatus() {
  const offlineBanner = document.createElement('div');
  offlineBanner.className = 'offline-banner';
  offlineBanner.textContent = 'Anda sedang offline';
  offlineBanner.style.display = 'none';
  document.body.appendChild(offlineBanner);

  function updateStatus() {
    if (!navigator.onLine) {
      offlineBanner.style.display = 'block';
    } else {
      offlineBanner.style.display = 'none';
    }
  }

  window.addEventListener('online', updateStatus);
  window.addEventListener('offline', updateStatus);
  updateStatus();
}

document.addEventListener('DOMContentLoaded', async () => {
  // Inisialisasi fitur aksesibilitas
  handleSkipLink();
  
  // Inisialisasi PWA
  handlePWAInstallation();
  checkOfflineStatus();

  // Inisialisasi aplikasi utama
  const contentElement = document.getElementById('main-content');


  const app = new App({
    content: contentElement
  });

  await app.renderPage();

  try {
    await registerServiceWorker();
    console.log('Service Worker terdaftar');
  } catch (error) {
    console.error('Gagal mendaftarkan Service Worker:', error);
  }

  // Permintaan notifikasi
  if (isNotificationAvailable()) {
    await requestNotificationPermission();
  }

  // Handle perubahan hash
  window.addEventListener('hashchange', async () => {
    await app.renderPage();
    Camera.stopAllStreams();
  });
});