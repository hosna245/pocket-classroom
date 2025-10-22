// === Import capsule data loaders ===
import { loadCapsule, loadIndex } from './storage.js';

// === Global variables for Learn module ===
const selector = '#learn-section';
let capsule = null;              // Currently opened capsule
let currentFlashIndex = 0;       // Flashcard index
let flipped = false;             // Card flip state
let knownSet = new Set();        // Tracks known flashcards
let currentQuizBest = 0;         // Best quiz score stored

// === Initialize Learn Section ===
export function initLearn(){
  const cont = document.querySelector(selector);
  renderSelector(cont); // Render the main "Learn" selection UI
  window.removeEventListener('learn.open', onOpen);
  window.addEventListener('learn.open', onOpen);
}

// === Triggered when a capsule is opened externally ===
function onOpen(e){
  const id = e?.detail?.id;
  if(id) openCapsule(id);
}

// === Render the Learn module selection interface ===
function renderSelector(cont){
  cont.innerHTML = '';
  const idx = loadIndex() || [];

  // --- Layout of Learn section: capsule selector, mode buttons, export ---
  cont.innerHTML = `
    <div class="card p-3 mb-3">
      <h3>Learn</h3>
      <div class="row g-2 align-items-center">
        <div class="col-md-6">
          <select id="caps-select" class="form-select"></select>
        </div>
        <div class="col-md-6 text-end">
          <div class="btn-group" role="group" aria-label="modes">
            <button id="mode-notes" class="btn btn-outline-light btn-sm">Notes</button>
            <button id="mode-flash" class="btn btn-outline-light btn-sm">Flashcards</button>
            <button id="mode-quiz" class="btn btn-outline-light btn-sm">Quiz</button>
            <button id="btn-export-learn" class="btn btn-outline-light btn-sm">📤 Export</button>
          </div>
        </div>
      </div>
    </div>
    <div id="learn-area"></div>
  `;

  // --- Fill dropdown with saved capsules ---
  const sel = document.getElementById('caps-select');
  idx.forEach(i=> {
    const opt = document.createElement('option'); 
    opt.value = i.id; 
    opt.text = i.title + ' — ' + (i.subject||'');
    sel.appendChild(opt);
  });
  if(idx.length>0) sel.value = idx[0].id;

  // --- Event bindings for mode switching ---
  document.getElementById('mode-notes').addEventListener('click', ()=> showMode('notes'));
  document.getElementById('mode-flash').addEventListener('click', ()=> showMode('flash'));
  document.getElementById('mode-quiz').addEventListener('click', ()=> showMode('quiz'));
  sel.addEventListener('change', ()=> openCapsule(sel.value));

  // --- Export capsule as JSON file ---
  document.getElementById('btn-export-learn').addEventListener('click', () => {
    if(!capsule) return alert('No capsule open');
    const blob = new Blob(
      [JSON.stringify(Object.assign({ schema: 'pocket-classroom/v1' }, capsule), null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (capsule.meta.title || 'capsule') + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  // --- Auto open first capsule ---
  if(sel.value) openCapsule(sel.value);
}

// === Open a specific capsule for learning ===
function openCapsule(id){
  capsule = loadCapsule(id);
  if(!capsule) return alert('Capsule not found');

  // Reset learning state
  currentFlashIndex = 0; 
  flipped = false; 
  knownSet = new Set();

  // Restore saved learning progress
  const saved = JSON.parse(localStorage.getItem('pc_progress_' + id) || '{}');
  if(saved.knownFlashcards) knownSet = new Set(saved.knownFlashcards);
  if(saved.bestScore) currentQuizBest = saved.bestScore;

  // Default mode = notes
  showMode('notes');
}

// === Display Notes, Flashcards, or Quiz modes ===
function showMode(mode){
  const area = document.getElementById('learn-area');
  if(!capsule) return area.innerHTML = '<div class="empty-state">Select a capsule</div>';

  // --- Notes mode ---
  if(mode==='notes'){
    area.innerHTML = `
      <div class="card p-3">
        <h4>${escapeHtml(capsule.meta.title)}</h4>
        <input id="note-search" class="form-control my-2" placeholder="Search notes...">
        <ol id="notes-list"></ol>
      </div>
    `;
    const ol = document.getElementById('notes-list');
    capsule.notes.forEach(n=> {
      const li = document.createElement('li'); 
      li.innerHTML = escapeHtml(n); 
      ol.appendChild(li);
    });

    // Search filter
    document.getElementById('note-search').addEventListener('input', (e)=>{
      const q = e.target.value.toLowerCase();
      ol.innerHTML = '';
      capsule.notes
        .filter(n=> n.toLowerCase().includes(q))
        .forEach(n=> {
          const li = document.createElement('li'); 
          li.innerHTML = escapeHtml(n); 
          ol.appendChild(li);
        });
    });
  } 

  // --- Flashcards mode ---
  else if(mode==='flash'){
    renderFlash(area);
    window.addEventListener('keydown', onSpace);
  } 

  // --- Quiz mode ---
  else if(mode==='quiz'){
    renderQuiz(area);
  }
}

// === Render Flashcards section ===
function renderFlash(area){
  area.innerHTML = '';
  if(!capsule.flashcards || capsule.flashcards.length===0){
    return area.innerHTML = '<div class="empty-state">No flashcards in this capsule.</div>';
  }

  const fc = capsule.flashcards;
  const cardWrap = document.createElement('div');
  cardWrap.className = 'card p-3 text-center';
  cardWrap.innerHTML = `
    <h4>${escapeHtml(capsule.meta.title)}</h4>
    <div id="flashcard" class="flashcard mt-3 mx-auto" tabindex="0">
      <div class="flashcard-inner flashcard-inner-anim">
        <div class="flashcard-face flashcard-front"></div>
        <div class="flashcard-face flashcard-back"></div>
      </div>
    </div>
    <div class="d-flex justify-content-center gap-2 controls-row mt-3">
      <button id="mark-known" class="btn btn-success btn-sm">✅Known</button>
      <button id="mark-unk" class="btn btn-danger btn-sm">🤔Unknown</button>
    </div>
    <div class="mt-2 small text-muted" id="flash-info"></div>
    <div class="flash-nav-icons">
      <span id="prev" class="nav-icon">⏮️</span>
      <span id="next" class="nav-icon ms-2">⏭️</span>
    </div>
  `;
  area.appendChild(cardWrap);

  // --- Setup Flashcard flip functionality ---
  const flashEl = document.getElementById('flashcard');
  const front = flashEl.querySelector('.flashcard-front');
  const back = flashEl.querySelector('.flashcard-back');

  // Update displayed flashcard
  function update(){
    const item = fc[currentFlashIndex];
    front.innerHTML = escapeHtml(item.front||'');
    back.innerHTML = escapeHtml(item.back||'');
    flipped = false;
    flashEl.classList.remove('flipped');
    document.getElementById('flash-info').textContent = `${currentFlashIndex+1}/${fc.length} • Known: ${knownSet.size}`;
  }

  update();

  // --- Navigation & marking ---
  document.getElementById('prev').addEventListener('click', ()=> { 
    currentFlashIndex = (currentFlashIndex-1+fc.length)%fc.length; 
    update(); 
  });
  document.getElementById('next').addEventListener('click', ()=> { 
    currentFlashIndex = (currentFlashIndex+1)%fc.length; 
    update(); 
  });
  document.getElementById('mark-known').addEventListener('click', ()=> { 
    knownSet.add(currentFlashIndex); 
    saveProgress(); 
    update(); 
  });
  document.getElementById('mark-unk').addEventListener('click', ()=> { 
    knownSet.delete(currentFlashIndex); 
    saveProgress(); 
    update(); 
  });

  // --- Flip card on click ---
  flashEl.addEventListener('click', ()=> { 
    flipped = !flipped; 
    flashEl.classList.toggle('flipped', flipped); 
  });
}

// === Keyboard spacebar flip handler ===
function onSpace(e){
  if(e.code==='Space'){ 
    e.preventDefault(); 
    const flashEl = document.getElementById('flashcard'); 
    if(flashEl){ flashEl.classList.toggle('flipped'); } 
  }
}

// === Render Quiz Mode ===
function renderQuiz(area){
  const qlist = capsule.quiz || [];
  if(qlist.length===0) return area.innerHTML = '<div class="empty-state">No quiz questions here.</div>';
  area.innerHTML = '<div class="card p-3"><h4>'+escapeHtml(capsule.meta.title)+'</h4><div id="quiz-area"></div></div>';
  const qa = document.getElementById('quiz-area');
  let idx = 0, correctCount = 0;
  showQuestion();

  // --- Display each question sequentially ---
  function showQuestion(){
    const q = qlist[idx];
    qa.innerHTML = `
      <div class="mb-2"><strong>Question ${idx+1}/${qlist.length}</strong></div>
      <div class="mb-2">${escapeHtml(q.q)}</div>
      <div id="choices" class="list-group"></div>
      <div class="mt-3 small text-muted" id="quiz-feedback"></div>
    `;
    const choices = document.getElementById('choices');
    q.choices.forEach((c,i)=>{
      const btn = document.createElement('button'); 
      btn.className='list-group-item list-group-item-action'; 
      btn.textContent = (['A)','B)','C)','D)'][i]||'') + ' ' + c;
      btn.addEventListener('click', ()=> {
        const correct = i===q.correct;
        if(correct){ 
          btn.classList.add('list-group-item-success'); 
          correctCount++; 
        }
        else { 
          btn.classList.add('list-group-item-danger'); 
          choices.children[q.correct].classList.add('list-group-item-success'); 
        }
        document.getElementById('quiz-feedback').textContent = q.explain || '';
        setTimeout(()=> {
          idx++;
          if(idx<qlist.length) showQuestion(); else showResult();
        }, 900);
      });
      choices.appendChild(btn);
    });
  }

  // --- Show final score and store best ---
  function showResult(){
    const score = Math.round((100*correctCount/qlist.length));
    qa.innerHTML = `<div class="text-center"><h5>Result: ${score}%</h5><p class="small text-muted">${correctCount}/${qlist.length} correct</p></div>`;
    if(score > currentQuizBest) currentQuizBest = score;
    saveProgress();
  }
}

/* === Save progress (known cards, best score) === */
function saveProgress(){
  if(!capsule) return;
  const progress = {
    bestScore: currentQuizBest,
    knownFlashcards: Array.from(knownSet)
  };
  localStorage.setItem('pc_progress_' + capsule.id, JSON.stringify(progress));
  // Notify Library to update progress display
  window.dispatchEvent(new Event('progress.updated'));
}

// === Escape unsafe characters in HTML ===
function escapeHtml(s){ 
  return (s||'').toString().replace(/[&<>"']/g, c=>({ 
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' 
  }[c])); 
}
