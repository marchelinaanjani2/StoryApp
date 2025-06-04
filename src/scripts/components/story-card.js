// story-card.js
import { showFormattedDate } from '../utils';
import { getStoryById } from '../data/api.js';

// Komponen HTML
export function createStoryCard(story) {
  return `
    <div class="story-card" data-story-id="${story.id}">
      <img class="story-image" src="${story.photoUrl}" alt="${story.name}" loading="lazy">
      <div class="story-content">
        <h3 class="story-title">${story.name}</h3>
        <p class="story-description">${story.description}</p>
        <div class="story-meta">
          <span class="story-date">
            <i class="fas fa-calendar-alt"></i>
            ${showFormattedDate(story.createdAt, 'id-ID')}
          </span>
          ${story.lat && story.lon ? `
            <span class="story-location">
              <i class="fas fa-map-marker-alt"></i>
              ${story.lat.toFixed(4)}, ${story.lon.toFixed(4)}
            </span>
          ` : ''}
        </div>
        <div class="story-actions">
          <button class="btn story-read-more" data-story-id="${story.id}">
            Selengkapnya <i class="fas fa-arrow-right"></i>
          </button>
          <button class="btn btn-danger story-delete" data-story-id="${story.id}">
            Hapus <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>

      ${story.lat && story.lon ? `
        <div class="story-map-container">
          <div id="story-map-${story.id}" class="story-map"></div>
        </div>
      ` : ''}
    </div>
  `;
}
