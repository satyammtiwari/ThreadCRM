/* EXPORT */
function exportCSV(){
  if(!T.length){toast('No threads to export.','error');return;}
  const hdr=['ID','Title','Category','Sub Category','Responsible','Participants','Status','Priority','Target Date','Forum','Tags','Notes','Created','Comments'];
  const rows=T.map(t=>[t.id,t.title,t.category,t.subcategory,t.responsible,t.participants,t.status,t.priority,t.targetDate,t.forum,(t.tags||[]).join(';'),t.notes,new Date(t.createdAt).toISOString().split('T')[0],(t.history||[]).length].map(v=>`"${String(v||'').replace(/"/g,'""')}"`));
  const csv=[hdr.join(','),...rows.map(r=>r.join(','))].join('\n');
  const blob=new Blob([csv],{type:'text/csv'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=`threadcrm-${new Date().toISOString().split('T')[0]}.csv`;a.click();
  URL.revokeObjectURL(url);toast('Exported!','success');
}

/* THEME */
function toggleTheme(){
  const n=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';
  document.documentElement.setAttribute('data-theme',n);
  localStorage.setItem('tcrm_theme',n);
}

/* KEYBOARD */
document.addEventListener('keydown',e=>{
  if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();openModal();}
  if(e.key==='Escape'&&document.getElementById('mo').classList.contains('open'))closeModal();
});
