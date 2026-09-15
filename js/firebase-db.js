/* FIRESTORE DATABASE ADAPTER - THREADS FIRST */

const THREADS_COLLECTION = 'threads';

async function loadThreadsFromFirestore(){
  try{
    const snapshot = await db.collection(THREADS_COLLECTION).get();

    const rows = [];

    snapshot.forEach(doc=>{
      const data = doc.data() || {};
      rows.push({
        ...data,
        id: data.id || doc.id
      });
    });

    return rows;
  }catch(err){
    console.error('Firestore loadThreadsFromFirestore failed:', err);
    return null;
  }
}

async function saveThreadsToFirestore(threads){
  try{
    const safeThreads = Array.isArray(threads) ? threads : [];

    const batch = db.batch();

    safeThreads.forEach(thread=>{
      if(!thread.id){
        thread.id = 't_' + Date.now() + '_' + Math.random().toString(36).slice(2,8);
      }

      const ref = db.collection(THREADS_COLLECTION).doc(String(thread.id));

      batch.set(ref,{
        ...thread,
        updatedAtFirebase: Date.now()
      });
    });

    await batch.commit();
    return true;
  }catch(err){
    console.error('Firestore saveThreadsToFirestore failed:', err);
    return false;
  }
}

async function deleteThreadFromFirestore(id){
  try{
    if(!id)return false;

    await db.collection(THREADS_COLLECTION).doc(String(id)).delete();
    return true;
  }catch(err){
    console.error('Firestore deleteThreadFromFirestore failed:', err);
    return false;
  }
}

/* FIRESTORE DATABASE ADAPTER - ACTION RADAR */

const RADAR_THREADS_COLLECTION = 'radarThreads';

async function loadRadarThreadsFromFirestore(){
  try{
    const snapshot = await db.collection(RADAR_THREADS_COLLECTION).get();

    const rows = [];

    snapshot.forEach(doc=>{
      const data = doc.data() || {};
      rows.push({
        ...data,
        id: data.id || doc.id
      });
    });

    return rows;
  }catch(err){
    console.error('Firestore loadRadarThreadsFromFirestore failed:', err);
    return null;
  }
}

async function saveRadarThreadsToFirestore(radarThreads){
  try{
    const safeRows = Array.isArray(radarThreads) ? radarThreads : [];

    const snapshot = await db.collection(RADAR_THREADS_COLLECTION).get();
    const batch = db.batch();

    const incomingIds = safeRows.map(x=>String(x.id));

    snapshot.forEach(doc=>{
      if(!incomingIds.includes(doc.id)){
        batch.delete(doc.ref);
      }
    });

    safeRows.forEach(rt=>{
      if(!rt.id){
        rt.id = 'rt-' + Date.now() + '-' + Math.random().toString(36).slice(2,8);
      }

      const ref = db.collection(RADAR_THREADS_COLLECTION).doc(String(rt.id));

      batch.set(ref,{
        ...rt,
        updatedAtFirebase: Date.now()
      });
    });

    await batch.commit();
    return true;
  }catch(err){
    console.error('Firestore saveRadarThreadsToFirestore failed:', err);
    return false;
  }
}