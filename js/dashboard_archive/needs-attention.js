/* Archived dashboard feature: Needs Attention
   Removed from active dashboard because overdue/high-priority information is shown elsewhere.
*/

function renderNeedsAttention(){
  const el=document.getElementById('needs-attention');
  if(!el)return;

  const overdue=T.filter(isOvd).slice(0,3);
  const high=T.filter(t=>(t.priority==='High'||t.priority==='Critical')&&t.status!=='Closed').slice(0,3);

  const row=(t,type)=>{
    const label=type==='overdue'?'Overdue':(t.priority||'High');
    return `
      <div class="need-row-v2" onclick="openDetail('${esc(t.id)}')">
        <span class="need-dot ${type}"></span>
        <div class="need-main-v2">
          <div class="need-title-v2">${esc(t.title)}</div>
          <div class="need-sub-v2"> ${esc(t.responsible||'—')}</div>
        </div>
        <span class="need-badge-v2 ${type}">${esc(label)}</span>
        <button class="need-btn-v2" onclick="event.stopPropagation();openDetail('${esc(t.id)}')">View</button>
      </div>`;
  };

  el.innerHTML=`
    <div class="needs-card-v2">
      <div class="needs-head-v2">
        <div>
          <div class="needs-title-main">⚠ Needs Attention</div>
          <div class="needs-sub-main">Overdue and high-priority threads that may require action.</div>
        </div>
        <span class="needs-count">${overdue.length+high.length}</span>
      </div>

      <div class="needs-grid-v2">
        <div class="needs-box-v2">
          <div class="needs-box-head">
            <span>Overdue Threads (${overdue.length})</span>
            <button onclick="navTo({overdue:true})">View all</button>
          </div>
          ${overdue.length?overdue.map(t=>row(t,'overdue')).join(''):`<div class="dash-empty">No overdue threads</div>`}
        </div>

        <div class="needs-box-v2">
          <div class="needs-box-head">
            <span>High Priority Open (${high.length})</span>
            <button onclick="navTo({actionRequired:true})">View all</button>
          </div>
          ${high.length?high.map(t=>row(t,'high')).join(''):`<div class="dash-empty">No high priority threads</div>`}
        </div>
      </div>
    </div>`;
}
