/* NAVIGATION */

/* ── Internal view switcher — does NOT touch hash or sidebar ── */
function _showView(v){
  view=v;
  document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));

  const target=document.getElementById('view-'+v);
  if(target)target.classList.add('active');
  else document.getElementById('view-dashboard')?.classList.add('active');

  const titles={
    dashboard:'Dashboard',
    threads:'Threads',
    detail:'Thread Detail',
    radar:'Action Radar'
  };

  document.getElementById('tbt').textContent=titles[v]||'ThreadCRM';
}

/* ── FIX: sidebar active state — moves highlight to correct item ──
   v       : current view ('dashboard' | 'threads' | 'detail')
   forum   : active forum key (e.g. 'SoS') or '' for "All Threads"
   Each .ni has either data-view or data-forum; match accordingly.        */
function _updateSidebarActive(v,forum){
  document.querySelectorAll('.ni').forEach(n=>{
    let on=false;
    if(v==='threads'){
      on=forum ? n.dataset.forum===forum : n.dataset.view==='threads';
    } else {
      on=n.dataset.view===v;
    }
    n.classList.toggle('active',on);
  });
}

/* ── Public navigate: writes hash; handleRoute does the rendering ──
   FIX: if hash is already the target, hashchange won't fire — call
   handleRoute directly so filters/renders are always applied.            */
function navigate(v,id){
  const h=
    v==='detail'&&id ? '#thread-'+id :
    v==='threads' ? '#threads' :
    v==='radar' ? '#radar' :
    '#dashboard';

  if(location.hash===h){
    handleRoute();
  } else {
    location.hash=h;
  }
}

/* ── Hash router ── */
function handleRoute(){
  const hash=location.hash||'#dashboard';

  if(hash.startsWith('#thread-')){
    const id=hash.slice(8);          // '#thread-'.length === 8
    const t=T.find(x=>x.id===id);
    if(!t){location.hash='#threads';return;}
    curId=id;
    _showView('detail');
    _updateSidebarActive('detail','');
    renderDetail(t);

  } else if(hash==='#threads'){
    const forum=(document.getElementById('f-fo')||{}).value||'';
    _showView('threads');
    _updateSidebarActive('threads',forum);
    renderList();

  } 
  else if(hash==='#radar'){
    _showView('radar');
    _updateSidebarActive('radar','');
    renderRadarWorkspace();
  }
  else {
    _showView('dashboard');
    _updateSidebarActive('dashboard','');
    renderDash();
  }
}

/* ── Browser back / forward ── */
window.addEventListener('hashchange',handleRoute);

/* ── openDetail: canonical entry point for opening a thread detail ── */
function openDetail(id){
  curId=id;
  location.hash='#thread-'+id;
}

/* ── navTo: apply filter opts then go to threads view ──
   FIX: calls _updateSidebarActive so the correct sidebar item is
   highlighted immediately, before the hash-change re-render.            */
function navTo(opts){
  overdueFilter=!!opts.overdue;
  actionFilter=!!opts.actionRequired;
  dueTodayFilter=!!opts.dueToday;
  upcomingFilter=!!opts.upcoming;
  dueSoonFilter=!!opts.dueSoon;
  dueLaterFilter=!!opts.dueLater;

  document.getElementById('f-st').value=opts.status||'';
  document.getElementById('f-pr').value=opts.priority||'';
  document.getElementById('f-fo').value=opts.forum||'';
  document.getElementById('f-pe').value=opts.person||'';
  document.getElementById('f-tg').value=opts.tag||'';

  const ftitles={'Open':'Open Threads','In Progress':'In Progress Threads','Closed':'Closed Threads'};
  const forums=Object.fromEntries([...FORUMS,FORUM_ARCHIVE].map(f=>[f.key,f.label]));

  let title='All Threads';
  if(opts.overdue)title='Overdue Threads';
  else if(opts.actionRequired)title='Action Required Threads';
  else if(opts.dueToday)title='Due Today Threads';
  else if(opts.upcoming)title='Upcoming Threads';
  else if(opts.dueSoon)title='Due in 1–3 Days Threads';
else if(opts.dueLater)title='Due in 4–7 Days Threads';
  else if(opts.status&&ftitles[opts.status])title=ftitles[opts.status];
  else if(opts.forum&&forums[opts.forum])title=forums[opts.forum]+' Threads';
  else if(opts.person)title=(opts.person||'')+"'s Threads";
  else if(opts.priority)title=opts.priority+' Priority Threads';
  else if(opts.tag)title=opts.tag+' Tag Threads';

  document.getElementById('tv-title').textContent=title;
  _updateSidebarActive('threads',opts.forum||'');

  const impBtn=document.getElementById('import-btn');
  if(impBtn)impBtn.style.display=opts.forum?'inline-flex':'none';

  window._activeForumKey=opts.forum||'';
  navigate('threads');
}

function navMyThreads(){
  if(!myName){
    const n=prompt('Enter your name (used to filter "My Threads"):','');
    if(!n)return;
    myName=n.trim();
    localStorage.setItem('tcrm_name',myName);
  }
  navTo({person:myName});
}

function goBack(){navigate('threads');}

/* SEARCH */
function onSearch(v){
  searchQ=v.toLowerCase().trim();
  if(view==='dashboard'&&searchQ){navigate('threads');}
  else if(view==='threads'){renderList();}
}

/* QUICK FILTERS */
function qfClick(el,type){
  document.querySelectorAll('.qf').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
  if(type==='mine'){navMyThreads();}
  else{
    const m={all:{},open:{status:'Open'},overdue:{overdue:true},high:{priority:'High'}};
    navTo(m[type]||{});
  }
}
