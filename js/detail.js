/* DETAIL */
/* NOTE: openDetail() is defined in navigation.js — do NOT redefine it here.
   The navigation.js version correctly sets location.hash='#thread-{id}'
   which triggers handleRoute() to render this view. */
function getForumLabel(key){
  const f=[...FORUMS, FORUM_ARCHIVE].find(x => x.key === key);
  return f ? f.label : (key || '—');
}
function renderDetail(t){

  document.getElementById('d-title').textContent=t.title||'—';

  const tags=(t.tags||[])
    .map(tg=>`<span class="tg ${tg}">${esc(tg)}</span>`)
    .join('');

  document.getElementById('d-badges').innerHTML=
    `${stBadge(t.status)}
     ${priBadge(t.priority)}
     <span class="fb2">${esc(getForumLabel(t.forum))}</span>
     ${tags}
     ${
       isOvd(t)
       ? `<span style="font-size:11.5px;font-weight:600;color:var(--er);background:var(--er-bg);padding:2px 9px;border-radius:99px">⚠ Overdue</span>`
       : ''
     }`;

  /* ACTION RADAR BUTTON */
  const detailActions=document.querySelector('.detail-actions');

  if(detailActions){

    const existing=document.getElementById('detail-radar-btn');
    if(existing)existing.remove();

    const radarBtn=document.createElement('button');

    radarBtn.id='detail-radar-btn';

    radarBtn.className=
      t.isRadar
      ? 'btn btn-ghost btn-danger'
      : 'btn btn-ghost';

    radarBtn.innerHTML=
      t.isRadar
      ? 'Remove Radar'
      : 'Add to Radar';

    radarBtn.onclick=()=>{

      if(t.isRadar){
        removeFromRadar(t.id);
      }else{
        addToRadar(t.id);
      }

    };

    detailActions.prepend(radarBtn);
  }

  let createdText='—';

  if(t.createdAt){

    const createdDate=new Date(t.createdAt);

    if(!isNaN(createdDate.getTime())){
      createdText=fd(createdDate.toISOString().split('T')[0]);
    }
  }

  document.getElementById('d-fields').innerHTML=`
    <div class="ifl">
      <label>Responsible</label>
      <div class="vl">${esc(t.responsible||'—')}</div>
    </div>

    <div class="ifl">
      <label>Participants</label>
      <div class="vl">${esc(t.participants||'—')}</div>
    </div>

    <div class="ifl">
      <label>Category</label>
      <div class="vl">${esc(t.category||'—')}</div>
    </div>

    <div class="ifl">
      <label>Sub Category</label>
      <div class="vl">${esc(t.subcategory||'—')}</div>
    </div>

    <div class="ifl">
      <label>Target Date</label>
      <div class="vl">${fd(t.targetDate)}</div>
    </div>

    <div class="ifl">
      <label>Created</label>
      <div class="vl">${createdText}</div>
    </div>
  `;

  document.getElementById('d-notes').textContent=
    t.notes||'No notes added.';

  renderTL(t);

  renderRadarDetail(t);
}
function renderRadarDetail(t){
  let box=document.getElementById('radar-detail-box');

  if(!box){
    const header=document.querySelector('.dhd');
    if(!header)return;

    box=document.createElement('div');
    box.id='radar-detail-box';
    header.insertAdjacentElement('afterend',box);
  }

  if(!t.isRadar){
    box.innerHTML='';
    return;
  }

  const discussions=t.radarDiscussions||[];
  const lastText=getLastRadarDiscussion(t);

  box.innerHTML=`
    <div class="radar-detail-card">
      <div class="radar-detail-head">
        <div>
          <div class="radar-detail-title">🎯 Action Radar</div>
          <div class="radar-detail-sub">This thread is being tracked for daily attention.</div>
        </div>
        <div class="radar-detail-actions">
          <button class="btn btn-ghost" onclick="markRadarDiscussed('${esc(t.id)}')">Mark Discussed Today</button>
          <button class="btn btn-ghost btn-danger" onclick="removeFromRadar('${esc(t.id)}')">Remove from Radar</button>
        </div>
      </div>

      <div class="radar-detail-grid">
        <div><small>Radar Reason</small><strong>${esc(t.radarReason||'Daily follow-up required')}</strong></div>
        <div><small>Priority</small><strong>${esc(t.priority||'Medium')}</strong></div>
        <div><small>Last Discussed</small><strong class="${lastText==='Discussed today'?'radar-ok':'radar-warn'}">${esc(lastText)}</strong></div>
        <div><small>Added On</small><strong>${fd(new Date(t.radarAddedAt||Date.now()).toISOString().split('T')[0])}</strong></div>
      </div>

      <div class="radar-discussion-history">
        <div class="radar-discussion-title">Discussion History</div>
        ${
          discussions.length
          ? discussions.slice(0,5).map(d=>`
              <div class="radar-discussion-row">
                <span>${fd(String(d.date||'').split('T')[0])}</span>
                <strong>${esc(d.type||'Discussion')}</strong>
                
              </div>
            `).join('')
          : `<div class="radar-discussion-empty">No discussion marked yet.</div>`
        }
      </div>
    </div>
  `;
}
function formatDateTime(ts){
  if(!ts) return '—';
  const d = new Date(ts);
  if(isNaN(d.getTime())) return '—';

  const day = String(d.getDate()).padStart(2,'0');
  const month = d.toLocaleString('default',{month:'short'});
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2,'0');
  const ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12;
  hours = hours ? hours : 12;

  return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
}
function renderTL(t){
  const el=document.getElementById('timeline');
  const h=t.history||[];
  if(!h.length){el.innerHTML=`<div style="text-align:center;color:var(--t3);font-size:12px;padding:14px 0">No history yet.</div>`;return;}
  el.innerHTML=h.map(e=>`
    <div class="tli">
      <div class="tlav" style="background:${avc(e.author)}">${ini(e.author)}</div>
      <div class="tlb">
        <div class="tlm">
          <div class="tlau">${esc(e.author)}</div>
          <span class="tltp ${e.type}">${esc(e.type)}</span>
          <div class="tltm">${formatDateTime(e.ts)}</div>
        </div>
        <div class="tltx">${esc(e.text)}</div>
      </div>
    </div>`).join('');
}

function selCT(el){document.querySelectorAll('.ct').forEach(t=>t.classList.remove('active'));el.classList.add('active');cmtType=el.dataset.t;}
function cmtKey(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();addComment();}}
function addComment(){
  const au=document.getElementById('ca').value.trim();
  const tx=document.getElementById('ct2').value.trim();
  if(!au||!tx){toast('Please enter your name and a comment.','error');return;}
  const t=T.find(x=>x.id===curId);if(!t)return;
  if(!t.history)t.history=[];
  t.history.push({id:uid(),author:au,type:cmtType,text:tx,ts:Date.now()});
  save();document.getElementById('ct2').value='';renderTL(t);
  toast(`${cmtType} added.`,'success');
}
