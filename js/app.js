/* INIT */
(async function(){
  const th=localStorage.getItem('tcrm_theme')||'dark';
  document.documentElement.setAttribute('data-theme',th);

  await load();
  loadForums();
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

  if(localStorage.getItem('sb-collapsed')==='true'){
    sb.classList.add('collapsed');
  }

  btn.addEventListener('click',()=>{
    sb.classList.toggle('collapsed');
    localStorage.setItem('sb-collapsed',sb.classList.contains('collapsed'));
  });

})();