/* INIT */

async function startThreadCRMApp(){
  const th=localStorage.getItem('tcrm_theme')||'dark';
  document.documentElement.setAttribute('data-theme',th);

  await load();
  await loadForums();

  if(typeof initRadarThreadsFromFirestore==='function'){
    await initRadarThreadsFromFirestore();
  }

  if(!location.hash)location.hash='#dashboard';
  handleRoute();
  syncForums();
  updateRadarBadge?.();

  /* ── SIDEBAR COLLAPSE INIT ── */
  const sb=document.getElementById('sidebar');
  const btn=document.getElementById('sb-toggle');

  if(sb && localStorage.getItem('sb-collapsed')==='true'){
    sb.classList.add('collapsed');
  }

  if(btn && !btn.dataset.bound){
    btn.dataset.bound='true';

    btn.addEventListener('click',()=>{
      sb.classList.toggle('collapsed');
      localStorage.setItem('sb-collapsed',sb.classList.contains('collapsed'));
    });
  }
}