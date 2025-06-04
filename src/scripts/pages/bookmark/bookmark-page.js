import {
  generateLoaderAbsoluteTemplate,
  generateStoryItemTemplate,
  generateStoryListEmptyTemplate,
  generateStoryListErrorTemplate,
} from '../../templates';
import BookmarkPresenter from './bookmark-presenter';
import Database from '../../data/database';
import Map from '../../utils/map';

export default class BookmarkPage {
  #presenter = null;
  #map = null;

  async render() {
    return `
      <section>
        <div class="story-list__map__container">
          <div id="map" class="story-list__map"></div>
          <div id="map-loading-container"></div>
        </div>
      </section>

      <section class="container">
        <h1 class="section-title">Daftar Cerita Tersimpan</h1>

        <div class="story-list__container">
          <div id="story-list"></div>
          <div id="story-list-loading-container"></div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    this.#presenter = new BookmarkPresenter({
      view: this,
      model: Database,
    });

    await this.#presenter.initialGalleryAndMap();
  }

  populateBookmarkedStory(message, story) {
    if (story.length <= 0) {
      this.populateBookmarkedStoryListEmpty();
      return;
    }

    const html = stroy.reduce((accumulator, story) => {
      if (this.#map) {
        const coordinate = [story.location.latitude, story.location.longitude];
        const markerOptions = { alt: story.title };
        const popupOptions = { content: story.title };

        this.#map.addMarker(coordinate, markerOptions, popupOptions);
      }

      return accumulator.concat(
        generateStoryItemTemplate({
          ...story,
          placeNameLocation: story.location.placeName,
        }),
      );
    }, '');

    document.getElementById('story-list').innerHTML = `
      <div class="story-list">${html}</div>
    `;
  }

  populateBookmarkedStoryListEmpty() {
    document.getElementById('story-list').innerHTML = generateStoryListEmptyTemplate();
  }

  populateBookmarkedStoryError(message) {
    document.getElementById('story-list').innerHTML = generateStoryListErrorTemplate(message);
  }

  showStoryListLoading() {
    document.getElementById('story-list-loading-container').innerHTML =
      generateLoaderAbsoluteTemplate();
  }

  hideStoryListLoading() {
    document.getElementById('story-list-loading-container').innerHTML = '';
  }

  async initialMap() {
    this.#map = await Map.build('#map', {
      zoom: 10,
      locate: true,
    });
  }

  showMapLoading() {
    document.getElementById('map-loading-container').innerHTML = generateLoaderAbsoluteTemplate();
  }

  hideMapLoading() {
    document.getElementById('map-loading-container').innerHTML = '';
  }
}
