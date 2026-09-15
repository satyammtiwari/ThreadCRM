/* UTILS */
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function fd(d){if(!d)return'—';return new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});}
function rel(ts){const d=Date.now()-ts,m=Math.floor(d/60000);if(m<1)return'just now';if(m<60)return m+'m ago';const h=Math.floor(m/60);if(h<24)return h+'h ago';return Math.floor(h/24)+'d ago';}
function isOvd(t){if(!t.targetDate||t.status==='Closed')return false;return new Date(t.targetDate)<new Date(new Date().toDateString());}
function age(t){return Math.floor((Date.now()-t.createdAt)/86400000);}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

function toast(msg,type='info'){
  const c=document.getElementById('tct');
  const el=document.createElement('div');el.className='tst '+type;
  const ic={success:`<svg class="tsti" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,error:`<svg class="tsti" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg>`,info:`<svg class="tsti" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg>`};
  el.innerHTML=(ic[type]||ic.info)+msg;c.appendChild(el);
  setTimeout(()=>{el.style.animation='to2 .3s ease forwards';setTimeout(()=>el.remove(),300);},3000);
}
