import { initStoryMap } from '../../components/story-map';
import AddPresenter from './add-story-presenter';
import { convertBase64ToBlob } from '../../utils';
import * as StoryAPI from '../../data/api';
import { generateLoaderAbsoluteTemplate } from '../../templates';

export default class AddStoryPage {
  #presenter;
  #form;
  #isCameraOpen = false;
  #currentStream = null;
  #capturedPhoto = null;
  #selectedLat = null;
  #selectedLon = null;
  #takenDocumentations = [];

  // Main render method
  async render() {
    return `
      <section id="add-story" tabindex="-1" class="page" style="padding: 20px; max-width: 800px; margin: 0 auto;">
        <h2 style="color: #333; margin-bottom: 20px;">
          <i class="fas fa-plus-circle"></i> Tambah Cerita Baru
        </h2>
        
        ${this.#renderMessages()}
        
        <form id="story-form" tabindex="-1" style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          ${this.#renderStoryNameField()}
          ${this.#renderStoryDescriptionField()}
          ${this.#renderCameraSection()}
          ${this.#renderMapSection()}
          
          <button type="submit" style="width: 100%; padding: 12px; background: #007bff; color: white; border: none; border-radius: 4px; font-size: 16px; cursor: pointer;">
            <i class="fas fa-paper-plane"></i> Kirim Cerita
          </button>
        </form>
      </section>
    `;
  }

  // Helper methods for rendering sections
  #renderMessages() {
    return `
      <div class="success-message" id="success-message" style="display: none; background: #d4edda; color: #155724; padding: 12px; border-radius: 4px; margin-bottom: 15px;">
        <i class="fas fa-check-circle"></i> <span id="success-text">Cerita berhasil ditambahkan!</span>
      </div>
      
      <div class="error-message" id="error-message" style="display: none; background: #f8d7da; color: #721c24; padding: 12px; border-radius: 4px; margin-bottom: 15px;">
        <i class="fas fa-exclamation-triangle"></i> <span id="error-text">Terjadi kesalahan saat menambahkan cerita.</span>
      </div>
    `;
  }

  #renderStoryNameField() {
    return `
      <div style="margin-bottom: 20px;">
        <label for="story-name" style="display: block; margin-bottom: 8px; font-weight: bold;">
          <i class="fas fa-heading"></i> Judul Cerita *
        </label>
        <input 
          type="text" 
          id="story-name" 
          name="name" 
          required 
          style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 16px;"
          placeholder="Masukkan judul cerita Anda"
        >
        <small style="color: #666; font-size: 14px;">Masukkan judul yang menarik untuk cerita Anda</small>
      </div>
    `;
  }

  #renderStoryDescriptionField() {
    return `
      <div style="margin-bottom: 20px;">
        <label for="story-description" style="display: block; margin-bottom: 8px; font-weight: bold;">
          <i class="fas fa-align-left"></i> Deskripsi Cerita *
        </label>
        <textarea 
          id="story-description" 
          name="description" 
          required 
          rows="4"
          style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 16px; resize: vertical;"
          placeholder="Ceritakan pengalaman Anda dengan detail"
        ></textarea>
        <small style="color: #666; font-size: 14px;">Ceritakan pengalaman Anda dengan detail</small>
      </div>
    `;
  }

  #renderCameraSection() {
    return `
      <div style="margin-bottom: 20px; border: 1px solid #eee; padding: 15px; border-radius: 4px;">
        <h3 style="margin: 0 0 15px 0; color: #333;">
          <i class="fas fa-camera"></i> Ambil Foto *
        </h3>
        <video 
          id="video" 
          autoplay 
          muted 
          style="width: 100%; max-width: 400px; height: auto; border: 1px solid #ddd; border-radius: 4px; display: block; margin-bottom: 10px;"
        ></video>
        <canvas id="canvas" style="display: none;"></canvas>
        
        <div style="margin-bottom: 10px;">
          <button type="button" id="start-camera" style="margin-right: 10px; padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">
            <i class="fas fa-video"></i> Mulai Kamera
          </button>
          <button type="button" id="capture-photo" disabled style="margin-right: 10px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
            <i class="fas fa-camera"></i> Ambil Foto
          </button>
          <button type="button" id="stop-camera" disabled style="padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
            <i class="fas fa-stop"></i> Hentikan Kamera
          </button>
        </div>
        
        <div id="photo-preview" style="display: none; margin-top: 10px;">
          <img id="preview-image" style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        
        <small style="color: #666; font-size: 14px;">Foto diperlukan untuk mengirim cerita</small>
      </div>
    `;
  }

  #renderMapSection() {
    return `
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; font-weight: bold;">
          <i class="fas fa-map-marker-alt"></i> Pilih Lokasi di Peta *
        </label>
        <div 
          id="map" 
          style="height: 400px; border: 1px solid #ddd; border-radius: 4px; background: #f8f9fa;"
        ></div>
        <p id="selected-location" style="margin-top: 8px; color: #666; font-size: 14px;">
          Klik pada peta untuk memilih lokasi
        </p>
        <small style="color: #666; font-size: 14px;">Lokasi diperlukan untuk mengirim cerita</small>
      </div>
    `;
  }

  // After render setup
  async afterRender() {
    const addStorySection = document.getElementById('add-story');
    if (!addStorySection) {
      console.error('ADD STORY SECTION NOT FOUND!');
      return;
    }

    this.#presenter = new AddPresenter({
      view: this,
      model: StoryAPI,
    });

    this.#setupForm();
    this.#setupCamera();
    await this.#initializeMap();
  }

  // Form setup
  #setupForm() {
    this.#form = document.getElementById('story-form');
    if (!this.#form) {
      console.error('FORM NOT FOUND!');
      return;
    }

    this.#form.addEventListener('submit', async (event) => {
      event.preventDefault();

      // Validate required fields
      if (!this.#validateForm()) {
        return;
      }

      // Prepare data to match API structure
      const formData = {
        // name: this.#form.elements.namedItem('name').value.trim(),
        description: this.#form.elements.namedItem('description').value.trim(),
        photo: this.#capturedPhoto, // Changed from evidenceImages to photo
        lat: this.#selectedLat,
        lon: this.#selectedLon
      };

      await this.#presenter.postNewStory(formData);
    });

    // Additional form event listeners for legacy documentation handling
    const docsInput = document.getElementById('documentations-input');
    if (docsInput) {
      docsInput.addEventListener('change', async (event) => {
        const insertingPicturesPromises = Object.values(event.target.files).map(async (file) => {
          return await this.#addTakenPicture(file);
        });
        await Promise.all(insertingPicturesPromises);
        await this.#populateTakenPictures();
      });
    }

    const docsInputButton = document.getElementById('documentations-input-button');
    if (docsInputButton) {
      docsInputButton.addEventListener('click', () => {
        this.#form.elements.namedItem('documentations-input').click();
      });
    }

    const cameraContainer = document.getElementById('camera-container');
    const openDocsButton = document.getElementById('open-documentations-camera-button');
    if (openDocsButton && cameraContainer) {
      openDocsButton.addEventListener('click', async (event) => {
        cameraContainer.classList.toggle('open');
        this.#isCameraOpen = cameraContainer.classList.contains('open');
        event.currentTarget.textContent = this.#isCameraOpen ? 'Tutup Kamera' : 'Buka Kamera';
      });
    }
  }

  // Form validation
  #validateForm() {
    const name = this.#form.elements.namedItem('name').value.trim();
    const description = this.#form.elements.namedItem('description').value.trim();

    if (!name) {
      this.#showError('Judul cerita harus diisi');
      return false;
    }

    if (!description) {
      this.#showError('Deskripsi cerita harus diisi');
      return false;
    }

    if (!this.#capturedPhoto) {
      this.#showError('Foto harus diambil sebelum mengirim cerita');
      return false;
    }

    if (this.#selectedLat === null || this.#selectedLon === null) {
      this.#showError('Lokasi harus dipilih di peta');
      return false;
    }

    return true;
  }

  // Camera setup
  #setupCamera() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const startBtn = document.getElementById('start-camera');
    const captureBtn = document.getElementById('capture-photo');
    const stopBtn = document.getElementById('stop-camera');
    const photoPreview = document.getElementById('photo-preview');
    const previewImage = document.getElementById('preview-image');

    if (startBtn) {
      startBtn.addEventListener('click', async () => {
        try {
          this.#currentStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 }
          });
          video.srcObject = this.#currentStream;
          startBtn.disabled = true;
          captureBtn.disabled = false;
          stopBtn.disabled = false;
          this.#isCameraOpen = true;
        } catch (error) {
          console.error('Camera error:', error);
          this.#showError('Gagal mengakses kamera: ' + error.message);
        }
      });
    }

    if (captureBtn) {
      captureBtn.addEventListener('click', () => {
        try {
          const context = canvas.getContext('2d');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          context.drawImage(video, 0, 0);

          const dataURL = canvas.toDataURL('image/jpeg', 0.8);
          previewImage.src = dataURL;
          photoPreview.style.display = 'block';

          canvas.toBlob((blob) => {
            this.#capturedPhoto = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
            this.#showSuccess('Foto berhasil diambil!');
          }, 'image/jpeg', 0.8);
        } catch (error) {
          console.error('Capture error:', error);
          this.#showError('Gagal mengambil foto: ' + error.message);
        }
      });
    }

    if (stopBtn) {
      stopBtn.addEventListener('click', () => this.#stopCamera());
    }
  }

  #stopCamera() {
    if (this.#currentStream) {
      this.#currentStream.getTracks().forEach(track => track.stop());
      this.#currentStream = null;
      const video = document.getElementById('video');
      if (video) video.srcObject = null;

      const startBtn = document.getElementById('start-camera');
      const captureBtn = document.getElementById('capture-photo');
      const stopBtn = document.getElementById('stop-camera');

      if (startBtn) startBtn.disabled = false;
      if (captureBtn) captureBtn.disabled = true;
      if (stopBtn) stopBtn.disabled = true;
      this.#isCameraOpen = false;
    }
  }

  // Map initialization
  async #initializeMap() {
    try {
      const mapElement = document.getElementById('map');
      if (!mapElement) {
        throw new Error('Map element not found');
      }

      initStoryMap('map', (lat, lng) => {
        this.#selectedLat = lat;
        this.#selectedLon = lng;
        const locationElement = document.getElementById('selected-location');
        if (locationElement) {
          locationElement.textContent = `Lokasi terpilih: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
          locationElement.style.color = '#28a745';
          locationElement.style.fontWeight = 'bold';
        }
      });
    } catch (error) {
      console.error('Map error:', error);
      this.#showError('Gagal memuat peta: ' + error.message);
    }
  }

  // Message handling
  #showSuccess(message) {
    const successMessage = document.getElementById('success-message');
    const errorMessage = document.getElementById('error-message');

    if (successMessage) {
      document.getElementById('success-text').textContent = message;
      successMessage.style.display = 'block';
      if (errorMessage) errorMessage.style.display = 'none';

      // Auto hide success message after 3 seconds
      setTimeout(() => {
        successMessage.style.display = 'none';
      }, 3000);
    }
  }

  #showError(message) {
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');

    if (errorMessage) {
      document.getElementById('error-text').textContent = message;
      errorMessage.style.display = 'block';
      if (successMessage) successMessage.style.display = 'none';

      // Auto hide error message after 5 seconds
      setTimeout(() => {
        errorMessage.style.display = 'none';
      }, 5000);
    }
  }

  // Form handling - called by presenter
  storeSuccessfully(message) {
    console.log('Story stored successfully:', message);
    this.#showSuccess(message || 'Cerita berhasil ditambahkan!');
    this.clearForm();

    setTimeout(() => {
      window.location.hash = '#/';
    }, 1000);
  }

  storeFailed(message) {
    console.error('Story store failed:', message);
    this.#showError(message || 'Terjadi kesalahan saat menambahkan cerita');
  }

  clearForm() {
    if (this.#form) {
      this.#form.reset();
    }

    // Reset form state
    this.#capturedPhoto = null;
    this.#selectedLat = null;
    this.#selectedLon = null;
    this.#takenDocumentations = [];

    // Hide photo preview
    const photoPreview = document.getElementById('photo-preview');
    if (photoPreview) {
      photoPreview.style.display = 'none';
    }

    // Reset location display
    const locationElement = document.getElementById('selected-location');
    if (locationElement) {
      locationElement.textContent = 'Klik pada peta untuk memilih lokasi';
      locationElement.style.color = '#666';
      locationElement.style.fontWeight = 'normal';
    }

    // Stop camera if running
    this.#stopCamera();
  }

  // Loading states
  showMapLoading() {
    const mapElement = document.getElementById('map');
    if (mapElement) {
      mapElement.innerHTML = generateLoaderAbsoluteTemplate();
    }
  }

  showSubmitLoadingButton() {
    const submitButton = this.#form?.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim Cerita...';
      submitButton.disabled = true;
    }
  }

  hideSubmitLoadingButton() {
    const submitButton = this.#form?.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> Kirim Cerita';
      submitButton.disabled = false;
    }
  }

  // Legacy documentation handling methods (keeping for compatibility)
  async #addTakenPicture(image) {
    let blob = image;

    if (image instanceof String) {
      blob = await convertBase64ToBlob(image, 'image/png');
    }

    const newDocumentation = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      blob: blob,
    };
    this.#takenDocumentations = [...this.#takenDocumentations, newDocumentation];
  }

  async #populateTakenPictures() {
    const documentationsList = document.getElementById('documentations-taken-list');
    if (!documentationsList) return;

    const html = this.#takenDocumentations.reduce((accumulator, picture, currentIndex) => {
      const imageUrl = URL.createObjectURL(picture.blob);
      return accumulator.concat(`
        <li class="new-form__documentations__outputs-item">
          <button type="button" data-deletepictureid="${picture.id}" class="new-form__documentations__outputs-item__delete-btn">
            <img src="${imageUrl}" alt="Dokumentasi ke-${currentIndex + 1}">
          </button>
        </li>
      `);
    }, '');

    documentationsList.innerHTML = html;

    // Add delete handlers
    document.querySelectorAll('button[data-deletepictureid]').forEach((button) =>
      button.addEventListener('click', (event) => {
        const pictureId = event.currentTarget.dataset.deletepictureid;
        this.#takenDocumentations = this.#takenDocumentations.filter(pic => pic.id !== pictureId);
        this.#populateTakenPictures();
      }),
    );
  }
}