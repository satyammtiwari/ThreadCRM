/* STATE */
let T=[]; // threads
let view='dashboard';
let curId=null;
let editId=null;
let cmtType='Comment';
let sortIdx=0;
let overdueFilter=false;
let actionFilter=false;
let dueTodayFilter=false;
let upcomingFilter=false;
let dueSoonFilter=false;
let dueLaterFilter=false;
let searchQ='';
let myName=localStorage.getItem('tcrm_name')||'';
const SORTS=[
  {f:'createdAt',d:'desc',l:'Date ↓'},
  {f:'createdAt',d:'asc',l:'Date ↑'},
  {f:'title',d:'asc',l:'Title A-Z'},
  {f:'priority',d:'desc',l:'Priority'},
  {f:'targetDate',d:'asc',l:'Due Date'},
];
/* FORUMS — dynamic list, persisted in localStorage */
let FORUMS=[
  {key:'1PM',          label:'1PM Meeting',   color:'#38bdf8'},
  {key:'SoS',          label:'SoS Meeting',   color:'#a855f7'},
  {key:'Daily Meeting',label:'Daily Standup', color:'#22c55e'},
  {key:'Other',        label:'Ad-hoc / Other',color:'#f59e0b'},
];
const FORUM_ARCHIVE={key:'Archive',label:'Archive',color:'#8b949e'};

const AVC=['#6c63ff','#f59e0b','#22c55e','#ef4444','#38bdf8','#a855f7','#06b6d4','#f97316','#ec4899','#84cc16'];
const avc=(n)=>{if(!n)return AVC[0];let h=0;for(let i=0;i<n.length;i++)h=(h*31+n.charCodeAt(i))%AVC.length;return AVC[Math.abs(h)];};
const ini=(n)=>{if(!n)return'?';const p=n.trim().split(/\s+/);return p.length===1?p[0][0].toUpperCase():(p[0][0]+p[p.length-1][0]).toUpperCase();};
