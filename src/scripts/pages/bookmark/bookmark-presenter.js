import { storyMapper } from '../../data/api-mapper';

export default class BookmarkPresenter {
  #view;
  #model;

  constructor({ view, model }) {
    this.#view = view;
    this.#model = model;
  }

  async showStoryListMap() {
    this.#view.showMapLoading();
    try {
      await this.#view.initialMap();
    } catch (error) {
      console.error('showStoryListMap: error:', error);
    } finally {
      this.#view.hideMapLoading();
    }
  }

  async initialGalleryAndMap() {
    this.#view.showStoryListLoading();

    try {
      await this.showStoryListMap();

      const listOfStory = await this.#model.getAllStorys();
      const story = await Promise.all(listOfStory.map(storyMapper));

      const message = 'Berhasil mendapatkan daftar cerita tersimpan.';
      this.#view.populateBookmarkedStory(message, story);
    } catch (error) {
      console.error('initialGalleryAndMap: error:', error);
      this.#view.populateBookmarkedStoryError(error.message);
    } finally {
      this.#view.hideStoryListLoading();
    }
  }
}
