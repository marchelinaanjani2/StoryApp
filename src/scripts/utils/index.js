export function showFormattedDate(date, locale = 'en-US', options = {}) {
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  });
}

export function sleep(time = 1000) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

export function showLoading() {
  document.getElementById('loading').style.display = 'block';
}

export function hideLoading() {
  document.getElementById('loading').style.display = 'none';
}

export function showSuccess(message) {
  const element = document.getElementById('success-message');
  if (element) {
    element.textContent = message;
    element.style.display = 'block';
    setTimeout(() => {
      element.style.display = 'none';
    }, 5000);
  }
}

export function setupSkipToContent(skipLink, getTargetElement, options = {}) {
  // Handle click event
  const handleSkip = (event) => {
    event.preventDefault();

    const targetElement = getTargetElement();
    if (!targetElement) {
      console.warn('[SKIP-TO-CONTENT] Target element tidak ditemukan!');
      return;
    }
    console.log('[SKIP-TO-CONTENT] Target element ditemukan:', targetElement.id);

    const focusEl = options.focusElementSelector
      ? targetElement.querySelector(options.focusElementSelector) || targetElement
      : targetElement;

    console.log('[SKIP-TO-CONTENT] Focus element:', focusEl.id || focusEl.tagName);

    // Set tabindex agar bisa difokus
    focusEl.setAttribute('tabindex', '-1');

    // Focus dengan slight delay untuk memastikan element sudah ready
    setTimeout(() => {
      focusEl.focus({ preventScroll: true });
      console.log('[SKIP-TO-CONTENT] Element focused successfully');
    }, 10);

    // Scroll ke target
    if (options.scrollBehavior) {
      targetElement.scrollIntoView({ behavior: options.scrollBehavior });
    } else {
      targetElement.scrollIntoView();
    }
  };

  // Add click listener
  skipLink.addEventListener('click', handleSkip);

  // Add keyboard listener for Enter/Space (jika pakai role="button")
  skipLink.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSkip(event);
    }
  });
}


export function showError(message) {
  const element = document.getElementById('error-message');
  if (element) {
    element.textContent = message;
    element.style.display = 'block';
    setTimeout(() => {
      element.style.display = 'none';
    }, 5000);
  }
}


export async function createCarousel(containerElement, options = {}) {
  const { tns } = await import('tiny-slider');

  return tns({
    container: containerElement,
    mouseDrag: true,
    swipeAngle: false,
    speed: 600,

    nav: true,
    navPosition: 'bottom',

    autoplay: false,
    controls: false,

    ...options,
  });
}

/**
 * Ref: https://stackoverflow.com/questions/18650168/convert-blob-to-base64
 */
export function convertBlobToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Ref: https://stackoverflow.com/questions/16245767/creating-a-blob-from-a-base64-string-in-javascript
 */
export function convertBase64ToBlob(base64Data, contentType = '', sliceSize = 512) {
  const byteCharacters = atob(base64Data);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);

    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: contentType });
}

export function convertBase64ToUint8Array(base64String) {
  // Ensure proper Base64 formatting
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  try {
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; i++) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  } catch (error) {
    console.error('Failed to convert Base64 to Uint8Array:', error);
    throw new Error('Invalid VAPID public key format');
  }
}



export function isServiceWorkerAvailable() {
  return 'serviceWorker' in navigator;
}

export async function registerServiceWorker() {
  if (!isServiceWorkerAvailable()) {
    console.log('Service Worker API unsupported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('Service worker telah terpasang', registration);
    console.log('SW registered with scope:', registration.scope);

    if (registration.installing) {
      console.log('SW installing');
      registration.installing.addEventListener('statechange', (e) => {
        console.log('SW state:', e.target.state);
      });
    } else if (registration.waiting) {
      console.log('SW waiting');
    } else if (registration.active) {
      console.log('SW active');
    }
    // Tambahkan event listener untuk message dari SW
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.type === 'STORIES_UPDATED') {

      }
    });

    return registration;
  } catch (error) {
    console.error('Failed to install service worker:', error);
  }
}

