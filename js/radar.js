const RADAR_THREADS_KEY='tcrm_radar_threads_v2';
let RADAR_THREADS_CACHE=null;
let currentRadarThreadId=null;
let currentRadarItemFilter='All';
const RADAR_RESTORE_THREAD_KEY='tcrm_restore_radar_thread_once';
window.addEventListener('beforeunload',()=>{
  if(currentRadarThreadId){
    sessionStorage.setItem(RADAR_RESTORE_THREAD_KEY,currentRadarThreadId);
  }else{
    sessionStorage.removeItem(RADAR_RESTORE_THREAD_KEY);
  }
});
function _todayStr(){
  return new Date().toISOString().split('T')[0];
}

function _parseDateSafe(v){
  if(!v)return null;
  const d=new Date(v);
  if(isNaN(d.getTime()))return null;
  d.setHours(0,0,0,0);
  return d;
}

function _daysDiffFromToday(v){
  const d=_parseDateSafe(v);
  if(!d)return null;

  const today=new Date();
  today.setHours(0,0,0,0);

  return Math.round((today-d)/86400000);
}
function _getRadarItemReviewDate(item){
  return item.targetDiscussionDate || item.nextReviewDate || item.reviewDate || item.followupDate || '';
}

function _isItemReviewActive(item){
  const status=String(item?.status || 'Pending Discussion').toLowerCase();

  return ![
    'discussed',
    'closed',
    'action created'
  ].includes(status);
}

function _isItemDueToday(item){
  if(!_isItemReviewActive(item))return false;

  const reviewDate=_getRadarItemReviewDate(item);
  if(!reviewDate)return false;

  return reviewDate===_todayStr();
}

function _isItemOverdue(item){
  if(!_isItemReviewActive(item))return false;

  const reviewDate=_parseDateSafe(_getRadarItemReviewDate(item));
  if(!reviewDate)return false;

  const today=new Date();
  today.setHours(0,0,0,0);

  return reviewDate<today;
}

function _isItemPending(item){
  return _isItemReviewActive(item);
}

function _fmtDate(v){
  return v ? fd(v) : '—';
}

function getRadarThreads(){
  if(Array.isArray(RADAR_THREADS_CACHE))return RADAR_THREADS_CACHE;

  let data=JSON.parse(localStorage.getItem(RADAR_THREADS_KEY)||'null');

  if(!data){
    data=[
      {
        id:'rt-bae',
        title:'BAE',
        owner:'RAGS',
        startDate:'2026-05-17',
        reviewDate:'2026-05-25',
        description:'BAE program related topics and operational focus items',
        priority:'High',
        status:'Needs Attention',
        createdAt:Date.now(),
        items:[
          {
            id:'ri-1',
            title:'UAT Cycle-2 timeline clarification',
            todayPoint:'Confirm whether DM fixes are included in Cycle-2 scope.',
            lastDiscussed:'2026-05-18',
            followupDate:'2026-05-21',
            nextStep:'Confirm with Product team',
            status:'Pending Discussion',
            owner:'RAGS',
            source:'Mail',
            createdAt:'2026-05-18'
          },
          {
            id:'ri-2',
            title:'DM validation concern',
            todayPoint:'Review latest validation gaps shared by stakeholder.',
            lastDiscussed:'',
            followupDate:'2026-05-20',
            nextStep:'Discuss in 1PM forum',
            status:'Carried Forward',
            owner:'Shivesh',
            source:'Stakeholder',
            createdAt:'2026-05-17'
          }
        ]
      },
      {
        id:'rt-nexteer',
        title:'Nexteer',
        description:'Nexteer related discussions, follow-ups and dependencies',
        priority:'Medium',
        status:'Active',
        createdAt:Date.now(),
        items:[
          {
            id:'ri-3',
            title:'Change Set 5 validation',
            todayPoint:'Confirm if validation feedback is ready.',
            lastDiscussed:'',
            followupDate:'2026-05-22',
            nextStep:'Follow up with team',
            status:'Pending Discussion',
            owner:'RAGS',
            source:'Chat',
            createdAt:'2026-05-19'
          }
        ]
      },
      {
        id:'rt-demo',
        title:'Demo Site',
        description:'Demo site enhancements, issues and client feedback',
        priority:'High',
        status:'Needs Attention',
        createdAt:Date.now(),
        items:[
          {
            id:'ri-4',
            title:'Demo site verification',
            todayPoint:'Check whether latest deployment issues are resolved.',
            lastDiscussed:'2026-05-17',
            followupDate:'2026-05-18',
            nextStep:'Revalidate and confirm',
            status:'Action Required',
            owner:'Rishi',
            source:'Internal',
            createdAt:'2026-05-16'
          }
        ]
      }
    ];

    localStorage.setItem(RADAR_THREADS_KEY,JSON.stringify(data));
  }
  RADAR_THREADS_CACHE=data;
  return data;
}

function saveRadarThreads(data){
  RADAR_THREADS_CACHE=Array.isArray(data) ? data : [];

  localStorage.setItem(RADAR_THREADS_KEY,JSON.stringify(RADAR_THREADS_CACHE));

  if(typeof saveRadarThreadsToFirestore==='function'){
    saveRadarThreadsToFirestore(RADAR_THREADS_CACHE);
  }
}
async function initRadarThreadsFromFirestore(){
  try{
    if(typeof loadRadarThreadsFromFirestore!=='function')return;

    const firestoreRows = await loadRadarThreadsFromFirestore();

    if(Array.isArray(firestoreRows) && firestoreRows.length){
      RADAR_THREADS_CACHE = firestoreRows;
      localStorage.setItem(RADAR_THREADS_KEY,JSON.stringify(RADAR_THREADS_CACHE));
      return;
    }

    const localRows = getRadarThreads();

    if(Array.isArray(localRows) && localRows.length){
      RADAR_THREADS_CACHE = localRows;
      await saveRadarThreadsToFirestore(RADAR_THREADS_CACHE);
      console.log('Local radar threads migrated to Firestore:',RADAR_THREADS_CACHE.length);
    }
  }catch(err){
    console.error('initRadarThreadsFromFirestore failed:',err);
  }
}

function getRadarThreadSummary(rt){
  let items=rt.items||[];

  if(currentRadarItemFilter && currentRadarItemFilter!=='All'){
    items=items.filter(x=>x.status===currentRadarItemFilter);
  }

  const total=items.length;
  const pending=items.filter(_isItemPending).length;
  const overdue=items.filter(_isItemOverdue).length;

  const manualStatus=rt.status||'Active';

  return {
    id:rt.id,
    title:rt.title,
    description:rt.description,
    priority:rt.priority||'Medium',
    status:manualStatus,
    total,
    pending,
    overdue
  };
}

function updateRadarBadge(){
  const el=document.getElementById('nb-radar');
  if(el)el.textContent=getRadarThreads().length;
}

function renderRadarWorkspace(){
 const list=document.getElementById('radar-workspace-list');
  if(!list)return;

  const restoreThreadId=sessionStorage.getItem(RADAR_RESTORE_THREAD_KEY);

  if(restoreThreadId){
    sessionStorage.removeItem(RADAR_RESTORE_THREAD_KEY);

    const exists=getRadarThreads().some(x=>x.id===restoreThreadId);

    if(exists){
      openRadarThread(restoreThreadId);
      return;
    }
  }

  currentRadarThreadId=null;
  currentRadarItemFilter='All';
  window.currentRadarItemSearch='';

  const pageTitle=document.getElementById('radar-page-title');
  const pageSub=document.getElementById('radar-sub');
  const action=document.getElementById('radar-primary-action');

  if(pageTitle)pageTitle.textContent='Focus Areas Overview';
  if(pageSub)pageSub.textContent='Focus areas requiring daily discussion or follow-up';

  if(action){
    action.textContent='+ New Focus Area';
    action.onclick=()=>openRadarThreadModal();
  }

  const threads=getRadarThreads();
  const rows=threads.map(rt=>getRadarThreadSummary(rt));

  const totalThreads=rows.length;
  const pendingTotal=rows.reduce((a,x)=>a+x.pending,0);
  const overdueTotal=rows.reduce((a,x)=>a+x.overdue,0);
  const attentionTotal=rows.filter(x=>x.status==='Needs Attention' || x.status==='Critical').length;
  list.innerHTML=`
    <div class="radar-overview-wrap">

      <div class="focus-detail-summary radar-overview-summary">
        <div class="focus-summary-card total">
          <strong>${totalThreads}</strong>
          <span>Focus Areas</span>
          <small>Total active areas</small>
        </div>

        <div class="focus-summary-card due">
          <strong>${pendingTotal}</strong>
          <span>Pending Items</span>
          <small>Need discussion</small>
        </div>

        <div class="focus-summary-card overdue">
          <strong>${overdueTotal}</strong>
          <span>Overdue Items</span>
          <small>Past review date</small>
        </div>

        <div class="focus-summary-card waiting">
          <strong>${attentionTotal}</strong>
          <span>Needs Attention</span>
          <small>Priority focus</small>
        </div>
      </div>

      <div class="radar-overview-section">
        <div class="radar-overview-head">
          <div>
            <h3>Focus Areas</h3>
            <p>Select a focus area to review discussion items, follow-ups and next steps.</p>
          </div>
        </div>

        <div class="radar-overview-grid">
          ${
            rows.length
            ? rows.map(x=>`
              <div class="radar-overview-card" onclick="openRadarThread('${esc(x.id)}')">
                <div class="radar-overview-card-top">
                  <div class="radar-overview-icon">
                    ${esc(x.title.substring(0,1).toUpperCase())}
                  </div>

                  <div class="radar-overview-title">
                    <strong>${esc(x.title)}</strong>
                    <span>${esc(x.description||'Operational focus area')}</span>
                  </div>
                </div>

                <div class="radar-overview-metrics">
                  <div>
                    <strong>${x.total}</strong>
                    <span>Total Items</span>
                  </div>

                  <div>
                    <strong>${x.pending}</strong>
                    <span>Pending</span>
                  </div>

                  <div>
                    <strong class="${x.overdue>0?'danger':''}">${x.overdue}</strong>
                    <span>Overdue</span>
                  </div>
                </div>

                  <div class="radar-overview-footer radar-overview-footer-labeled">
                    <span class="radar-overview-meta">
                      <span class="radar-overview-meta-label">Priority:</span>
                      <span class="radar-overview-priority ${String(x.priority||'Medium').toLowerCase()}">
                        ${esc(x.priority||'Medium')}
                      </span>
                    </span>

                    <span class="radar-overview-meta">
                      <span class="radar-overview-meta-label">Status:</span>
                      <span class="radar-overview-status ${x.status==='Needs Attention'||x.status==='Critical'?'danger':'ok'}">
                        ${esc(x.status)}
                      </span>
                    </span>
                  </div>
              </div>
            `).join('')
            : `
              <div class="radar-empty-state">
                <div class="radar-empty-icon">🎯</div>
                <h3>No focus areas found</h3>
                <p>Create a focus area to start tracking discussion items and follow-ups.</p>
              </div>
            `
          }
        </div>
      </div>
    </div>
  `;
}

function openRadarThread(id){
  const threads=getRadarThreads();
  const rt=threads.find(x=>x.id===id);
  if(!rt)return;

  currentRadarThreadId=id;

  const pageTitle=document.getElementById('radar-page-title');
  const pageSub=document.getElementById('radar-sub');
  const action=document.getElementById('radar-primary-action');

  if(pageTitle)pageTitle.textContent=rt.title;
  if(pageSub)pageSub.textContent=rt.description||'Focus area details';

  if(action){
    action.textContent='+ Add Discussion Item';
    action.onclick=()=>openRadarItemModal(rt.id);
  }

  const list=document.getElementById('radar-workspace-list');
  if(!list)return;

const allItems=rt.items||[];

const isClosed=item=>String(item.status||'').toLowerCase()==='closed';

const isDiscussed=item=>{
  const s=String(item.status||'').toLowerCase();
  return s==='discussed' || s==='action created';
};

const isWaiting=item=>String(item.status||'').toLowerCase().includes('waiting');

const getReviewDate=item=>_getRadarItemReviewDate(item);

const isReviewActive=item=>_isItemReviewActive(item);

const isOverdue=item=>_isItemOverdue(item);

const isDueToday=item=>_isItemDueToday(item);

const today=_todayStr();

const discussionCount=allItems.length;
const dueCount=allItems.filter(x=>isDueToday(x) || isOverdue(x)).length;
const overdueCount=allItems.filter(isOverdue).length;
const waitingCount=allItems.filter(isWaiting).length;

  let items=[...allItems];

  if(currentRadarItemFilter && currentRadarItemFilter!=='All'){
    if(currentRadarItemFilter==='Due Today'){
      items=items.filter(isDueToday);
    }else if(currentRadarItemFilter==='Overdue'){
      items=items.filter(isOverdue);
    }else if(currentRadarItemFilter==='Waiting on Others'){
      items=items.filter(isWaiting);
    }else if(currentRadarItemFilter==='Discussed'){
      items=items.filter(isDiscussed);
    }else if(currentRadarItemFilter==='Closed'){
      items=items.filter(isClosed);
    }
  }

  const searchValue=(window.currentRadarItemSearch||'').toLowerCase().trim();

  if(searchValue){
    items=items.filter(item=>{
      return [
        item.title,
        item.todayPoint,
        item.nextStep,
        item.status
      ].join(' ').toLowerCase().includes(searchValue);
    });
  }

  list.innerHTML=`
    <div class="focus-detail-wrap">
      <div class="focus-detail-breadcrumb">
        <button onclick="renderRadarWorkspace()">Action Radar</button>
        <span>›</span>
        <button onclick="renderRadarWorkspace()">Focus Areas</button>
        <span>›</span>
        <strong>${esc(rt.title)}</strong>
      </div>

      <div class="focus-detail-header">
        <div class="focus-detail-title-area">
          <div class="focus-detail-icon">
            ${esc(rt.title.substring(0,1).toUpperCase())}
          </div>

          <div>
            <h2>${esc(rt.title)}</h2>
            <p>${esc(rt.description||'Focus area for discussion items and follow-ups')}</p>
          </div>
        </div>

        <div class="focus-detail-actions">
          <button class="btn btn-ghost" onclick="renderRadarWorkspace()">← Back to Focus Areas</button>
          <button class="btn btn-ghost" onclick="editRadarThread('${esc(rt.id)}')">Edit Focus Area</button>
          <button class="btn btn-ghost btn-danger" onclick="deleteRadarThread('${esc(rt.id)}')">Delete Focus Area</button>
        </div>
      </div>

      <div class="focus-detail-summary">
        <div class="focus-summary-card total">
          <strong>${discussionCount}</strong>
          <span>Discussion Items</span>
          <small>All items</small>
        </div>

        <div class="focus-summary-card due">
          <strong>${dueCount}</strong>
          <span>Due for Discussion</span>
          <small>Needs attention</small>
        </div>

        <div class="focus-summary-card overdue">
          <strong>${overdueCount}</strong>
          <span>Overdue</span>
          <small>Past review date</small>
        </div>

        <div class="focus-summary-card waiting">
          <strong>${waitingCount}</strong>
          <span>Waiting on Others</span>
          <small>Pending response</small>
        </div>
      </div>

      <div class="focus-topic-section">
        <div class="focus-topic-head">
          <div>
            <h3>Discussion Topics</h3>
            <p>Track and manage discussions, follow-ups and next steps.</p>
          </div>
        </div>

        <div class="focus-topic-toolbar">
          <div class="focus-topic-tabs">
            ${['All','Due Today','Overdue','Waiting on Others','Discussed','Closed'].map(f=>`
              <button
                class="${currentRadarItemFilter===f?'active':''}"
                onclick="setRadarItemFilter('${f}')">
                ${f}
              </button>
            `).join('')}
          </div>

          <div class="focus-topic-search">
            <input
              type="text"
              placeholder="Search discussion items..."
              value="${esc(window.currentRadarItemSearch||'')}"
              oninput="setRadarItemSearch(this.value)"
            />
          </div>
        </div>

        ${
          items.length
          ? `
            <div class="focus-topic-table">
              <div class="focus-topic-row focus-topic-table-head">
                <div>Discussion Item</div>
                <div>Discussion Focus</div>
                <div>Next Review</div>
                <div>Follow-up</div>
                <div>Status</div>
                <div>Ageing</div>
                <div>Action</div>
              </div>

              ${items.map(item=>{
                const reviewDate=getReviewDate(item);
const statusText=item.status||'Pending Discussion';
const statusKey=String(statusText).toLowerCase().replaceAll(' ','-');
const reviewActive=isReviewActive(item);

const reviewDateObject=_parseDateSafe(reviewDate);

let ageText='—';
let ageClass='closed';

if(reviewActive && reviewDateObject){
  const todayDate=new Date();
  todayDate.setHours(0,0,0,0);

  const reviewDiff=Math.round((reviewDateObject-todayDate)/86400000);

  if(reviewDiff<0){
    const overdueDays=Math.abs(reviewDiff);
    ageText=`-${overdueDays} day${overdueDays!==1?'s':''}`;
    ageClass='overdue';
  }else if(reviewDiff===0){
    ageText='Today';
    ageClass='today';
  }else{
    ageText=`+${reviewDiff} day${reviewDiff!==1?'s':''}`;
    ageClass='upcoming';
  }
}

let reviewMeta='';

if(reviewDate){
  if(!reviewActive){
    reviewMeta=`<small>${esc(statusText)}</small>`;
  }else if(isDueToday(item)){
    reviewMeta='<small class="today">Due today</small>';
  }else if(isOverdue(item)){
    reviewMeta='<small class="danger">Overdue</small>';
  }else{
    reviewMeta='<small>Upcoming</small>';
  }
}
                return `
                  <div class="focus-topic-row">
                    <div class="focus-topic-title">
                      <div class="focus-topic-row-icon"></div>
                      <div>
                        <strong>${esc(item.title)}</strong>
                      </div>
                    </div>

                    <div class="focus-topic-focus">
                      ${esc(item.todayPoint||'—')}
                    </div>

                    <div class="focus-topic-date">
                      <strong>${reviewDate?_fmtDate(reviewDate):'—'}</strong>
                      ${reviewMeta}
                    </div>

                    <div class="focus-topic-followup">
                      ${esc(item.nextStep||'—')}
                    </div>

                    <div>
                      <span class="focus-topic-status ${statusKey}">
                        ${esc(statusText)}
                      </span>
                    </div>

                    <div class="focus-topic-age ${ageClass}">
                      ${ageText}
                    </div>

                    <div class="focus-topic-action">
                      <button class="radar-row-action-btn"
                        title="More actions"
                        onclick="event.stopPropagation();toggleRadarActionMenu('${esc(item.id)}')">
                        ⋮
                      </button>

                      <div class="radar-action-menu" id="radar-menu-${esc(item.id)}">
                        <button onclick="event.stopPropagation();markRadarItemDiscussed('${esc(rt.id)}','${esc(item.id)}')">
                          Mark Discussed
                        </button>

                        <button onclick="event.stopPropagation();carryForwardRadarItem('${esc(rt.id)}','${esc(item.id)}')">
                          Carry Forward
                        </button>

                        <button onclick="event.stopPropagation();editRadarDiscussionItem('${esc(rt.id)}','${esc(item.id)}')">
                          Edit Item
                        </button>

                        <button onclick="event.stopPropagation();createActionItemFromRadar('${esc(rt.id)}','${esc(item.id)}')">
                          Create Action Item
                        </button>

                        <button class="danger" onclick="event.stopPropagation();closeRadarItem('${esc(rt.id)}','${esc(item.id)}')">
                          Close Item
                        </button>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `
          : `
            <div class="radar-empty-state">
              <div class="radar-empty-icon">🎯</div>
              <h3>No discussion items found</h3>
              <p>Add discussion points that need review, follow-up, or daily attention.</p>
            </div>
          `
        }
      </div>
    </div>
  `;
}
function setRadarItemFilter(filter){
  currentRadarItemFilter=filter;

  if(currentRadarThreadId){
    openRadarThread(currentRadarThreadId);
  }
}
function setRadarItemSearch(value){
  window.currentRadarItemSearch=value||'';

  if(currentRadarThreadId){
    openRadarThread(currentRadarThreadId);
  }
}
function openRadarThreadModal(){
  document.getElementById('mo-radar-thread')?.classList.add('open');

  document.getElementById('radar-thread-title').value='';
  document.getElementById('radar-thread-desc').value='';

  if(document.getElementById('radar-thread-owner')){
    document.getElementById('radar-thread-owner').value='';
  }

  if(document.getElementById('radar-thread-start')){
    document.getElementById('radar-thread-start').value=_todayStr();
  }

  if(document.getElementById('radar-thread-review')){
    document.getElementById('radar-thread-review').value='';
  }

  document.getElementById('radar-thread-priority').value='Medium';
  document.getElementById('radar-thread-status').value='Active';

  const editField=document.getElementById('radar-thread-edit-id');
  if(editField)editField.value='';

  document.querySelector('#mo-radar-thread .mt').textContent='New Radar Thread';
  document.querySelector('#mo-radar-thread .btn.btn-primary').textContent='Create Radar Thread';
}

function closeRadarThreadModal(){
  document.getElementById('mo-radar-thread')?.classList.remove('open');
}

function saveRadarThread(){
  const title=document.getElementById('radar-thread-title')?.value.trim();
  const desc=document.getElementById('radar-thread-desc')?.value.trim();
  const priority=document.getElementById('radar-thread-priority')?.value||'Medium';
  const status=document.getElementById('radar-thread-status')?.value||'Active';

  const owner=document.getElementById('radar-thread-owner')?.value.trim()||'';
  const startDate=document.getElementById('radar-thread-start')?.value||'';
  const reviewDate=document.getElementById('radar-thread-review')?.value||'';

  if(!title){
    toast('Please enter radar thread name.','error');
    return;
  }

  const threads=getRadarThreads();
  const editId=document.getElementById('radar-thread-edit-id')?.value||'';

  if(editId){
    const rt=threads.find(x=>x.id===editId);

    if(rt){
      rt.title=title;
      rt.description=desc||'Operational focus area';
      rt.owner=owner;
      rt.startDate=startDate;
      rt.reviewDate=reviewDate;
      rt.priority=priority;
      rt.status=status;

      saveRadarThreads(threads);
      closeRadarThreadModal();
      updateRadarBadge?.();
      renderRadarWorkspace();
      renderDash?.();

      const editField=document.getElementById('radar-thread-edit-id');
      if(editField)editField.value='';

      toast('Radar thread updated.','success');
      return;
    }
  }

  threads.unshift({
    id:'rt-'+Date.now(),
    title,
    description:desc||'Operational focus area',
    owner,
    startDate:startDate||_todayStr(),
    reviewDate,
    priority,
    status,
    createdAt:Date.now(),
    items:[]
  });

  saveRadarThreads(threads);
  closeRadarThreadModal();
  updateRadarBadge?.();
  renderRadarWorkspace();
  renderDash?.();

  toast('Radar thread created.','success');
}
function editRadarThread(threadId){
  const threads=getRadarThreads();
  const rt=threads.find(x=>x.id===threadId);

  if(!rt)return;

  document.getElementById('radar-thread-title').value=rt.title||'';
  document.getElementById('radar-thread-desc').value=rt.description||'';
  document.getElementById('radar-thread-priority').value=rt.priority||'Medium';
  document.getElementById('radar-thread-status').value=rt.status||'Active';

  if(document.getElementById('radar-thread-owner')){
    document.getElementById('radar-thread-owner').value=rt.owner||'';
  }

  if(document.getElementById('radar-thread-start')){
    document.getElementById('radar-thread-start').value=rt.startDate||'';
  }

  if(document.getElementById('radar-thread-review')){
    document.getElementById('radar-thread-review').value=rt.reviewDate||'';
  }

  let editField=document.getElementById('radar-thread-edit-id');

  if(!editField){
    editField=document.createElement('input');
    editField.type='hidden';
    editField.id='radar-thread-edit-id';
    document.getElementById('mo-radar-thread').appendChild(editField);
  }

  editField.value=threadId;

  document.querySelector('#mo-radar-thread .mt').textContent='Edit Radar Thread';
  document.querySelector('#mo-radar-thread .btn.btn-primary').textContent='Update Radar Thread';

  document.getElementById('mo-radar-thread')?.classList.add('open');
}

function deleteRadarThread(threadId){
  const threads=getRadarThreads();
  const rt=threads.find(x=>x.id===threadId);

  if(!rt)return;

  const ok=confirm(`Delete radar thread "${rt.title}"?\n\nThis will also remove all discussion items under it.`);

  if(!ok)return;

  const updated=threads.filter(x=>x.id!==threadId);

  saveRadarThreads(updated);
  currentRadarThreadId=null;

  updateRadarBadge?.();
  renderRadarWorkspace();
  renderDash?.();

  toast('Radar thread deleted.','info');
}
function ensureRadarItemModalLayout(){
  const modal=document.getElementById('mo-radar-item');
  if(!modal)return;

  const body=modal.querySelector('.mb');
  if(!body)return;

  body.innerHTML=`
    <div class="radar-item-form">

      <input type="hidden" id="radar-item-thread-id">
      <input type="hidden" id="radar-item-edit-id">

      <!-- Hidden legacy fields retained for existing save/edit compatibility -->
      <input type="hidden" id="radar-item-discussed">
      <input type="hidden" id="radar-item-source" value="Other">
      <input type="hidden" id="radar-item-forum" value="Focus Area">

      <div class="radar-form-field radar-form-full">
        <label>Discussion Item Title <span class="rq">*</span></label>
        <input
          type="text"
          id="radar-item-title"
          placeholder="Example: UAT Cycle-2 timeline clarification"
        >
      </div>

      <div class="radar-form-field radar-form-full">
        <label>Discussion Focus</label>
        <textarea
          id="radar-item-point"
          rows="4"
          placeholder="What exactly needs to be reviewed or discussed?"
        ></textarea>
      </div>

      <div class="radar-form-field">
        <label>Next Review Date</label>
        <input type="date" id="radar-item-followup">
      </div>

      <div class="radar-form-field">
        <label>Status</label>
        <select id="radar-item-status">
          <option value="Pending Discussion">Pending Discussion</option>
          <option value="Carried Forward">Carried Forward</option>
          <option value="Action Required">Action Required</option>
          <option value="Action Created">Action Created</option>
          <option value="Discussed">Discussed</option>
          <option value="Closed">Closed</option>
        </select>
      </div>

      <div class="radar-form-field radar-form-full">
        <label>Follow-up / Next Step</label>
        <input
          type="text"
          id="radar-item-nextstep"
          placeholder="Example: Confirm with Product team"
        >
      </div>

      <div class="radar-form-field">
        <label>Owner / Responsible Person</label>
        <input
          type="text"
          id="radar-item-owner"
          placeholder="Owner name..."
        >
      </div>

      <div class="radar-form-field">
        <label>Priority</label>
        <select id="radar-item-priority">
          <option value="Low">Low</option>
          <option value="Medium" selected>Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>
      </div>

      <div class="radar-form-field radar-form-full">
        <label>Notes</label>
        <textarea
          id="radar-item-notes"
          rows="3"
          placeholder="Add supporting notes, context, or blockers..."
        ></textarea>
      </div>

    </div>
  `;
}
function openRadarItemModal(threadId){
  ensureRadarItemModalLayout();

  document.getElementById('mo-radar-item')?.classList.add('open');

  document.getElementById('radar-item-thread-id').value=threadId;
  document.getElementById('radar-item-title').value='';
  document.getElementById('radar-item-point').value='';
  document.getElementById('radar-item-discussed').value='';
  document.getElementById('radar-item-followup').value='';
  document.getElementById('radar-item-nextstep').value='';
  document.getElementById('radar-item-status').value='Pending Discussion';
  document.getElementById('radar-item-owner').value='';
  document.getElementById('radar-item-priority').value='Medium';
  document.getElementById('radar-item-notes').value='';
  document.getElementById('radar-item-source').value='Other';
  document.getElementById('radar-item-forum').value='Focus Area';

  const editField=document.getElementById('radar-item-edit-id');
  if(editField)editField.value='';

  const title=document.querySelector('#mo-radar-item .mt');
  if(title)title.textContent='Add Discussion Item';

  const primaryBtn=document.querySelector('#mo-radar-item .btn.btn-primary');
  if(primaryBtn)primaryBtn.textContent='Add Item';
}

function closeRadarItemModal(){
  document.getElementById('mo-radar-item')?.classList.remove('open');
}

function saveRadarDiscussionItem(){
  const threadId=document.getElementById('radar-item-thread-id')?.value;
  const title=document.getElementById('radar-item-title')?.value.trim();

  if(!threadId)return;

  if(!title){
    toast('Please enter discussion item title.','error');
    return;
  }

  const threads=getRadarThreads();
  const rt=threads.find(x=>x.id===threadId);
  if(!rt)return;

  const editId=document.getElementById('radar-item-edit-id')?.value||'';

  rt.items=rt.items||[];

  const itemPayload={
    title,
    todayPoint:document.getElementById('radar-item-point')?.value.trim()||'',
    lastDiscussed:document.getElementById('radar-item-discussed')?.value||'',
    followupDate:document.getElementById('radar-item-followup')?.value||'',
    nextStep:document.getElementById('radar-item-nextstep')?.value.trim()||'',
    status:document.getElementById('radar-item-status')?.value||'Pending Discussion',
    owner:document.getElementById('radar-item-owner')?.value.trim()||'—',
    priority:document.getElementById('radar-item-priority')?.value||'Medium',
    notes:document.getElementById('radar-item-notes')?.value.trim()||'',
    source:document.getElementById('radar-item-source')?.value||'Other',
    forum:document.getElementById('radar-item-forum')?.value||'Focus Area'
  };

  if(editId){
    const item=rt.items.find(x=>x.id===editId);

    if(item){
      Object.assign(item,itemPayload);

      saveRadarThreads(threads);
      closeRadarItemModal();
      openRadarThread(threadId);
      renderDash?.();

      document.getElementById('radar-item-edit-id').value='';

      toast('Discussion item updated.','success');
      return;
    }
  }

  rt.items.unshift({
    id:'ri-'+Date.now(),
    ...itemPayload,
    createdAt:_todayStr()
  });

  saveRadarThreads(threads);
  closeRadarItemModal();
  openRadarThread(threadId);
  renderDash?.();

  toast('Discussion item added.','success');
}
function findRadarDiscussionItem(threadId,itemId){
  const threads=getRadarThreads();
  const rt=threads.find(x=>x.id===threadId);
  if(!rt)return null;

  const item=(rt.items||[]).find(x=>x.id===itemId);
  if(!item)return null;

  return {threads,rt,item};
}

function markRadarItemDiscussed(threadId,itemId){
  const data=findRadarDiscussionItem(threadId,itemId);
  if(!data)return;

  data.item.lastDiscussed=_todayStr();
  data.item.status='Discussed';

  saveRadarThreads(data.threads);
  openRadarThread(threadId);
  renderDash?.();

  toast('Discussion item marked as discussed.','success');
}

function carryForwardRadarItem(threadId,itemId){
  const data=findRadarDiscussionItem(threadId,itemId);
  if(!data)return;

  const nextDate=prompt(
    'Enter next discussion / follow-up date in YYYY-MM-DD format:',
    _todayStr()
  );

  if(!nextDate)return;

  data.item.status='Carried Forward';
  data.item.followupDate=nextDate;
  data.item.carriedForwardOn=_todayStr();

  saveRadarThreads(data.threads);
  openRadarThread(threadId);
  renderDash?.();

  toast('Discussion item carried forward.','info');
}

function closeRadarItem(threadId,itemId){
  const data=findRadarDiscussionItem(threadId,itemId);
  if(!data)return;

  data.item.status='Closed';

  saveRadarThreads(data.threads);
  openRadarThread(threadId);
  renderDash?.();

  toast('Discussion item closed.','success');
}

function createActionItemFromRadar(threadId,itemId){
  const data=findRadarDiscussionItem(threadId,itemId);
  if(!data)return;

  data.item.status='Action Created';

  saveRadarThreads(data.threads);
  openRadarThread(threadId);
  renderDash?.();

  toast('Action item creation flow will be linked with tracker thread next.','info');
}
function editRadarDiscussionItem(threadId,itemId){
  ensureRadarItemModalLayout();

  const data=findRadarDiscussionItem(threadId,itemId);
  if(!data)return;

  const item=data.item;

  document.getElementById('radar-item-thread-id').value=threadId;
  document.getElementById('radar-item-title').value=item.title||'';
  document.getElementById('radar-item-point').value=item.todayPoint||'';
  document.getElementById('radar-item-discussed').value=item.lastDiscussed||'';
  document.getElementById('radar-item-followup').value=item.followupDate||'';
  document.getElementById('radar-item-nextstep').value=item.nextStep||'';
  document.getElementById('radar-item-status').value=item.status||'Pending Discussion';
  document.getElementById('radar-item-owner').value=item.owner||'';
  document.getElementById('radar-item-priority').value=item.priority||'Medium';
  document.getElementById('radar-item-notes').value=item.notes||'';
  document.getElementById('radar-item-source').value=item.source||'Other';
  document.getElementById('radar-item-forum').value=item.forum||'Focus Area';

  document.getElementById('radar-item-edit-id').value=itemId;

  const title=document.querySelector('#mo-radar-item .mt');
  if(title)title.textContent='Edit Discussion Item';

  const primaryBtn=document.querySelector('#mo-radar-item .btn.btn-primary');
  if(primaryBtn)primaryBtn.textContent='Update Item';

  document.getElementById('mo-radar-item')?.classList.add('open');
}
function toggleRadarActionMenu(itemId){
  document.querySelectorAll('.radar-action-menu').forEach(menu=>{
    if(menu.id !== 'radar-menu-' + itemId){
      menu.classList.remove('open');
    }
  });

  const menu=document.getElementById('radar-menu-' + itemId);
  if(menu){
    menu.classList.toggle('open');
  }
}

document.addEventListener('click',()=>{
  document.querySelectorAll('.radar-action-menu').forEach(menu=>{
    menu.classList.remove('open');
  });
});