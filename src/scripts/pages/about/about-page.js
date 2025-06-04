export default class AboutPage {
  async render() {
    return '';
  }

  async afterRender() {
    alert('Aplikasi Berbagi Cerita adalah platform untuk berbagi pengalaman dan cerita menarik dari berbagai tempat di dunia.');

    location.href = '#/';
  }
}