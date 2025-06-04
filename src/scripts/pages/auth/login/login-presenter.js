export default class LoginPresenter {
  #view;
  #model;
  #authModel;

  constructor({ view, model, authModel }) {
    this.#view = view;
    this.#model = model;
    this.#authModel = authModel;
  }

  async getLogin({ email, password }) {
    this.#view.showSubmitLoadingButton();
    try {
      const response = await this.#model.getLogin({ email, password });

      if (!response.ok) {
        console.error('getLogin: response:', response);
        this.#view.loginFailed(response.message);
        return;
      }

      const token = response.loginResult?.token;

      if (!token) {
        console.error('Token tidak ditemukan di response:', response);
        this.#view.loginFailed('Login gagal. Token tidak tersedia.');
        return;
      }

      this.#authModel.putAccessToken(token);

      this.#view.loginSuccessfully(response.message, response.loginResult);
    } catch (error) {
      console.error('getLogin: error:', error);
      this.#view.loginFailed(error.message);
    } finally {
      this.#view.hideSubmitLoadingButton();
    }
  }
}
