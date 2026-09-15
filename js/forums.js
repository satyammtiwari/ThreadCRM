/* FORUMS — CRUD + sync */

/* ── Sync all dynamic forum references everywhere ── */
function syncForums(){
  renderSidebarForums();
  syncForumDropdowns();
  updateBadges();
  if(view==='dashboard')renderForums();
}

/* ── Sidebar: rebuild the dynamic forum list ── */
function renderSidebarForums(){
  const el=document.getElementById('sb-forums');
  if(!el)return;

  const allForums=[...FORUMS, FORUM_ARCHIVE];

  el.innerHTML=allForums.map((f,i)=>`
    <div class="ni forum-ni forum-color-${i+1}" data-forum="${esc(f.key)}" onclick="navTo({forum:'${esc(f.key)}'})">
      <span>${esc(f.label)}</span>
      <span class="nb" id="nb-${esc(f.key)}">${T.filter(t=>t.forum===f.key).length||0}</span>
    </div>`).join('');
}

/* ── Sync forum <select> in filter bar + thread modal ── */
function syncForumDropdowns(){
  // Filter bar dropdown
  const ff=document.getElementById('f-fo');
  if(ff){
    const cv=ff.value;
    ff.innerHTML=`<option value="">All Forums</option>`+
      FORUMS.map(f=>`<option value="${esc(f.key)}">${esc(f.label)}</option>`).join('')+
      `<option value="Archive">Archive</option>`;
    if([...ff.options].some(o=>o.value===cv))ff.value=cv;
  }
  // New/edit thread modal forum select
  const mf=document.getElementById('f-forum');
  if(mf){
    const mv=mf.value;
    mf.innerHTML=FORUMS.map(f=>`<option value="${esc(f.key)}">${esc(f.label)}</option>`).join('');
    if([...mf.options].some(o=>o.value===mv))mf.value=mv;
    else if(mf.options.length)mf.value=mf.options[0].value;
  }
}

/* ── Forum Manager Modal ── */
function openForumManager(){
  renderForumManager();
  document.getElementById('mo-forums').classList.add('open');
}
function closeForumManager(){
  document.getElementById('mo-forums').classList.remove('open');
}

function renderForumManager(){
  const list=document.getElementById('fm-list');
  list.innerHTML=FORUMS.map((f,i)=>`
    <div class="fm-row" id="fm-row-${i}">
      <input type="color" class="fm-color" value="${f.color}"
             onchange="updateForumColor(${i},this.value)"/>
      <input type="text"  class="fm-name fi" value="${esc(f.label)}"
             onblur="updateForumLabel(${i},this.value)"
             onkeydown="if(event.key==='Enter')this.blur()"/>
      <button class="ract del" onclick="deleteForum(${i})" title="Delete forum">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
        </svg>
      </button>
    </div>`).join('');
}

function updateForumColor(i,color){
  FORUMS[i].color=color;
  saveForums();syncForums();renderForumManager();
}
function updateForumLabel(i,val){
  const v=val.trim();
  if(!v){toast('Forum name cannot be empty.','error');renderForumManager();return;}
  const oldKey=FORUMS[i].key;
  FORUMS[i].label=v;
  // key stays the same — label is display only
  saveForums();syncForums();renderForumManager();
  toast('Forum updated.','success');
}

function addForum(){
  const inp=document.getElementById('fm-new-name');
  const col=document.getElementById('fm-new-color');
  const name=inp.value.trim();
  if(!name){toast('Enter a forum name.','error');inp.focus();return;}
  // generate a unique key from the name
  const key=name.replace(/\s+/g,'-').toLowerCase()+'-'+Date.now().toString(36);
  FORUMS.push({key,label:name,color:col.value});
  saveForums();syncForums();renderForumManager();
  inp.value='';col.value='#6c63ff';
  toast(`Forum "${name}" added.`,'success');
}

function deleteForum(i){
  const f=FORUMS[i];
  const count=T.filter(t=>t.forum===f.key).length;
  const msg=count>0
    ?`Delete "${f.label}"? ${count} thread${count>1?'s':''} will be moved to Archive.`
    :`Delete "${f.label}"?`;
  if(!confirm(msg))return;
  // move threads to Archive
  T.forEach(t=>{if(t.forum===f.key)t.forum='Archive';});
  save();
  FORUMS.splice(i,1);
  saveForums();syncForums();renderForumManager();
  toast(`"${f.label}" deleted. Threads moved to Archive.`,'info');
}

/* ══════════════════════════════════════
   EXCEL IMPORT
══════════════════════════════════════ */

/* Default column map — user's Excel headers → tool fields.
   Saved to localStorage so changes persist across imports.  */
const IMP_DEFAULT_MAP={
  'Item/Title/Taks':        'title',
  'Responsibility':         'responsible',
  'Status':                 'status',
  'T . Date(due date)':     'targetDate',
  'Category':               'category',
  'Sub Category':           'subcategory',
  'Next Steps / Comments':  'notes',
  'T. Aging':               '__skip__',
};

const TOOL_FIELDS=[
  {key:'title',        label:'Title *'},
  {key:'responsible',  label:'Responsible'},
  {key:'status',       label:'Status'},
  {key:'priority',     label:'Priority'},
  {key:'targetDate',   label:'Target Date'},
  {key:'category',     label:'Category'},
  {key:'subcategory',  label:'Sub Category'},
  {key:'notes',        label:'Notes'},
  {key:'participants', label:'Participants'},
  {key:'__skip__',     label:'-- Skip --'},
];

/* Import state */
let _impStep=1;         // 1=file, 2=sheet, 3=map, 4=preview
let _impWorkbook=null;
let _impSheetName='';
let _impRows=[];        // parsed rows (array of objects)
let _impHeaders=[];     // column headers from chosen sheet
let _impMap={};         // current mapping {excelHeader: toolField}
let _impForumKey='';

function loadImpMap(){
  try{const r=localStorage.getItem('tcrm_imp_map');return r?JSON.parse(r):Object.assign({},IMP_DEFAULT_MAP);}
  catch(e){return Object.assign({},IMP_DEFAULT_MAP);}
}
function saveImpMap(){localStorage.setItem('tcrm_imp_map',JSON.stringify(_impMap));}

/* ── Open / Close ── */
function openImportModal(){
  _impForumKey=window._activeForumKey||'';
  if(!_impForumKey){toast('Please open a specific forum before importing.','error');return;}
  const f=[...FORUMS,FORUM_ARCHIVE].find(x=>x.key===_impForumKey);
  document.getElementById('imp-forum-label').textContent=f?f.label:_impForumKey;
  _impStep=1;_impWorkbook=null;_impSheetName='';_impRows=[];_impHeaders=[];
  _impMap=loadImpMap();
  renderImpStep();
  document.getElementById('mo-import').classList.add('open');
}
function closeImportModal(){document.getElementById('mo-import').classList.remove('open');}

/* ── Step router ── */
function importNextStep(){
  if(_impStep===1)_doStep1();
  else if(_impStep===2)_doStep2();
  else if(_impStep===3)_doStep3();
  else if(_impStep===4)_doStep4();
}

function renderImpStep(){
  const body=document.getElementById('imp-body');
  const actionBtn=document.getElementById('imp-action-btn');
  if(_impStep===1){
    actionBtn.textContent='Load File →';
    body.innerHTML=`
      <div class="ict">Step 1 of 4 — Choose your Excel or CSV file</div>
      <div class="imp-upload-area" onclick="document.getElementById('imp-file').click()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:36px;height:36px;color:var(--t3)"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        <div style="margin-top:10px;font-size:13px;color:var(--t2)">Click to browse or drop your file here</div>
        <div style="font-size:11px;color:var(--t3);margin-top:4px">.xlsx, .xls, .csv supported</div>
        <div id="imp-file-name" style="margin-top:8px;font-size:12px;color:var(--ac);font-weight:600"></div>
      </div>
      <input type="file" id="imp-file" accept=".xlsx,.xls,.csv" style="display:none"
             onchange="_onFileChosen(this)"/>`;
  } else if(_impStep===2){
    const sheets=_impWorkbook.SheetNames;
    actionBtn.textContent='Select Sheet →';
    body.innerHTML=`
      <div class="ict">Step 2 of 4 — Select Sheet</div>
      <div style="font-size:12.5px;color:var(--t2);margin-bottom:10px">Your file has ${sheets.length} sheet${sheets.length>1?'s':''}. Choose which one to import from:</div>
      ${sheets.map(s=>`
        <label class="col-pick-item" style="padding:9px 12px;border:1px solid var(--border);border-radius:var(--r-md);margin-bottom:6px;cursor:pointer">
          <input type="radio" name="imp-sheet" value="${esc(s)}" ${s===sheets[0]?'checked':''} style="accent-color:var(--ac)"/>
          <span style="font-weight:500">${esc(s)}</span>
        </label>`).join('')}`;
  } else if(_impStep===3){
    actionBtn.textContent='Preview →';
    body.innerHTML=`
      <div class="ict">Step 3 of 4 — Map Columns</div>
      <div style="font-size:12px;color:var(--t2);margin-bottom:12px">Match your Excel columns to the tool fields. Your last mapping is pre-filled.</div>
      <div class="imp-map-grid">
        <div class="imp-map-hd">Your Excel Column</div>
        <div class="imp-map-hd">Tool Field</div>
        ${_impHeaders.map(h=>`
          <div class="imp-map-col">${esc(h)}</div>
          <select class="fsel imp-map-sel" data-header="${esc(h)}" style="width:100%">
            ${TOOL_FIELDS.map(tf=>`<option value="${tf.key}" ${(_impMap[h]===tf.key)?'selected':''}>${tf.label}</option>`).join('')}
          </select>`).join('')}
      </div>`;
  } else if(_impStep===4){
    actionBtn.textContent=`Import ${_impRows.length} row${_impRows.length!==1?'s':''}`;
    const preview=_impRows.slice(0,3);
    const mapped=_impHeaders.filter(h=>_impMap[h]!=='__skip__');
    body.innerHTML=`
      <div class="ict">Step 4 of 4 — Preview</div>
      <div style="font-size:12px;color:var(--t2);margin-bottom:10px">
        Showing first ${preview.length} of <strong>${_impRows.length}</strong> rows that will be added to <strong>${esc(([...FORUMS,FORUM_ARCHIVE].find(x=>x.key===_impForumKey)||{label:_impForumKey}).label)}</strong>.
      </div>
      <div style="overflow-x:auto">
        <table class="tbl" style="font-size:11.5px">
          <thead><tr>${mapped.map(h=>`<th style="padding:6px 10px">${esc(h)}</th>`).join('')}</tr></thead>
          <tbody>${preview.map(row=>`<tr>${mapped.map(h=>`<td style="padding:6px 10px;border-bottom:1px solid var(--border-s)">${esc(String(row[h]||''))}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </div>
      <label class="col-pick-item" style="margin-top:14px;padding:8px 4px">
        <input type="checkbox" id="imp-clear-chk" style="accent-color:var(--ac)"/>
        <span style="font-size:12px">Clear existing threads in this forum before importing</span>
      </label>`;
  }
}

/* ── Step handlers ── */
function _onFileChosen(input){
  const file=input.files[0];if(!file)return;
  document.getElementById('imp-file-name').textContent='✓ '+file.name;
  const reader=new FileReader();
  reader.onload=function(e){
    try{
      _impWorkbook=XLSX.read(e.target.result,{type:'binary',cellDates:true});
    }catch(err){toast('Could not read file. Make sure it is .xlsx, .xls or .csv.','error');return;}
  };
  reader.readAsBinaryString(file);
}

function _doStep1(){
  if(!_impWorkbook){toast('Please choose a file first.','error');return;}
  _impStep=2;renderImpStep();
}

function _doStep2(){
  const sel=document.querySelector('input[name="imp-sheet"]:checked');
  if(!sel){toast('Please select a sheet.','error');return;}
  _impSheetName=sel.value;
  const ws=_impWorkbook.Sheets[_impSheetName];
  const raw=XLSX.utils.sheet_to_json(ws,{defval:'',raw:true,cellDates:true});
  if(!raw.length){toast('The selected sheet appears to be empty.','error');return;}
  _impRows=raw;
  _impHeaders=Object.keys(raw[0]);
  // Merge saved map — add any new headers with __skip__ default
  _impHeaders.forEach(h=>{if(!(_impMap[h]))_impMap[h]=IMP_DEFAULT_MAP[h]||'__skip__';});
  _impStep=3;renderImpStep();
}

function _doStep3(){
  // Read current dropdown selections into _impMap
  document.querySelectorAll('.imp-map-sel').forEach(sel=>{
    _impMap[sel.dataset.header]=sel.value;
  });
  saveImpMap(); // persist for next time
  const hasTitle=Object.values(_impMap).includes('title');
  if(!hasTitle){toast('At least one column must be mapped to Title.','error');return;}
  _impStep=4;renderImpStep();
}

/* ── Central date parser — handles all known formats ──
   Priority order:
   1. JS Date object  (from cellDates:true — Excel serial, year intact)
   2. DD-Mon-YY       e.g. 20-Dec-25  → 20-Dec-2025
   3. DD-Mon-YYYY     e.g. 20-Dec-2025
   4. DD-MM-YYYY      e.g. 28-04-2026
   5. DD/MM/YYYY      e.g. 28/04/2026
   6. YYYY-MM-DD ISO  e.g. 2026-04-28
   7. Fallback native Date() — last resort
   Returns 'YYYY-MM-DD' string or '' if unparseable.              */
function parseExcelDate(val){
  if(!val&&val!==0)return'';

  // 1. Already a JS Date (cellDates:true gives us this for serial dates)
  if(val instanceof Date){
    if(isNaN(val.getTime()))return'';
    return`${val.getFullYear()}-${String(val.getMonth()+1).padStart(2,'0')}-${String(val.getDate()).padStart(2,'0')}`;
  }

  const s=String(val).trim();
  if(!s)return'';

  const MON={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,
             jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};

  // 2 & 3. DD-Mon-YY or DD-Mon-YYYY  (e.g. 20-Dec-25 or 20-Dec-2025)
  const m1=s.match(/^(\d{1,2})[- ]([A-Za-z]{3})[- ](\d{2,4})$/);
  if(m1){
    const day=m1[1].padStart(2,'0');
    const mon=MON[m1[2].toLowerCase()];
    if(mon){
      let yr=parseInt(m1[3],10);
      if(yr<100)yr+=yr>=50?1900:2000; // 25→2025, 26→2026, 99→1999
      return`${yr}-${String(mon).padStart(2,'0')}-${day}`;
    }
  }

  // 4. DD-MM-YYYY
  const m2=s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if(m2)return`${m2[3]}-${m2[2].padStart(2,'0')}-${m2[1].padStart(2,'0')}`;

  // 5. DD/MM/YYYY
  const m3=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(m3)return`${m3[3]}-${m3[2].padStart(2,'0')}-${m3[1].padStart(2,'0')}`;

  // 6. ISO YYYY-MM-DD — reliable with native Date
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;

  // 7. Last resort — native Date (may misparse DD-MM without year)
  const d=new Date(s);
  if(!isNaN(d.getTime()))
    return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  return''; // give up cleanly
}

function _doStep4(){
  // Clear forum threads if checkbox checked
  const clr=document.getElementById('imp-clear-chk');
  if(clr&&clr.checked)T=T.filter(t=>t.forum!==_impForumKey);

  // Build status normalizer
  const statusMap={'open':'Open','in progress':'In Progress','inprogress':'In Progress',
    'closed':'Closed','done':'Closed','complete':'Closed','completed':'Closed'};

  let imported=0;
  _impRows.forEach(row=>{
    const thread={id:uid(),forum:_impForumKey,history:[],tags:[],
      createdAt:Date.now(),updatedAt:Date.now(),priority:'Medium',status:'Open'};
    _impHeaders.forEach(h=>{
      const field=_impMap[h];if(field==='__skip__'||!field)return;
      const raw=row[h];
      if(raw===''||raw===null||raw===undefined)return;
      let val=raw;
      if(field==='status'){
        val=statusMap[String(raw).trim().toLowerCase()]||'Open';
      } else if(field==='targetDate'){
        val=parseExcelDate(raw); // use central parser — handles all formats
      } else {
        val=String(raw).trim();
        if(!val)return;
      }
      thread[field]=val;
    });
    if(!thread.title)return; // skip rows with no title
    T.unshift(thread);
    imported++;
  });

  save();
  syncForums();
  closeImportModal();
  toast(`${imported} thread${imported!==1?'s':''} imported into ${([...FORUMS,FORUM_ARCHIVE].find(x=>x.key===_impForumKey)||{label:_impForumKey}).label}.`,'success');
  if(view==='threads')renderList();
}
