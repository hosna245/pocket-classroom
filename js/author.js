// === Import storage-related helper functions ===
import { loadCapsule, saveCapsule } from './storage.js';

// === Section selector for Author (content editor) ===
const selector = '#author-section';

// === Initialize the Author editor section ===
export function initAuthor() {
  const cont = document.querySelector(selector);
  render(cont); // Render the editor form into the container

  // Remove old event listener (to avoid duplicates), then add a new one
  window.removeEventListener('author.open', onOpen);
  window.addEventListener('author.open', onOpen);
}

// === Event handler for when an author capsule should be opened ===
function onOpen(e) {
  const id = e?.detail?.id || null;
  openEditor(id); // Open editor with the given capsule ID (or new one if null)
}

// === Render the author editor form ===
function render(cont) {
  cont.innerHTML = `
    <div class="card p-3">
      <h3>Author</h3>
      <form id="capsule-form" class="mt-3">
        <!-- === Capsule Metadata === -->
        <div class="mb-2">
          <label class="form-label">Title *</label>
          <input id="meta-title" class="form-control" placeholder="Capsule title" required>
        </div>
        <div class="row">
          <div class="col">
            <label class="form-label">Subject</label>
            <input id="meta-subject" class="form-control" placeholder="Subject">
          </div>
          <div class="col">
            <label class="form-label">Level</label>
            <select id="meta-level" class="form-select">
              <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
            </select>
          </div>
        </div>
        <div class="mb-2 mt-2">
          <label class="form-label">Description</label>
          <input id="meta-desc" class="form-control">
        </div>

        <hr>
        <!-- === Notes Section === -->
        <h5>Notes</h5>
        <textarea id="notes-area" rows="4" class="form-control" placeholder="One note per line (or Markdown-lite)"></textarea>

        <hr>
        <!-- === Flashcards Section === -->
        <h5>Flashcards</h5>
        <div id="flashcards-list" class="mb-2"></div>
        <button id="add-flash" class="btn btn-outline-light btn-sm mb-3" type="button">Add flashcard</button>

        <hr>
        <!-- === Quiz Section === -->
        <h5>Quiz</h5>
        <div id="quiz-list" class="mb-2"></div>
        <button id="add-quiz" class="btn btn-outline-light btn-sm mb-3" type="button">Add question</button>

        <!-- === Save Button === -->
        <div class="d-flex justify-content-end">
          <button id="save-capsule" class="btn btn-success">Save Capsule</button>
        </div>
      </form>
    </div>
  `;

  // Attach button and form event listeners
  document.getElementById('add-flash').addEventListener('click', addFlashRow);
  document.getElementById('add-quiz').addEventListener('click', addQuizRow);
  document.getElementById('capsule-form').addEventListener('submit', handleSave);
}

// === Open editor for an existing or new capsule ===
function openEditor(id) {
  const cont = document.querySelector(selector);
  const form = cont.querySelector('#capsule-form');

  // Clear previous data
  form.reset();
  document.getElementById('flashcards-list').innerHTML = '';
  document.getElementById('quiz-list').innerHTML = '';

  // If an existing capsule ID is provided, load and populate its data
  if (id) {
    const data = loadCapsule(id);
    if (!data) return alert('Not found');

    // Populate form fields
    document.getElementById('meta-title').value = data.meta.title;
    document.getElementById('meta-subject').value = data.meta.subject || '';
    document.getElementById('meta-level').value = data.meta.level || 'Beginner';
    document.getElementById('meta-desc').value = data.meta.description || '';
    document.getElementById('notes-area').value = (data.notes || []).join('\n');

    // Render flashcards and quiz items
    (data.flashcards || []).forEach(f => addFlashRow(f.front, f.back));
    (data.quiz || []).forEach(q => addQuizRow(q.q, q.choices, q.correct, q.explain));

    // Store capsule ID in form dataset
    form.dataset.id = data.id;
  } else {
    // Otherwise, create a new blank capsule
    form.dataset.id = '';
    addFlashRow();
    addQuizRow();
  }
}

// === Add a new Flashcard row to the editor ===
function addFlashRow(front = '', back = '') {
  const list = document.getElementById('flashcards-list');
  const div = document.createElement('div');
  div.className = 'd-flex gap-2 mb-2';
  div.innerHTML = `
    <input class="form-control flash-front" placeholder="Front (question)"/>
    <input class="form-control flash-back" placeholder="Back (answer)"/>
    <button class="btn btn-danger btn-sm btn-remove">✕</button>
  `;
  list.appendChild(div);

  // Fill fields if values exist
  div.querySelector('.flash-front').value = front;
  div.querySelector('.flash-back').value = back;

  // Enable remove button
  div.querySelector('.btn-remove').addEventListener('click', () => div.remove());
}

// === Add a new Quiz question block to the editor ===
function addQuizRow(q = '', choices = ['', '', '', ''], correct = 0, explain = '') {
  const list = document.getElementById('quiz-list');
  const div = document.createElement('div');
  div.className = 'mb-2 p-2';
  div.style.border = '1px dashed rgba(255,255,255,0.03)';
  div.innerHTML = `
    <div class="mb-1"><input class="form-control quiz-q" placeholder="Question"/></div>
    <div class="row g-2 mb-1">
      <div class="col"><input class="form-control quiz-c0" placeholder="Choice A"/></div>
      <div class="col"><input class="form-control quiz-c1" placeholder="Choice B"/></div>
    </div>
    <div class="row g-2 mb-1">
      <div class="col"><input class="form-control quiz-c2" placeholder="Choice C"/></div>
      <div class="col"><input class="form-control quiz-c3" placeholder="Choice D"/></div>
    </div>
    <div class="mb-1 d-flex gap-2 align-items-center">
      <label class="form-label mb-0">Correct</label>
      <select class="form-select form-select-sm quiz-correct" style="width:120px;">
        <option value="0">A</option><option value="1">B</option><option value="2">C</option><option value="3">D</option>
      </select>
      <input class="form-control quiz-explain" placeholder="Explanation (optional)"/>
      <button class="btn btn-danger btn-sm btn-remove-q">✕</button>
    </div>
  `;
  list.appendChild(div);

  // Fill quiz fields
  div.querySelector('.quiz-q').value = q;
  for (let i = 0; i < 4; i++) div.querySelector('.quiz-c' + i).value = choices[i] || '';
  div.querySelector('.quiz-correct').value = correct;
  div.querySelector('.quiz-explain').value = explain;

  // Enable remove button
  div.querySelector('.btn-remove-q').addEventListener('click', () => div.remove());
}

// === Handle saving of the capsule (form submission) ===
function handleSave(e) {
  e.preventDefault();

  const form = e.target;
  const id = form.dataset.id || '';
  const title = document.getElementById('meta-title').value.trim();
  if (!title) return alert('Title is required');

  // Collect metadata
  const meta = {
    title,
    subject: document.getElementById('meta-subject').value.trim(),
    level: document.getElementById('meta-level').value,
    description: document.getElementById('meta-desc').value.trim()
  };

  // Collect notes (non-empty lines only)
  const notes = document.getElementById('notes-area').value
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);

  // Collect flashcards
  const flashcards = Array.from(document.querySelectorAll('#flashcards-list .d-flex')).map(div => ({
    front: div.querySelector('.flash-front').value.trim(),
    back: div.querySelector('.flash-back').value.trim()
  })).filter(f => f.front || f.back);

  // Collect quiz questions
  const quiz = Array.from(document.querySelectorAll('#quiz-list > div')).map(div => ({
    q: div.querySelector('.quiz-q').value.trim(),
    choices: [0, 1, 2, 3].map(i => div.querySelector('.quiz-c' + i).value.trim()),
    correct: parseInt(div.querySelector('.quiz-correct').value, 10) || 0,
    explain: div.querySelector('.quiz-explain').value.trim()
  })).filter(q => q.q && q.choices.some(Boolean));

  // Ensure at least one section (note, flashcard, or quiz) is filled
  if (notes.length === 0 && flashcards.length === 0 && quiz.length === 0)
    return alert('Add at least notes, flashcards or a quiz');

  // Prepare object to save
  const obj = {
    id: id || undefined,
    meta,
    notes,
    flashcards,
    quiz,
    updatedAt: new Date().toISOString()
  };

  // Save capsule and return new ID
  const newId = saveCapsule(obj);

  alert('Saved!');
  // Navigate back to library after saving
  location.hash = '#library';
  window.dispatchEvent(new Event('render.library'));
}


