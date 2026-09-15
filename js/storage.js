/* STORAGE */

async function load(){
  try{
    const firestoreThreads = await loadThreadsFromFirestore();

    if(Array.isArray(firestoreThreads) && firestoreThreads.length){
      T = firestoreThreads;
      localStorage.setItem('tcrm_v3',JSON.stringify(T));
      return;
    }

    const localRows = localStorage.getItem('tcrm_v3');
    T = localRows ? JSON.parse(localRows) : [];

    if(T.length){
      await saveThreadsToFirestore(T);
      console.log('Local threads migrated to Firestore:',T.length);
    }
  }catch(e){
    console.error('Load failed, falling back to localStorage:',e);

    try{
      const r = localStorage.getItem('tcrm_v3');
      T = r ? JSON.parse(r) : [];
    }catch(err){
      T = [];
    }
  }
}

function save(){
  localStorage.setItem('tcrm_v3',JSON.stringify(T));

  if(typeof saveThreadsToFirestore === 'function'){
    saveThreadsToFirestore(T);
  }
}

async function loadForums(){
  try{
    if(typeof loadForumsFromFirestore === 'function'){
      const firestoreForums = await loadForumsFromFirestore();

      if(Array.isArray(firestoreForums) && firestoreForums.length){
        FORUMS = firestoreForums;
        localStorage.setItem('tcrm_forums',JSON.stringify(FORUMS));
        return;
      }
    }

    const r=localStorage.getItem('tcrm_forums');
    if(r){
      FORUMS=JSON.parse(r);

      if(Array.isArray(FORUMS) && FORUMS.length && typeof saveForumsToFirestore === 'function'){
        await saveForumsToFirestore(FORUMS);
        console.log('Local forums migrated to Firestore:',FORUMS.length);
      }
    }
  }catch(e){
    console.error('loadForums failed:',e);
  }
}

function saveForums(){
  localStorage.setItem('tcrm_forums',JSON.stringify(FORUMS));

  if(typeof saveForumsToFirestore === 'function'){
    saveForumsToFirestore(FORUMS);
  }
}