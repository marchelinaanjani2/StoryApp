export default class AddPresenter {
  #view;
  #model;

  constructor({ view, model }) {
    this._view = view;
    this._model = model;

    this.postNewStory = this.postNewStory.bind(this);
  }

  async showNewFormMap() {
    this.#view.showMapLoading();
    try {
      await this.#view.initialMap();
    } catch (error) {
      console.error('showNewFormMap: error:', error);
    } finally {
      this.#view.hideMapLoading();
    }
  }

    async postNewStory(storyData) {
    try {
       if (this._view?.showSubmitLoadingButton) {
        this._view.showSubmitLoadingButton();
      }
      

      const response = await this._model.addStory(storyData);

       if (response.ok) {
        if (this._view?.storeSuccessfully) {
          this._view.storeSuccessfully('Cerita berhasil ditambahkan!');
        }
      } else {
        if (this._view?.storeFailed) {
          this._view.storeFailed(response.message || 'Gagal menambahkan cerita');
        }
      }
    } catch (error) {
      console.error('postNewStory error:', error);
      if (this._view?.storeFailed) {
        this._view.storeFailed(error.message);
      }
    } finally {
      if (this._view?.hideSubmitLoadingButton) {
        this._view.hideSubmitLoadingButton();
      }
    }
  }
}
