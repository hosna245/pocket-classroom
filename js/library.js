// === Import required modules ===
import { loadIndex, loadCapsule, deleteCapsule } from './storage.js';
import { timeAgo } from './utils.js';

// Selector for the main Library section container
const containerSelector = '#library-section';

// === Entry point: Initialize Library section ===
export function initLibrary(){
  const cont = document.querySelector(containerSelector);
  render(cont); // Render the Library content

  // 🔹 Listen for learning progress updates from Learn section
  window.addEventListener('progress.updated', () => {
    render(document.querySelector(containerSelector)); // Re-render to refresh progress info
  });
}

// === Render the Library content ===
function render(cont){
  cont.innerHTML = ''; // Clear previous content
  const idx = loadIndex(); // Load capsule index (list of all saved capsules)

  // Top header bar with buttons
  const top = document.createElement('div');
  top.className = 'd-flex justify-content-between align-items-center mb-3';
  top.innerHTML = `
    <h3>Library</h3>
    <div>
      <!-- Button to create a new capsule -->
      <button id="new-capsule" class="btn btn-success btn-sm me-2">+New Capsule</button>

      <!-- Import JSON button -->
      <label class="btn btn-outline-light btn-sm mb-0">
        📤Import JSON <input id="import-file" type="file" accept="application/json">
      </label>
    </div>
  `;
  cont.appendChild(top);

  // === If there are no capsules saved ===
  if(!idx || idx.length === 0){
    cont.insertAdjacentHTML('beforeend',
      '<div class="empty-state">No capsules yet — click <strong>New Capsule</strong> to start.</div>');
  } 
  else {
    // === Render capsule cards ===
    const row = document.createElement('div');
    row.className = 'row g-3';

    idx.forEach(item => {
      const card = document.createElement('div');
      card.className = 'col-12 col-md-6 col-lg-4';

      // Load capsule progress from localStorage (known flashcards and best quiz score)
      const progress = JSON.parse(localStorage.getItem('pc_progress_' + item.id) || '{}');
      const known = progress.knownFlashcards ? progress.knownFlashcards.length : 0;
      const bestScore = progress.bestScore || 0;

      // Capsule card HTML layout
      card.innerHTML = `
        <div class="card p-3 h-100">
          <!-- Title and Level badge -->
          <div class="d-flex justify-content-between">
            <h5>${escapeHtml(item.title)}</h5>
            <span class="badge bg-primary badge-level">${escapeHtml(item.level || '')}</span>
          </div>

          <!-- Subject and time info -->
          <div class="small text-muted my-2">${escapeHtml(item.subject || '')} • ${timeAgo(item.updatedAt)}</div>

          <!-- Progress section -->
          <div class="mt-2">
            <div class="small text-info">Known cards: ${known}</div>
            <div class="progress" style="height:6px;">
              <div class="progress-bar bg-success"
                role="progressbar"
                style="width:${bestScore}%"
                aria-valuenow="${bestScore}"
                aria-valuemin="0"
                aria-valuemax="100"></div>
            </div>
            <div class="small text-muted mt-1">Quiz best score: ${bestScore}%</div>
          </div>

          <!-- Buttons for actions -->
          <div class="mt-3 d-flex gap-2">
            <button data-id="${item.id}" class="btn btn-sm btn-light btn-learn">Learn</button>
            <button data-id="${item.id}" class="btn btn-sm btn-outline-light btn-edit">Edit</button>
            <button data-id="${item.id}" class="btn btn-sm btn-outline-light btn-export">Export</button>
            <button data-id="${item.id}" class="btn btn-sm btn-danger btn-delete">Delete</button>
          </div>
        </div>
      `;
      row.appendChild(card);
    });

    cont.appendChild(row);
  }

  // === EVENT HANDLERS ===

  //  New Capsule → Go to Author section
  document.getElementById('new-capsule').addEventListener('click', () => {
    location.hash = '#author';
    window.dispatchEvent(new CustomEvent('author.open', { detail: { id: null } }));
  });

  //  Import Capsule from JSON
  document.getElementById('import-file').addEventListener('change', handleImport);

  //  Edit Capsule → Open Author section
  cont.querySelectorAll('.btn-edit').forEach(b => {
    b.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      location.hash = '#author';
      window.dispatchEvent(new CustomEvent('author.open', { detail: { id } }));
    });
  });

  //  Learn Capsule → Open Learn section
  cont.querySelectorAll('.btn-learn').forEach(b => {
    b.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      location.hash = '#learn';
      window.dispatchEvent(new CustomEvent('learn.open', { detail: { id } }));
    });
  });

  //  Delete Capsule
  cont.querySelectorAll('.btn-delete').forEach(b => {
    b.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      if (confirm('Delete this capsule?')) {
        deleteCapsule(id);
        render(cont); // Refresh list
      }
    });
  });

  //  Export Capsule as JSON
  cont.querySelectorAll('.btn-export').forEach(b => {
    b.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      const data = loadCapsule(id);
      if (!data) return alert('Capsule not found');

      // Create JSON file for download
      const blob = new Blob(
        [JSON.stringify(Object.assign({ schema: 'pocket-classroom/v1' }, data), null, 2)],
        { type: 'application/json' }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (data.meta.title || 'capsule') + '.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  });
}

// === Handle importing JSON capsule files ===
function handleImport(e){
  const f = e.target.files[0];
  if(!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      // Parse JSON file and validate schema
      const parsed = JSON.parse(r.result);
      if(parsed.schema !== 'pocket-classroom/v1') return alert('Invalid schema');

      // Assign a new random ID for imported capsule
      parsed.id = 'caps_' + Math.random().toString(36).slice(2,9);
      localStorage.setItem('pc_capsule_' + parsed.id, JSON.stringify(parsed));

      // Add it to the main index
      const idx = loadIndex() || [];
      idx.unshift({
        id: parsed.id,
        title: parsed.meta.title,
        subject: parsed.meta.subject,
        level: parsed.meta.level,
        updatedAt: parsed.updatedAt || new Date().toISOString()
      });
      localStorage.setItem('pc_capsules_index', JSON.stringify(idx));

      alert('Imported!');
      document.getElementById('import-file').value = '';
      initLibrary(); // Refresh list
    } catch(err) {
      alert('Failed to import: ' + err.message);
    }
  };
  r.readAsText(f);
}

// === Escape HTML special characters to prevent XSS ===
function escapeHtml(s){
  return (s || '').toString().replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[c]));
}
