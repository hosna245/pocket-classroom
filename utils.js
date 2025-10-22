// Utility helpers: storage keys, id generation, timeAgo, debounce, sample seed
export const KEYS = {
  INDEX: 'pc_capsules_index'
};

export function uid(prefix='pc_'){
  return prefix + Math.random().toString(36).slice(2,9);
}

export function timeISO(){ return new Date().toISOString(); }

export function timeAgo(iso){
  try{
    const diff = (Date.now() - new Date(iso).getTime())/1000;
    if(diff<60) return Math.floor(diff)+'s ago';
    if(diff<3600) return Math.floor(diff/60)+'m ago';
    if(diff<86400) return Math.floor(diff/3600)+'h ago';
    return Math.floor(diff/86400)+'d ago';
  }catch(e){ return ''; }
}

export function readJSONSafe(s){
  try{ return JSON.parse(s); }catch(e){ return null; }
}

export function debounce(fn, wait=300){
  let t;
  return (...a)=>{ clearTimeout(t); t = setTimeout(()=>fn(...a), wait); };
}

// seed with a sample capsule if index empty
export function sampleSeed(){
  const idx = localStorage.getItem(KEYS.INDEX);
  if(idx) return;
  const sample = {
    id: uid('caps_'),
    meta: { title: 'HTML Basics', subject:'Web', level:'Beginner', description:'Quick notes on HTML elements' },
    notes: ['Elements: <tag>content</tag>','Use semantic elements: header, nav, main, footer'],
    flashcards: [{front:'What does HTML stand for?', back:'HyperText Markup Language'}, {front:'Tag for paragraph?', back:'<p>'}],
    quiz: [
      {q:'Which tag is used for largest heading?', choices:['<small>','<h1>','<div>','<p>'], correct:1, explain:'<h1> is largest semantic heading.'}
    ],
    updatedAt: timeISO()
  };
  localStorage.setItem(KEYS.INDEX, JSON.stringify([{id:sample.id,title:sample.meta.title,subject:sample.meta.subject,level:sample.meta.level,updatedAt:sample.updatedAt}]));
  localStorage.setItem('pc_capsule_'+sample.id, JSON.stringify(sample));
}
