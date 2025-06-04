import { showFormattedDate } from './utils';

export function generateLoaderTemplate() {
  return `
    <div class="loader"></div>
  `;
}

export function generateLoaderAbsoluteTemplate() {
  return `
    <div class="loader loader-absolute"></div>
  `;
}

export function generateMainNavigationListTemplate() {
  return `
    <li><a id="story-list-button" class="story-list-button" href="#/">Daftar Story</a></li>
  `;
}

export function generateUnauthenticatedNavigationListTemplate() {
  return `
    <li id="push-notification-tools" class="push-notification-tools"></li>
    <li><a id="login-button" href="#/login">Login</a></li>
    <li><a id="register-button" href="#/register">Register</a></li>
  `;
}

export function generateAuthenticatedNavigationListTemplate() {
  return `
    <li id="push-notification-tools" class="push-notification-tools"></li>
    <li><a id="new-report-button" class="btn new-report-button" href="#/new">Buat Laporan <i class="fas fa-plus"></i></a></li>
    <li><a id="logout-button" class="logout-button" href="#/logout"><i class="fas fa-sign-out-alt"></i> Logout</a></li>
  `;
}

export function generateStoryListEmptyTemplate() {
  return `
    <div id="story-list-empty" class="story-list__empty">
      <h2>Tidak ada cerita yang tersedia</h2>
      <p>Saat ini, tidak ada cerita yang dapat ditampilkan.</p>
    </div>
  `;
}

export function generateStoryListErrorTemplate(message) {
  return `
    <div id="story-list-error" class="story-list__error">
      <h2>Terjadi kesalahan pengambilan daftar cerita</h2>
      <p>${message ? message : 'Gunakan jaringan lain atau laporkan error ini.'}</p>
    </div>
  `;
}

export function generateStoryDetailErrorTemplate(message) {
  return `
    <div id="story-detail-error" class="story-detail__error">
      <h2>Terjadi kesalahan pengambilan detail cerita</h2>
      <p>${message ? message : 'Gunakan jaringan lain atau laporkan error ini.'}</p>
    </div>
  `;
}

export function generateStoryItemTemplate({
  id,
  name, 
  description,
  photoUrl, 
  createdAt,
  location, 
}) {
  return `
    <div tabindex="0" class="story-item" data-storyid="${id}">
      <img class="story-item__image" src="${photoUrl}" alt="${name}">
      <div class="story-item__body">
        <div class="story-item__main">
          <h2 id="story-title" class="story-item__title">${name}</h2>
          <div class="story-item__more-info">
            <div class="story-item__createdat">
              <i class="fas fa-calendar-alt"></i> ${showFormattedDate(createdAt, 'id-ID')}
            </div>
            ${location ? `
            <div class="story-item__location">
              <i class="fas fa-map"></i> ${location.latitude}, ${location.longitude}
            </div>
            ` : ''}
          </div>
        </div>
        <div id="story-description" class="story-item__description">
          ${description}
        </div>
        <a class="btn story-item__read-more" href="#/storys/${id}">
          Selengkapnya <i class="fas fa-arrow-right"></i>
        </a>
      </div>
    </div>
  `;
}







export function generateStoryDetailTemplate({
  title,
  description,
  evidenceImages,
  latitudeLocation,
  longitudeLocation,
  storyerName,
  createdAt,
}) {
  const createdAtFormatted = showFormattedDate(createdAt, 'id-ID');
  
  // Handle images - make sure it's always an array
  const images = Array.isArray(evidenceImages) ? evidenceImages : [evidenceImages].filter(Boolean);
  const imagesHtml = images.map(image => 
    generateStoryDetailImageTemplate(image, title)
  ).join('');

  return `
    <div class="story-detail__header">
      <h1 id="title" class="story-detail__title">${title}</h1>

      <div class="story-detail__more-info">
        <div class="story-detail__more-info__inline">
          <div id="createdat" class="story-detail__createdat" data-value="${createdAtFormatted}">
            <i class="fas fa-calendar-alt"></i> ${createdAtFormatted}
          </div>
        </div>
        ${latitudeLocation && longitudeLocation ? `
        <div class="story-detail__more-info__inline">
          <div id="location-latitude" class="story-detail__location__latitude" data-value="${latitudeLocation}">
            <i class="fas fa-map-marker-alt"></i> Latitude: ${latitudeLocation}
          </div>
          <div id="location-longitude" class="story-detail__location__longitude" data-value="${longitudeLocation}">
            Longitude: ${longitudeLocation}
          </div>
        </div>
        ` : ''}
        <div id="author" class="story-detail__author" data-value="${storyerName}">
          <i class="fas fa-user"></i> Dilaporkan oleh: ${storyerName}
        </div>
      </div>
    </div>

    ${imagesHtml ? `
    <div class="container">
      <div class="story-detail__images__container">
        <div id="images" class="story-detail__images">${imagesHtml}</div>
      </div>
    </div>
    ` : ''}

    <div class="container">
      <div class="story-detail__body">
        <div class="story-detail__body__description__container">
          <h2 class="story-detail__description__title">Informasi Lengkap</h2>
          <div id="description" class="story-detail__description__body">
            ${description}
          </div>
        </div>
        
        ${latitudeLocation && longitudeLocation ? `
        <div class="story-detail__body__map__container">
          <h2 class="story-detail__map__title">Peta Lokasi</h2>
          <div class="story-detail__map__container">
            <div id="map" class="story-detail__map"></div>
            <div id="map-loading-container"></div>
          </div>
        </div>
        ` : ''}
  
        <hr>
  
        <div class="story-detail__body__actions__container">
          <h2>Aksi</h2>
          <div class="story-detail__actions__buttons">
            <div class="action-group">
              <h3>Bookmark</h3>
              <div id="save-actions-container"></div>
            </div>
            
            <div class="action-group">
              <h3>Langganan</h3>
              <div id="subscribe-actions-container"></div>
            </div>
            
            <div class="action-group">
              <h3>Notifikasi</h3>
              <div id="notify-me-actions-container">
                <button id="story-detail-notify-me" class="btn btn-transparent">
                  <i class="far fa-bell"></i> Test Notifikasi
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function generateStoryDetailImageTemplate(imageUrl = null, alt = '') {
  if (!imageUrl) {
    return `
      <img class="story-detail__image" src="images/placeholder-image.jpg" alt="Placeholder Image">
    `;
  }

  return `
    <img class="story-detail__image" src="${imageUrl}" alt="${alt}">
  `;
}

export function generateSubscribeButtonTemplate() {
  return `
    <button id="subscribe-button" class="btn btn-primary">
      <i class="fas fa-bell"></i> Subscribe
    </button>
  `;
}

export function generateUnsubscribeButtonTemplate() {
  return `
    <button id="unsubscribe-button" class="btn btn-secondary">
      <i class="fas fa-bell-slash"></i> unsubscribe
    </button>
  `;
}

export function generateSaveStoryButtonTemplate() {
  return `
    <button id="story-detail-save" class="btn btn-primary">
      <i class="far fa-bookmark"></i> Simpan ke Bookmark
    </button>
  `;
}

export function generateRemoveStoryButtonTemplate() {
  return `
    <button id="story-detail-remove" class="btn btn-danger">
      <i class="fas fa-bookmark"></i> Hapus dari Bookmark
    </button>
  `;
}