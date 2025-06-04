
import Database from '../data/database';

const OfflineStories = {
  async render() {
    return `
      <section id="offline-stories">
        <h2>Offline Stories</h2>
        <div id="offline-stories-container"></div>
      </section>
    `;
  },

  async afterRender() {
    // Load stories dari IndexedDB
    const stories = await Database.getAllStories();
    const container = document.getElementById('offline-stories-container');
    
    if (stories.length > 0) {
      container.innerHTML = stories.map(story => `
        <div class="story-card">
          <h3>${story.title || 'Untitled Story'}</h3>
          <p>${story.description || ''}</p>
          <button class="delete-story" data-id="${story.id}">Delete</button>
        </div>
      `).join('');

      // Add delete handlers
      document.querySelectorAll('.delete-story').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.dataset.id;
          if (confirm('Delete this story?')) {
            await Database.deleteStory(id);
            this.afterRender(); // Refresh the list
          }
        });
      });
    } else {
      container.innerHTML = '<p>No offline stories saved yet.</p>';
    }
  }
};

export default OfflineStories;