/* MODAL */
function openModal(id){
  editId=id||null;

  const modal=document.getElementById('mo');
  if(!modal){
    console.error('Missing modal container: #mo');
    return;
  }

  modal.classList.add('open');

  const modalTitle=document.getElementById('m-title');
  if(modalTitle)modalTitle.textContent=id?'Edit Thread':'New Thread';

  const saveBtn=document.getElementById('m-save');
  if(saveBtn)saveBtn.textContent=id?'Save Changes':'Create Thread';

  const t=id?T.find(x=>x.id===id):null;

  const setVal=(fieldId,value)=>{
    const el=document.getElementById(fieldId);
    if(!el){
      console.warn('Missing field in thread modal:', fieldId);
      return;
    }
    el.value=value??'';
  };

  setVal('f-title',t?.title||'');
  setVal('f-forum',t?.forum||'1PM');
  setVal('f-owner',t?.responsible||'');
  setVal('f-pri',t?.priority||'Medium');
  setVal('f-date',t?.targetDate||'');
  setVal('f-status',t?.status||'Open');
  setVal('f-cat',t?.category||'');
  setVal('f-sub',t?.subcategory||'');
  setVal('f-part',t?.participants||'');
  setVal('f-notes',t?.notes||'');

  const saved=t?.tags||[];
  const tagBox=document.getElementById('f-tags');

  if(tagBox){
    tagBox.querySelectorAll('input[type=checkbox]').forEach(cb=>{
      cb.checked=saved.includes(cb.value);
    });
  }else{
    console.warn('Missing field in thread modal: f-tags');
  }

  setTimeout(()=>{
    const titleField=document.getElementById('f-title');
    if(titleField)titleField.focus();
  },100);
}
function closeModal(){document.getElementById('mo').classList.remove('open');editId=null;}
function moClick(e){if(e.target===document.getElementById('mo'))closeModal();}

function saveThread(){
  const title=document.getElementById('f-title').value.trim();
  const owner=document.getElementById('f-owner').value.trim();
  if(!title){toast('Thread title is required.','error');document.getElementById('f-title').focus();return;}
  if(!owner){toast('Owner is required.','error');document.getElementById('f-owner').focus();return;}
  const tags=Array.from(document.querySelectorAll('#f-tags input:checked')).map(c=>c.value);
  const data={
    title,responsible:owner,
    forum:document.getElementById('f-forum').value,
    priority:document.getElementById('f-pri').value,
    targetDate:document.getElementById('f-date').value,
    status:document.getElementById('f-status').value,
    category:document.getElementById('f-cat').value.trim(),
    subcategory:document.getElementById('f-sub').value.trim(),
    participants:document.getElementById('f-part').value.trim(),
    notes:document.getElementById('f-notes').value.trim(),
    tags,
  };
  if(editId){
    const i=T.findIndex(t=>t.id===editId);
    if(i>=0)T[i]={...T[i],...data,updatedAt:Date.now()};
    toast('Thread updated!','success');
  } else {
  const newThread = {
    id: uid(),
    ...data,
    history: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  T.unshift(newThread);
  toast('Thread created!', 'success');

  save();          // save to local storage
  updateBadges();  // update dashboard/threads badges

  // Force navigation to the new thread's detail view
  curId = newThread.id;          // set current thread ID
  navigate('detail', newThread.id); 
  }
  save();closeModal();updateBadges();
  if(view==='dashboard')renderDash();
  if(view==='threads')renderList();
  if(view==='detail'&&editId===curId){const t=T.find(x=>x.id===curId);if(t)renderDetail(t);}
}

function editThread(id){openModal(id);}
function editCurrent(){openModal(curId);}
function delThread(id){
  if(!confirm('Delete this thread? This cannot be undone.'))return;
  T=T.filter(t=>t.id!==id);save();updateBadges();
  if(view==='dashboard')renderDash();
  if(view==='threads')renderList();
  if(view==='detail'&&curId===id)navigate('threads');
  toast('Thread deleted.','info');
}
function deleteCurrent(){delThread(curId);}

/* BADGES */
function stBadge(s){
  const m={Open:'sO','In Progress':'sI',Closed:'sC'};
  return `<span class="stb ${m[s]||'sO'}">${esc(s||'Open')}</span>`;
}
function priBadge(p){
  if(!p)return'';
  const m={Critical:'priC',High:'priH',Medium:'priM',Low:'priL'};
  return `<span class="pri ${m[p]||'priM'}">${esc(p)}</span>`;
}
