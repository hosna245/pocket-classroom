// === Import required initialization functions from separate modules ===
import { initLibrary } from './library.js';
import { initAuthor } from './author.js';
import { initLearn } from './learn.js';
import { sampleSeed } from './utils.js';

// === DOM element selectors for main app sections ===
const SEL = {
  library: document.getElementById('library-section'),
  author: document.getElementById('author-section'),
  learn: document.getElementById('learn-section'),
};

// === Navigation buttons ===
const btnLib = document.getElementById('nav-library');
const btnAuth = document.getElementById('nav-author');
const btnLearn = document.getElementById('nav-learn');

// === Helper function to hide all sections ===
function hideAll() {
  Object.values(SEL).forEach(s => s.classList.add('d-none'));
}

// === Function to open the Library section ===
function openLibrary() {
  hideAll();
  SEL.library.classList.remove('d-none');
  initLibrary(); // Initialize the library view
}

// === Function to open the Author section ===
// Optional parameter `id` can be used to open a specific capsule or author
function openAuthor(id = null) {
  hideAll();
  SEL.author.classList.remove('d-none');
  initAuthor(); // Initialize author editor

  // If an ID is passed, trigger a delayed event to open a specific item
  if (id !== undefined && id !== null) {
    setTimeout(() => window.dispatchEvent(
      new CustomEvent('author.open', { detail: { id } })
    ), 50);
  }
}

// === Function to open the Learn section ===
// Optional parameter `id` can be used to open a specific learning capsule
function openLearn(id = null) {
  hideAll();
  SEL.learn.classList.remove('d-none');
  initLearn(); // Initialize learning area

  // If an ID is passed, trigger a delayed event to open a specific item
  if (id !== undefined && id !== null) {
    setTimeout(() => window.dispatchEvent(
      new CustomEvent('learn.open', { detail: { id } })
    ), 50);
  }
}

// === Navigation button event listeners ===
btnLib.addEventListener('click', openLibrary);
btnAuth.addEventListener('click', () => openAuthor());
btnLearn.addEventListener('click', () => openLearn());

// === Global event listeners for external triggers ===
// These events allow navigation to Author/Learn views programmatically
window.addEventListener('author.open', e => openAuthor(e?.detail?.id));
window.addEventListener('learn.open', e => openLearn(e?.detail?.id));

// === Keyboard shortcuts ===
//  Opens Library,  → Opens Learn section
window.addEventListener('keydown', e => {
  if (e.key === '[') { btnLib.click(); }
  if (e.key === ']') { btnLearn.click(); }
});

// === Initialize app when DOM is ready ===
document.addEventListener('DOMContentLoaded', () => {
  sampleSeed(); // Load sample data if needed

  // Auto-open section based on URL hash
  if (location.hash.includes('author')) btnAuth.click();
  else if (location.hash.includes('learn')) btnLearn.click();
  else btnLib.click(); // Default: open Library
});
