/* THREADS LIST */

/* ── COLUMN VISIBILITY ── */
const COLS=[
  {key:'priority',     label:'Priority',     def:false},
  {key:'status',       label:'Status',       def:true},
  {key:'owner',        label:'Owner',        def:true},
  {key:'forum',        label:'Forum',        def:true},
  {key:'duedate',      label:'Due Date',     def:true},
  {key:'ageing',       label:'Ageing',       def:true},
  {key:'comments',     label:'Comments',     def:true},
  {key:'category',     label:'Category',     def:false},
  {key:'subcat',       label:'Sub Category', def:false},
  {key:'participants', label:'Participants', def:false},
  {key:'created',      label:'Created Date', def:false},
];

/* ── BULK SELECTION state ── */
let selectedIds=new Set();
let colSort={col:'',dir:0};
let colVis=JSON.parse(localStorage.getItem('tcrm_cols')||'null')||
  Object.fromEntries(COLS.map(c=>[c.key,c.def]));

let isResizingCol=false;
let suppressSortClick=false;

/* ── COLUMN WIDTHS ── */
const COL_WIDTHS_KEY='tcrm_col_widths';
const TABLE_COL_KEYS=['select','priority','title','status','owner','forum','duedate','ageing','comments','category','subcat','participants','created','actions'];
const COL_MIN_WIDTHS={
  select:42,
  priority:96,
  title:220,
  status:110,
  owner:140,
  forum:120,
  duedate:110,
  ageing:90,
  comments:90,
  category:120,
  subcat:140,
  participants:140,
  created:110,
  actions:86,
};
let colWidths=JSON.parse(localStorage.getItem(COL_WIDTHS_KEY)||'{}');

function saveColWidths(){
  localStorage.setItem(COL_WIDTHS_KEY,JSON.stringify(colWidths));
}

function saveColVis(){localStorage.setItem('tcrm_cols',JSON.stringify(colVis));}
function renderActiveFilterChips(){
  const el=document.getElementById('active-filter-chips');
  if(!el)return;

  const chips=[];

  const filters=[
    ['f-st','Status'],
    ['f-pr','Priority'],
    ['f-fo','Forum'],
    ['f-pe','Owner'],
    ['f-tg','Tag']
  ];

  filters.forEach(([id,label])=>{
    const field=document.getElementById(id);
    if(field && field.value){
      const text=field.options[field.selectedIndex]?.text || field.value;
      chips.push(`<button class="filter-chip" onclick="clearSingleFilter('${id}')">${label}: ${esc(text)} ×</button>`);
    }
  });

  if(overdueFilter)chips.push(`<button class="filter-chip" onclick="clearSpecialFilter('overdueFilter')">Overdue ×</button>`);
  if(actionFilter)chips.push(`<button class="filter-chip" onclick="clearSpecialFilter('actionFilter')">Action Required ×</button>`);
  if(dueTodayFilter)chips.push(`<button class="filter-chip" onclick="clearSpecialFilter('dueTodayFilter')">Due Today ×</button>`);
  if(upcomingFilter)chips.push(`<button class="filter-chip" onclick="clearSpecialFilter('upcomingFilter')">Upcoming ×</button>`);

  el.innerHTML=chips.length
    ? chips.join('') + `<button class="filter-chip clear-all-chip" onclick="clearFilters()">Clear All</button>`
    : '';
}

function clearSingleFilter(id){
  const field=document.getElementById(id);
  if(field)field.value='';
  renderList();
}

function clearSpecialFilter(name){
  window[name]=false;
  renderList();
}
function addToRadar(id){
  const t=T.find(x=>x.id===id);
  if(!t)return;

  t.isRadar=true;
  t.radarAddedAt=t.radarAddedAt||Date.now();
  t.radarReason=t.radarReason||'Daily follow-up required';
  t.radarFollowupDate=t.radarFollowupDate||t.targetDate||'';
  t.radarDiscussions=t.radarDiscussions||[];

  save();
  updateRadarBadge?.();

  if(view==='threads')renderList();
  if(view==='dashboard')renderDash();
  if(view==='radar')renderRadarWorkspace();
  if(view==='detail')renderDetail(t);

  toast('Thread added to Action Radar.','success');
}

function removeFromRadar(id){
  const t=T.find(x=>x.id===id);
  if(!t)return;

  t.isRadar=false;
  save();
  updateRadarBadge?.();

  if(view==='detail')renderDetail(t);
  if(view==='dashboard')renderDash();
  if(view==='threads')renderList();
  if(view==='radar')renderRadarWorkspace();

  toast('Thread removed from Action Radar.','info');
}
function updateThreadPriority(id){
  const t=T.find(x=>x.id===id);
  if(!t)return;

  const current=t.priority||'Medium';

  const input=prompt(
    `Set priority for this thread:\n\n1. Low\n2. Medium\n3. High\n4. Critical\n\nCurrent Priority: ${current}`,
    current
  );

  if(!input)return;

  const value=String(input).trim().toLowerCase();

  const priorityMap={
    '1':'Low',
    'low':'Low',
    '2':'Medium',
    'medium':'Medium',
    '3':'High',
    'high':'High',
    '4':'Critical',
    'critical':'Critical'
  };

  const newPriority=priorityMap[value];

  if(!newPriority){
    toast('Please enter Low, Medium, High, or Critical.','error');
    return;
  }

  t.priority=newPriority;

  save();

  if(view==='threads')renderList();
  if(view==='dashboard')renderDash();
  if(view==='detail')renderDetail(t);

  toast(`Priority updated to ${newPriority}.`,'success');
}

function markRadarDiscussed(id){
  const t=T.find(x=>x.id===id);
  if(!t)return;

  t.radarDiscussions=t.radarDiscussions||[];

  const todayKey=new Date().toISOString().split('T')[0];
  const alreadyToday=t.radarDiscussions.some(d=>
    String(d.date||'').split('T')[0]===todayKey
  );

  if(!alreadyToday){
    t.radarDiscussions.unshift({
      date:new Date().toISOString(),
      type:'Daily Discussion',
      user:localStorage.getItem('tcrm_name')||'User'
    });
  }

  save();

  if(view==='detail')renderDetail(t);
  if(view==='dashboard')renderDash();

  toast(alreadyToday?'Already marked discussed today.':'Marked as discussed today.','success');
}

function getLastRadarDiscussion(t){
  const list=t.radarDiscussions||[];
  if(!list.length)return 'Not discussed yet';

  const last=list[0];
  const lastDate=String(last.date||'').split('T')[0];

  const today=new Date();
  today.setHours(0,0,0,0);

  const d=new Date(lastDate);
  d.setHours(0,0,0,0);

  const diff=Math.round((today-d)/86400000);

  if(diff===0)return 'Discussed today';
  if(diff===1)return 'Discussed yesterday';
  return `Discussed ${diff} days ago`;
}
/* ── Bulk selection functions ── */
function _updateBulkBar(){
  const bar=document.getElementById('bulk-bar');
  const cnt=document.getElementById('bulk-count');
  const chkAll=document.getElementById('chk-all');
  const toolbarChk=document.getElementById('toolbar-chk-all');
  const tblWrap=document.querySelector('.tbl-wrap');

  if(!bar)return;

  const count=selectedIds.size;

  if(count>0){
    bar.style.display='flex';
    if(cnt) cnt.textContent=count + ' selected';
    if(tblWrap) tblWrap.classList.add('selection-mode');
  }else{
    bar.style.display='none';
    if(tblWrap) tblWrap.classList.remove('selection-mode');
  }

  const allIds=Array.from(document.querySelectorAll('.row-chk')).map(c=>c.dataset.id);
  const allSelected=allIds.length>0 && allIds.every(id=>selectedIds.has(id));
  const partialSelected=count>0 && !allSelected;

  if(chkAll){
    chkAll.checked=allSelected;
    chkAll.indeterminate=partialSelected;
  }

  if(toolbarChk){
    toolbarChk.checked=allSelected;
    toolbarChk.indeterminate=partialSelected;
  }
}

function toggleSelectAll(el){
  const allChks=document.querySelectorAll('.row-chk');
  allChks.forEach(chk=>{
    chk.checked=el.checked;
    if(el.checked)selectedIds.add(chk.dataset.id);
    else selectedIds.delete(chk.dataset.id);
    // highlight row
    const row=chk.closest('tr');
    if(row)row.classList.toggle('row-selected',el.checked);
  });
  _updateBulkBar();
}
function toggleSelectAllFromToolbar(el){
  const tblWrap = document.querySelector('.tbl-wrap');
  if(tblWrap){
    tblWrap.classList.toggle('selection-mode', el.checked);
  }

  const boxes = document.querySelectorAll('.row-chk');

  boxes.forEach(cb=>{
    cb.checked = el.checked;

    if(el.checked){
      selectedIds.add(cb.dataset.id);
    }else{
      selectedIds.delete(cb.dataset.id);
    }

    cb.closest('tr')?.classList.toggle('row-selected', el.checked);
  });

  _updateBulkBar();
}

function toggleRowSelect(chk){
  const id=chk.dataset.id;
  if(chk.checked)selectedIds.add(id);
  else selectedIds.delete(id);
  const row=chk.closest('tr');
  if(row)row.classList.toggle('row-selected',chk.checked);
  _updateBulkBar();
}

function clearBulkSelection(){
  selectedIds.clear();
  document.querySelectorAll('.row-chk').forEach(c=>{c.checked=false;});
  document.querySelectorAll('.trow').forEach(r=>r.classList.remove('row-selected'));
  const chkAll=document.getElementById('chk-all');
  if(chkAll){chkAll.checked=false;chkAll.indeterminate=false;}
  _updateBulkBar();
}

function deleteBulkSelected(){
  const n=selectedIds.size;
  if(!n)return;
  if(!confirm(`Delete ${n} thread${n>1?'s':''}? This cannot be undone.`))return;
  T=T.filter(t=>!selectedIds.has(t.id));
  selectedIds.clear();
  save();updateBadges();
  if(view==='dashboard')renderDash();
  renderList();
  toast(`${n} thread${n>1?'s':''} deleted.`,'info');
}

function toggleColPicker(e){
  e.stopPropagation();
  const el=document.getElementById('col-picker');
  if(el.style.display==='none'){
    el.innerHTML=
      '<div class="col-pick-sep">Default</div>'+
      COLS.filter(c=>c.def).map(c=>`
        <label class="col-pick-item">
          <input type="checkbox" ${colVis[c.key]?'checked':''} onchange="toggleCol('${c.key}',this.checked)"/>
          <span>${c.label}</span>
        </label>`).join('')+
      '<div class="col-pick-sep">Optional</div>'+
      COLS.filter(c=>!c.def).map(c=>`
        <label class="col-pick-item">
          <input type="checkbox" ${colVis[c.key]?'checked':''} onchange="toggleCol('${c.key}',this.checked)"/>
          <span>${c.label}</span>
        </label>`).join('');
    el.style.display='block';
  } else {
    el.style.display='none';
  }
}

function toggleCol(key,on){
  colVis[key]=on;
  saveColVis();
  applyColVisibility();
}

function applyColVisibility(){
  document.querySelectorAll('[data-col]').forEach(el=>{
    el.style.display=colVis[el.dataset.col]===false?'none':'';
  });
}
function initColumnResize(){
  const headers=document.querySelectorAll('.tbl thead th');
  headers.forEach((th,idx)=>{
    if(th.querySelector('.col-resizer')) return;

    const handle=document.createElement('span');
    handle.className='col-resizer';
    handle.addEventListener('mousedown',e=>startColumnResize(e,idx));
    handle.addEventListener('click',e=>e.stopPropagation());
    th.appendChild(handle);
  });
}

function startColumnResize(e,idx){
  e.preventDefault();
  e.stopPropagation();

  const headers=document.querySelectorAll('.tbl thead th');
  const th=headers[idx];
  if(!th) return;

  const key=TABLE_COL_KEYS[idx]||`col${idx}`;
  const min=COL_MIN_WIDTHS[key]||80;
  const startX=e.pageX;
  const startWidth=th.offsetWidth;

  isResizingCol=true;
  let moved=false;

  document.body.classList.add('col-resizing');

  function onMove(ev){
    const delta=ev.pageX-startX;
    if(Math.abs(delta)>2) moved=true;

    const next=Math.max(min,startWidth+delta);
    colWidths[key]=next;
    applyColumnWidths();
  }

  function onUp(){
    document.removeEventListener('mousemove',onMove);
    document.removeEventListener('mouseup',onUp);
    document.body.classList.remove('col-resizing');
    saveColWidths();

    // prevent the header click from firing sort after resize
    if(moved){
      suppressSortClick=true;
      setTimeout(()=>{ suppressSortClick=false; }, 0);
    }

    isResizingCol=false;
  }

  document.addEventListener('mousemove',onMove);
  document.addEventListener('mouseup',onUp);
}

function applyColumnWidths(){
  const headers=document.querySelectorAll('.tbl thead th');

  headers.forEach((th,idx)=>{
    const key=TABLE_COL_KEYS[idx]||`col${idx}`;
    const min=COL_MIN_WIDTHS[key]||80;
    const width=colWidths[key];

    th.style.minWidth=`${min}px`;
    if(width) th.style.width=`${width}px`;
    else th.style.width='';

    document.querySelectorAll(`#threads-list tr`).forEach(tr=>{
      const td=tr.children[idx];
      if(!td) return;
      td.style.minWidth=`${min}px`;
      if(width) td.style.width=`${width}px`;
      else td.style.width='';
    });
  });
}
// close picker when clicking outside
document.addEventListener('click',function(e){
  const wrap=document.getElementById('col-picker-wrap');
  const picker=document.getElementById('col-picker');
  if(wrap&&picker&&!wrap.contains(e.target)){picker.style.display='none';}
});

/* ── AGEING CALCULATION ── */
function calcAgeing(t){
  if(!t.targetDate)return null;         // no due date → —
  if(t.status==='Closed')return 0;      // closed → 0
  const today=new Date();today.setHours(0,0,0,0);
  const due=new Date(t.targetDate);due.setHours(0,0,0,0);
  return Math.round((due-today)/86400000);
}

/* ── FILTER FUNCTIONS ── */
function applyFilters(){renderList();}
function clearFilters(){
overdueFilter=false;actionFilter=false;dueTodayFilter=false;upcomingFilter=false;dueSoonFilter=false;dueLaterFilter=false;searchQ='';
  document.getElementById('gs').value='';
  document.getElementById('f-st').value='';
  document.getElementById('f-pr').value='';
  document.getElementById('f-fo').value='';
  document.getElementById('f-pe').value='';
  document.getElementById('f-tg').value='';
  document.getElementById('cf-btn').style.display='none';
  renderList();
}

function _sortValue(t,col){
  switch(col){
    case 'title':      return (t.title||'').toLowerCase();
    case 'priority': {
      const o={Low:1,Medium:2,High:3,Critical:4};
      return o[t.priority]||0;
    }
    case 'status':     return (t.status||'').toLowerCase();
    case 'owner':      return (t.responsible||'').toLowerCase();
    case 'forum':      return (t.forum||'').toLowerCase();
    case 'duedate':    return t.targetDate||'';
    case 'ageing': {
      const ag=calcAgeing(t);
      return ag===null ? Number.POSITIVE_INFINITY : ag;
    }
    case 'comments':   return (t.history||[]).length;
    case 'created':    return t.createdAt||0;
    default:           return '';
  }
}

function _compare(a,b,dir){
  if(a===b)return 0;
  if(a>b)return dir===1?1:-1;
  return dir===1?-1:1;
}
function _threadDaysFromToday(t){
  if(!t.targetDate) return null;

  const today = new Date();
  today.setHours(0,0,0,0);

  const parts = String(t.targetDate).split('-');
  if(parts.length !== 3) return null;

  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  d.setHours(0,0,0,0);

  if(isNaN(d.getTime())) return null;

  return Math.round((d - today) / 86400000);
}
function getFiltered(){
  let r=[...T];
  r=r.filter(t=>t.radarType!=='note');
  const st=document.getElementById('f-st').value;
  const pr=document.getElementById('f-pr').value;
  const fo=document.getElementById('f-fo').value;
  const pe=document.getElementById('f-pe').value;
  const tg=document.getElementById('f-tg').value;

  if(st)r=r.filter(t=>t.status===st);
  if(pr)r=r.filter(t=>t.priority===pr);
  if(fo)r=r.filter(t=>t.forum===fo);
  if(pe)r=r.filter(t=>t.responsible===pe);
  if(tg)r=r.filter(t=>(t.tags||[]).includes(tg));
if(overdueFilter)r=r.filter(isOvd);
if(actionFilter)r=r.filter(t=>
  t.radarType!=='note' &&
  t.status==='Open' &&
  (
    t.priority==='High' ||
    t.priority==='Critical'
  )
);if(dueTodayFilter)r=r.filter(t=>t.status!=='Closed' && _threadDaysFromToday(t)===0);

if(upcomingFilter)r=r.filter(t=>{
  const d=_threadDaysFromToday(t);
  return t.status!=='Closed' && d!==null && d>0 && d<=7;
});

if(dueSoonFilter)r=r.filter(t=>{
  const d=_threadDaysFromToday(t);
  return t.status!=='Closed' && d!==null && d>=1 && d<=3;
});

if(dueLaterFilter)r=r.filter(t=>{
  const d=_threadDaysFromToday(t);
  return t.status!=='Closed' && d!==null && d>=4 && d<=7;
});

  if(searchQ){
    r=r.filter(t=>{
      const cmt=(t.history||[]).map(h=>(h.text+' '+h.author).toLowerCase()).join(' ');
      return [t.title,t.responsible,t.forum,t.category,t.subcategory,t.notes,t.participants,(t.tags||[]).join(' ')]
        .some(v=>v&&v.toLowerCase().includes(searchQ)) || cmt.includes(searchQ);
    });
  }

  // Header sort takes priority; 3rd click returns to default sort
  if(colSort.col && colSort.dir){
    r.sort((a,b)=>_compare(_sortValue(a,colSort.col),_sortValue(b,colSort.col),colSort.dir));
  } else {
    const s=SORTS[sortIdx];
    r.sort((a,b)=>{
      let av=a[s.f]||'',bv=b[s.f]||'';
      if(s.f==='priority'){
        const o={Critical:4,High:3,Medium:2,Low:1};
        av=o[av]||0;
        bv=o[bv]||0;
      }
      return s.d==='asc'?(av<bv?-1:av>bv?1:0):(av>bv?-1:av<bv?1:0);
    });
  }

  return r;
}
function toggleHeaderSort(col){
  if(isResizingCol || suppressSortClick) return;

  if(colSort.col!==col){
    colSort={col,dir:1};          // 1st click = ascending
  } else if(colSort.dir===1){
    colSort.dir=-1;               // 2nd click = descending
  } else {
    colSort={col:'',dir:0};       // 3rd click = default sort
  }
  renderList();
}

function updateHeaderSortUI(){
  // Clear all arrows
  document.querySelectorAll('.sort-ind').forEach(el => el.textContent = '');

  // Remove active highlight
  document.querySelectorAll('.th-sortable').forEach(el => el.classList.remove('is-sorted'));

  // If no sorting applied, exit
  if(!colSort.col || !colSort.dir) return;

  // Find active header
  const th = document.querySelector(`.th-sortable[data-sort="${colSort.col}"]`);
  if(!th) return;

  // Highlight active header
  th.classList.add('is-sorted');

  // Find arrow span inside that header
  const ind = th.querySelector('.sort-ind');
  if(ind){
    ind.textContent = colSort.dir === 1 ? '↑' : '↓';
  }
}

function getForumLabel(key){
  const f=[...FORUMS, FORUM_ARCHIVE].find(x => x.key === key);
  return f ? f.label : (key || '—');
}
function renderList(){
  // populate person filter
  const ppl=[...new Set(T.map(t=>t.responsible).filter(Boolean))].sort();
  const pf=document.getElementById('f-pe');const pv=pf.value;
  pf.innerHTML=`<option value="">All People</option>`+ppl.map(p=>`<option value="${esc(p)}"${pv===p?' selected':''}>${esc(p)}</option>`).join('');

  const filtered=getFiltered();
  document.getElementById('tv-sub').textContent=`${filtered.length} thread${filtered.length!==1?'s':''}`;

const hasFilt=[document.getElementById('f-st').value,document.getElementById('f-pr').value,document.getElementById('f-fo').value,document.getElementById('f-pe').value,document.getElementById('f-tg').value,overdueFilter,actionFilter,dueTodayFilter,upcomingFilter,dueSoonFilter,dueLaterFilter,searchQ].some(Boolean);  document.getElementById('cf-btn').style.display=hasFilt?'inline-flex':'none';
renderActiveFilterChips();
  const tbody=document.getElementById('threads-list');

if(!filtered.length){
    tbody.innerHTML=`<tr><td colspan="20"><div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
      <h3>No threads found</h3>
      <p>Try adjusting your filters or create a new thread.</p>
    </div></td></tr>`;
    applyColVisibility();
    _updateBulkBar();
    updateHeaderSortUI();
    initColumnResize();
    applyColumnWidths();
    return;
  }

  const pmap={Critical:'pC',High:'pH',Medium:'pM',Low:'pL'};

  tbody.innerHTML=filtered.map(t=>{
    const ov=isOvd(t);
    const tags=(t.tags||[]);
    const pmapCls=pmap[t.priority]||'pM';
    const ownerInitials=ini(t.responsible||'?');
    const ownerColor=avc(t.responsible||'');
    const commentCount=t.history?.length||0;

    // Ageing
    const ag=calcAgeing(t);
    let agTxt,agCls='ag-neutral';
    if(ag===null){agTxt='—';}
    else if(ag===0){agTxt='0';}
    else if(ag>0){agTxt=String(ag);agCls='ag-pos';}
    else{agTxt=String(ag);agCls='ag-neg';}

    return `<tr class="trow ${pmapCls}${ov?' ov':''}" id="row-${esc(t.id)}" onclick="openDetail('${esc(t.id)}')">
      <td class="td-chk" onclick="event.stopPropagation()">
        <input type="checkbox" class="row-chk" data-id="${esc(t.id)}"
               ${selectedIds.has(t.id)?'checked':''} onclick="toggleRowSelect(this)"/>
      </td>
        <td class="td-p" data-col="priority">
        ${priBadge(t.priority || 'Medium')}
        </td>
      <td class="td-title">
        <span class="ttitle">${esc(t.title)}</span>
        ${tags.length?`<div class="row-tags">${tags.map(tg=>`<span class="tg ${tg}">${esc(tg)}</span>`).join('')}</div>`:''}
      </td>
      <td class="td-status" data-col="status">${stBadge(t.status)}</td>
      <td class="td-owner"  data-col="owner">
        <div class="owner-cell">
          <div class="oav" style="background:${ownerColor}">${ownerInitials}</div>
          <span class="owner-name">${esc(t.responsible||'—')}</span>
        </div>
      </td>
      <td class="td-forum" data-col="forum">
      <span class="forum-pill">${esc(getForumLabel(t.forum))}</span>      </td>
      <td class="td-date${ov?' ovd-cell':''}" data-col="duedate">${ov?'⚠ ':''} ${fd(t.targetDate)}</td>
      <td class="td-age" data-col="ageing">
        <span class="ag-badge ${agCls}">${agTxt}</span>
      </td>
      <td class="td-cmt" data-col="comments">${commentCount||'—'}</td>
      <td class="td-cat"  data-col="category">${esc(t.category||'—')}</td>
      <td class="td-sub"  data-col="subcat">${esc(t.subcategory||'—')}</td>
      <td class="td-part" data-col="participants">${esc(t.participants||'—')}</td>
      <td class="td-crd"  data-col="created">${fd(new Date(t.createdAt).toISOString().split('T')[0])}</td>
      <td class="td-act" onclick="event.stopPropagation()">
        <div class="row-acts">
          <button class="ract" onclick="addToRadar('${esc(t.id)}')" title="Add to Action Radar">
           🎯
          </button>
            <button class="ract" onclick="updateThreadPriority('${esc(t.id)}')" title="Set Priority">
            ⚑
            </button>
          <button class="ract" onclick="editThread('${esc(t.id)}')" title="Edit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="ract del" onclick="delThread('${esc(t.id)}')" title="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');

   // Apply column visibility after every render
  applyColVisibility();
  // Restore checkbox states & bulk bar after re-render
  _updateBulkBar();
  updateHeaderSortUI();
  initColumnResize();
  applyColumnWidths();
}


