// Import constant keys used for localStorage management
import { KEYS } from './utils.js';

// 🔹 Load the main capsule index (list of all saved capsules)
export function loadIndex(){
  const raw = localStorage.getItem(KEYS.INDEX); // get stored index
  if(!raw) return []; // return empty array if nothing found
  try{ 
    return JSON.parse(raw); // parse and return valid data
  }catch(e){ 
    return []; // return empty if corrupted data
  }
}

// 🔹 Save the capsule index (metadata of all capsules)
export function saveIndex(idx){
  localStorage.setItem(KEYS.INDEX, JSON.stringify(idx)); // convert to JSON and store
}

// 🔹 Load a single capsule by ID
export function loadCapsule(id){
  const raw = localStorage.getItem('pc_capsule_'+id); // find capsule by its unique key
  if(!raw) return null;
  try{ 
    return JSON.parse(raw); // parse capsule data
  }catch(e){ 
    return null; // return null if invalid JSON
  }
}

// 🔹 Save or update a capsule in localStorage
export function saveCapsule(obj){
  // create ID if not existing
  if(!obj.id) obj.id = 'caps_' + Math.random().toString(36).slice(2,9);
  
  // update timestamp
  obj.updatedAt = new Date().toISOString();

  // store capsule data
  localStorage.setItem('pc_capsule_'+obj.id, JSON.stringify(obj));

  // update index metadata
  const idx = loadIndex();
  const found = idx.find(i=> i.id===obj.id);
  const meta = { 
    id: obj.id, 
    title: obj.meta.title, 
    subject: obj.meta.subject || '', 
    level: obj.meta.level || '', 
    updatedAt: obj.updatedAt 
  };

  // if capsule already exists → update it
  if(found){
    Object.assign(found, meta);
  } else { 
    // otherwise add to the beginning of the list
    idx.unshift(meta); 
  }

  saveIndex(idx); // save updated index
  return obj.id;  // return capsule ID
}

// 🔹 Delete capsule and its related data
export function deleteCapsule(id){
  localStorage.removeItem('pc_capsule_'+id); // remove main capsule
  const idx = loadIndex().filter(i=> i.id!==id); // filter index
  saveIndex(idx); // save updated index
  localStorage.removeItem('pc_progress_'+id); // remove progress info
}
