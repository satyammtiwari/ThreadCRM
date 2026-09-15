/* DASHBOARD */

function _isSameDay(d1,d2){
  return d1.getFullYear()===d2.getFullYear() &&
    d1.getMonth()===d2.getMonth() &&
    d1.getDate()===d2.getDate();
}

function _daysFromToday(dateStr){
  if(!dateStr) return null;

  const today = new Date();
  today.setHours(0,0,0,0);

  const parts = String(dateStr).split('-');
  if(parts.length !== 3) return null;

  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  d.setHours(0,0,0,0);

  if(isNaN(d.getTime())) return null;

  return Math.round((d - today) / 86400000);
}

function _forumLabel(key){
  const f=[...FORUMS,FORUM_ARCHIVE].find(x=>x.key===key);
  return f?f.label:(key||'—');
}

function renderDash(){
  renderActionRadar();
  renderDailyFocus();
  const now=new Date();
  document.getElementById('dash-date').textContent=
    now.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

  const tot=T.length;
  const opn=T.filter(t=>t.status==='Open').length;
  const cls=T.filter(t=>t.status==='Closed').length;
  const ovd=T.filter(isOvd).length;
const act=T.filter(t=>
  t.radarType!=='note' &&
  t.status==='Open' &&
  (
    t.priority==='High' ||
    t.priority==='Critical'
  )
).length;
  const dueToday=T.filter(t=>{
    const d=_daysFromToday(t.targetDate);
    return d===0 && t.status!=='Closed';
  }).length;

  const upcoming=T.filter(t=>{
    const d=_daysFromToday(t.targetDate);
    return d!==null && d>0 && d<=7 && t.status!=='Closed';
  }).length;

  document.getElementById('s-opn').textContent=opn;
  document.getElementById('s-ovd').textContent=ovd;
  document.getElementById('s-act').textContent=act;
  document.getElementById('s-cls').textContent=cls;
  renderForums();
  renderByPerson();
  renderAging();
  updateBadges();
}
function renderActionRadar(){
  const el=document.getElementById('action-radar');
  if(!el)return;

  const threads=getRadarThreads ? getRadarThreads() : [];

  if(!threads.length){
    el.innerHTML='';
    return;
  }

  const rows=threads.map(rt=>getRadarThreadSummary(rt));

  const orderedRows=rows
    .sort((a,b)=>{
      if(a.overdue!==b.overdue)return b.overdue-a.overdue;
      if(a.pending!==b.pending)return b.pending-a.pending;
      return a.title.localeCompare(b.title);
    })
    .slice(0,6);

  const iconMap={
    'BAE':'briefcase',
    'Nexteer':'building',
    'Demo Site':'globe',
    'Forums':'chat',
    'Resources':'document',
    'Others':'more'
  };

  const getIconType=(title)=>{
    if(title.toLowerCase().includes('bae'))return 'briefcase';
    if(title.toLowerCase().includes('nexteer'))return 'building';
    if(title.toLowerCase().includes('demo'))return 'globe';
    if(title.toLowerCase().includes('forum'))return 'chat';
    if(title.toLowerCase().includes('resource'))return 'document';
    return iconMap[title]||'more';
  };

  const iconSvg=(type)=>{
    const icons={
      briefcase:`<svg viewBox="0 0 24 24"><path d="M9 6V5a2 2 0 012-2h2a2 2 0 012 2v1"/><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 12h18"/></svg>`,
      building:`<svg viewBox="0 0 24 24"><path d="M4 21V5a2 2 0 012-2h8a2 2 0 012 2v16"/><path d="M16 8h2a2 2 0 012 2v11"/><path d="M8 7h4M8 11h4M8 15h4"/></svg>`,
      globe:`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18"/></svg>`,
      chat:`<svg viewBox="0 0 24 24"><path d="M21 15a4 4 0 01-4 4H8l-5 3V7a4 4 0 014-4h10a4 4 0 014 4z"/></svg>`,
      document:`<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></svg>`,
      more:`<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>`
    };

    return icons[type]||icons.more;
  };

  el.innerHTML=`
    <div class="focus-overview-panel">
      <div class="focus-overview-head">
        <div>
          <div class="focus-overview-title">
            🎯 Focus Areas Overview
          </div>
          <div class="focus-overview-sub">
            Quick overview of focus areas requiring discussion or follow-up
          </div>
        </div>

        <button class="focus-overview-link" onclick="navigate('radar')">
          View all Focus Areas →
        </button>
      </div>

      <div class="focus-overview-grid">
        ${orderedRows.map(x=>{
          const overdue=x.overdue||0;
          const active=x.total||0;
          const statusClass=overdue>0?'due':'clear';
          const iconType=getIconType(x.title);

          return `
            <div class="focus-overview-card ${statusClass}"
              onclick="navigate('radar'); setTimeout(()=>openRadarThread('${esc(x.id)}'),50)">

              <div class="focus-overview-card-top">
                <div class="focus-overview-icon ${iconType}">
                  ${iconSvg(iconType)}
                </div>

                <div class="focus-overview-info">
                  <strong>${esc(x.title)}</strong>
                  <span>${active} Active Item${active!==1?'s':''}</span>
                </div>
              </div>

              <div class="focus-overview-overdue ${overdue>0?'danger':'safe'}">
                ${overdue} Overdue
              </div>

              <div class="focus-overview-open">
                Open →
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}
function renderDailyFocus(){
  const el=document.getElementById('daily-focus-list');
  if(!el)return;

  const radarThreads=
    typeof getRadarThreads==='function'
      ? getRadarThreads()
      : [];

  const today=new Date();
  today.setHours(0,0,0,0);

  const toDateValue=value=>{
    if(!value)return null;

    const parts=String(value).split('-');
    if(parts.length!==3)return null;

    const date=new Date(
      Number(parts[0]),
      Number(parts[1])-1,
      Number(parts[2])
    );

    date.setHours(0,0,0,0);

    return Number.isNaN(date.getTime()) ? null : date;
  };

  const formatDate=value=>{
    const date=toDateValue(value);
    if(!date)return 'No review date';

    return date.toLocaleDateString('en-GB',{
      day:'2-digit',
      month:'short',
      year:'numeric'
    });
  };

  const getReviewDate=item=>
    item.targetDiscussionDate ||
    item.nextReviewDate ||
    item.reviewDate ||
    item.followupDate ||
    '';

  const isProcessed=item=>{
    const status=String(item.status||'').toLowerCase();

    return [
      'discussed',
      'closed',
      'action created'
    ].includes(status);
  };

  const getTiming=item=>{
    const status=String(item.status||'Pending Discussion');
    const statusLower=status.toLowerCase();
    const reviewDate=getReviewDate(item);
    const reviewDateObject=toDateValue(reviewDate);

    if(statusLower.includes('waiting')){
      return {
        rank:2,
        label:'Waiting',
        cssClass:'waiting',
        dateText:reviewDate ? formatDate(reviewDate) : 'Waiting on others'
      };
    }

    if(!reviewDateObject){
      return {
        rank:4,
        label:'No review date',
        cssClass:'neutral',
        dateText:'No review date'
      };
    }

    const dayDifference=Math.round(
      (reviewDateObject-today)/86400000
    );

    if(dayDifference<0){
      const overdueDays=Math.abs(dayDifference);

      return {
        rank:0,
        label:`Overdue ${overdueDays}d`,
        cssClass:'overdue',
        dateText:formatDate(reviewDate)
      };
    }

    if(dayDifference===0){
      return {
        rank:1,
        label:'Due today',
        cssClass:'due-today',
        dateText:formatDate(reviewDate)
      };
    }

    if(dayDifference===1){
      return {
        rank:3,
        label:'Tomorrow',
        cssClass:'upcoming',
        dateText:formatDate(reviewDate)
      };
    }

    return {
      rank:3,
      label:`In ${dayDifference} days`,
      cssClass:'upcoming',
      dateText:formatDate(reviewDate)
    };
  };

  const items=[];

  radarThreads.forEach(thread=>{
    (thread.items||[]).forEach(item=>{
      if(isProcessed(item))return;

      const timing=getTiming(item);

      items.push({
        ...item,
        radarThreadId:thread.id,
        focusArea:thread.title||'Focus Area',
        timing
      });
    });
  });

  const orderedItems=items
    .sort((a,b)=>{
      if(a.timing.rank!==b.timing.rank){
        return a.timing.rank-b.timing.rank;
      }

      const dateA=toDateValue(getReviewDate(a));
      const dateB=toDateValue(getReviewDate(b));

      if(dateA && dateB)return dateA-dateB;
      if(dateA)return -1;
      if(dateB)return 1;

      return String(a.title||'').localeCompare(
        String(b.title||'')
      );
    })
    .slice(0,5);

  if(!orderedItems.length){
    el.innerHTML=`
      <div class="daily-focus-empty">
        <div class="daily-focus-empty-icon">✓</div>

        <div>
          <strong>No discussion items need attention</strong>
          <span>
            New or carried-forward discussion items will appear here.
          </span>
        </div>
      </div>
    `;

    return;
  }

  el.innerHTML=orderedItems.map(item=>{
    const status=item.status||'Pending Discussion';

    const statusClass=String(status)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g,'-')
      .replace(/^-|-$/g,'');

    return `
      <button
        type="button"
        class="daily-focus-row"
        onclick="navigate('radar'); setTimeout(()=>openRadarThread('${esc(item.radarThreadId)}'),50)"
      >
        <span class="daily-focus-indicator ${item.timing.cssClass}"></span>

        <span class="daily-focus-item">
          <strong>${esc(item.title||'Untitled discussion item')}</strong>

          <small>
            ${esc(item.todayPoint||item.notes||'Discussion follow-up')}
          </small>
        </span>

        <span class="daily-focus-area">
          ${esc(item.focusArea)}
        </span>

        <span class="daily-focus-review">
          <strong class="${item.timing.cssClass}">
            ${esc(item.timing.label)}
          </strong>

          <small>${esc(item.timing.dateText)}</small>
        </span>

        <span class="daily-focus-status ${statusClass}">
          ${esc(status)}
        </span>

        <span class="daily-focus-open">›</span>
      </button>
    `;
  }).join('');
}

function renderInsights(m){
  const el=document.querySelector('.dash-v2-insights');
  if(!el)return;

  el.innerHTML=`
    <div class="insights-title">Insights ✨</div>

    <div class="insight-row">
      <div class="insight-icon red">↗</div>
      <div>
        <div class="insight-text">Overdue threads need attention.</div>
        <div class="insight-sub">${m.ovd} thread${m.ovd!==1?'s':''} currently overdue.</div>
      </div>
    </div>

    <div class="insight-row">
      <div class="insight-icon orange"></div>
      <div>
        <div class="insight-text">High priority work is open.</div>
        <div class="insight-sub">Review action required threads first.</div>
      </div>
    </div>

    <div class="insight-row">
      <div class="insight-icon green">✓</div>
      <div>
        <div class="insight-text">${m.cls} threads closed.</div>
        <div class="insight-sub">Completed threads are excluded from risk.</div>
      </div>
    </div>

    <div class="insight-row">
      <div class="insight-icon purple">◷</div>
      <div>
        <div class="insight-text">${m.dueToday} due today.</div>
        <div class="insight-sub">${m.upcoming} upcoming in the next 7 days.</div>
      </div>
    </div>

    <div class="insights-link">View all insights →</div>`;
}

function renderForums(){
  const baseColors=['#2563eb','#f97316','#8b5cf6','#22c55e','#06b6d4'];

  let forums=[...FORUMS,FORUM_ARCHIVE]
    .map(f=>{
      const total=T.filter(t=>t.forum===f.key).length;
      return {...f,total};
    })
    .filter(f=>f.total>0)
    .sort((a,b)=>b.total-a.total)
    .slice(0,5);

  forums=forums.map((f,i)=>({
    ...f,
    color:baseColors[i%baseColors.length]
  }));

  const grandTotal=forums.reduce((s,f)=>s+f.total,0)||1;

  let start=0;
  const segments=forums.map(f=>{
    const pct=(f.total/grandTotal)*100;
    const seg=`${f.color} ${start}% ${start+pct}%`;
    start+=pct;
    return seg;
  });

  const gradient=segments.length
    ? `conic-gradient(${segments.join(',')})`
    : 'conic-gradient(#e5e7eb 0 100%)';

  document.getElementById('forum-cards').innerHTML=`
    <div class="donut-wrap">
      <div class="donut" style="background:${gradient}">
        <div><strong>${grandTotal}</strong><span>Total</span></div>
      </div>

      <div class="donut-legend">
        ${forums.map(f=>{
          const pct=Math.round((f.total/grandTotal)*100);
          return `
          <div class="legend-row" onclick="navTo({forum:'${f.key}'})">
            <span><i style="background:${f.color}"></i>${esc(f.label)}</span>
            <b>${f.total} <small>(${pct}%)</small></b>
          </div>`;
        }).join('')}
      </div>
    </div>

    <div class="card-link" onclick="navTo({})">View all forums →</div>`;
}
function renderByPerson(){
  const m={};

  T.forEach(t=>{
    if(!t.responsible)return;
    if(!m[t.responsible])m[t.responsible]={total:0,overdue:0,open:0};
    m[t.responsible].total++;
    if(t.status!=='Closed')m[t.responsible].open++;
    if(isOvd(t))m[t.responsible].overdue++;
  });

  const sorted=Object.entries(m)
    .sort((a,b)=>b[1].total-a[1].total)
    .slice(0,4);

  const el=document.getElementById('by-person');
  if(!sorted.length){
    el.innerHTML=`<div class="dash-empty">No owner data yet</div>`;
    return;
  }

  el.innerHTML=`
    <div class="owner-list">
      <div class="owner-head">
        <span>Owner</span>
        <span>Total</span>
        <span>Overdue</span>
        <span>Workload</span>
      </div>
      ${sorted.map(([name,c])=>{
        const workload=c.total>=10?'High':c.total>=5?'Medium':'Low';
        const cls=workload==='High'?'wl-high':workload==='Medium'?'wl-med':'wl-low';
        return `<div class="owner-row" onclick="navTo({person:'${esc(name)}'})">
          <div class="owner-person">
            <span class="mini-avatar" style="background:${avc(name)}">${ini(name)}</span>
            <span>${esc(name)}</span>
          </div>
          <strong>${c.total}</strong>
          <strong>${c.overdue}</strong>
          <span class="workload ${cls}">${workload}</span>
        </div>`;
      }).join('')}
    </div>
    <div class="card-link" onclick="navTo({})">View all owners →</div>`;
}

function renderAging(){
  const items=[
    {
      label:'Overdue',
      count:T.filter(isOvd).length,
      color:'#ef4444',
      link:{overdue:true}
    },
    {
      label:'Due Today',
      count:T.filter(t=>_daysFromToday(t.targetDate)===0 && t.status!=='Closed').length,
      color:'#f97316',
      link:{dueToday:true}
    },
    {
      label:'Due in 1–3 Days',
      count:T.filter(t=>{
        const d=_daysFromToday(t.targetDate);
        return d!==null && d>=1 && d<=3 && t.status!=='Closed';
      }).length,
      color:'#facc15',
      link:{dueSoon:true}
    },
    {
      label:'Due in 4–7 Days',
      count:T.filter(t=>{
        const d=_daysFromToday(t.targetDate);
        return d!==null && d>=4 && d<=7 && t.status!=='Closed';
      }).length,
      color:'#22c55e',
      link:{dueLater:true}
    }
  ];

  const total=items.reduce((s,i)=>s+i.count,0)||1;

  let start=0;
  const segments=items.map(i=>{
    const pct=(i.count/total)*100;
    const seg=`${i.color} ${start}% ${start+pct}%`;
    start+=pct;
    return seg;
  });

  const gradient=segments.length
    ? `conic-gradient(${segments.join(',')})`
    : 'conic-gradient(#e5e7eb 0 100%)';

  document.getElementById('aging').innerHTML=`
    <div class="donut-wrap">
      <div class="donut" style="background:${gradient}">
        <div><strong>${total}</strong><span>Total</span></div>
      </div>

      <div class="donut-legend">
        ${items.map(i=>{
          const pct=Math.round((i.count/total)*100);
          return `
          <div class="legend-row" onclick="navTo(${JSON.stringify(i.link).replace(/"/g,"'")})">
          <span><i style="background:${i.color}"></i>${i.label}</span>
          <b>${i.count} <small>(${pct}%)</small></b>
          </div>`;
        }).join('')}
      </div>
    </div>

    <div class="card-link" onclick="navTo({status:'Open'})">View all at-risk threads →</div>`;
}

function renderActivity(){}
function renderRecent(){}

function updateBadges(){
  const nbAll=document.getElementById('nb-all');
  if(nbAll)nbAll.textContent=T.length;

  [...FORUMS, FORUM_ARCHIVE].forEach(f=>{
    const el=document.getElementById('nb-'+f.key);
    if(el)el.textContent=T.filter(t=>t.forum===f.key).length;
  });
}