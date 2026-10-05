/* Data layer: seed data, persistence, domain helpers */
(function(){

/* ---------- date helpers ---------- */
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parse=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d,12)};
const addDays=(s,n)=>{const d=parse(s);d.setDate(d.getDate()+n);return ymd(d)};
const todayStr=()=>ymd(new Date());
const nowMin=()=>{const d=new Date();return d.getHours()*60+d.getMinutes()};
const toMin=t=>{if(!t)return null;const [h,m]=t.split(':').map(Number);return h*60+m};
const toHM=m=>pad(Math.floor(m/60))+':'+pad(Math.round(m%60));
const nowHM=()=>toHM(nowMin());
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const fmtDate=(s,o)=>parse(s).toLocaleDateString('en-GB',o||{day:'2-digit',month:'short',year:'numeric'});
const fmt12=t=>{if(!t)return '—';const [h,m]=t.split(':').map(Number);return ((h+11)%12+1)+':'+pad(m)+' '+(h<12?'AM':'PM')};
const fmtH=h=>{if(h==null||isNaN(h))return '—';const m=Math.round(h*60);return Math.floor(m/60)+'h '+pad(m%60)+'m'};
const ago=iso=>{const s=(Date.now()-new Date(iso).getTime())/1000;if(s<60)return 'just now';if(s<3600)return Math.floor(s/60)+' min ago';if(s<86400)return Math.floor(s/3600)+' h ago';if(s<172800)return 'Yesterday';return fmtDate(iso.slice(0,10),{day:'2-digit',month:'short'})};
const startOfWeek=s=>{const d=parse(s);return addDays(s,-d.getDay())};
const uid=p=>(p||'x')+Math.random().toString(36).slice(2,9);

/* ---------- seeded PRNG ---------- */
function hash(str){let h=1779033703^str.length;for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=h<<13|h>>>19}return h>>>0}
function rngFor(str){let a=hash(str);return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

/* ---------- server sync ---------- */
const SKEY='rmh_session_v1';
const COLLS=['employees','departments','attendance','leaves','tasks','meetings','notifications','conversations','messages','holidays'];
let db=null,snap={},queue=Promise.resolve(),pending=0,pollT=null;
const sess={me:null,collapsed:false,theme:'light'};
try{Object.assign(sess,JSON.parse(localStorage.getItem(SKEY)||'{}'))}catch(e){}
function saveSess(){try{localStorage.setItem(SKEY,JSON.stringify({collapsed:sess.collapsed,theme:sess.theme}))}catch(e){}}
/* Auth token: sessionStorage is per browser tab, so every tab keeps its own signed-in user. */
const TOKEN_KEY='rmh_tab_token';
const getToken=()=>{try{return sessionStorage.getItem(TOKEN_KEY)||''}catch(e){return ''}};
const setToken=t=>{try{t?sessionStorage.setItem(TOKEN_KEY,t):sessionStorage.removeItem(TOKEN_KEY)}catch(e){}};
async function api(path,body){
  const h={};const t=getToken();if(t)h.Authorization='Bearer '+t;
  const opt=body===undefined?{headers:h}:{method:'POST',headers:Object.assign({'Content-Type':'application/json'},h),body:JSON.stringify(body)};
  const r=await fetch(path,opt);
  let j={};try{j=await r.json()}catch(e){}
  if(j&&j.sessionToken)setToken(j.sessionToken);
  if(r.status===401&&getToken())setToken('');
  if(!r.ok){const e=new Error(j.error||'Request failed');e.status=r.status;throw e}
  return j}
const readsKey=()=>'rmh_reads_'+sess.me;
const J=o=>JSON.stringify(o,(k,v)=>k==='online'?undefined:v); // presence flag is never synced
function takeSnap(){snap={};COLLS.forEach(c=>{snap[c]=new Map(db[c].map(o=>[o.id,J(o)]))});snap.settings=JSON.stringify(db.settings);snap.roles=JSON.stringify(db.roles)}
function diff(){
  const changes={};let n=0;
  COLLS.forEach(c=>{const up=[],del=[],ids=new Set();
    db[c].forEach(o=>{ids.add(o.id);if(snap[c].get(o.id)!==J(o))up.push(o)});
    snap[c].forEach((_,id)=>{if(!ids.has(id))del.push(id)});
    if(up.length||del.length){changes[c]={upsert:up,del};n++}});
  const body={changes};
  if(JSON.stringify(db.settings)!==snap.settings){body.settings=db.settings;n++}
  if(JSON.stringify(db.roles)!==snap.roles){body.roles=db.roles;n++}
  return n?body:null}
const dirty=()=>!!db&&(pending>0||!!diff());
function applyState(st){
  db={employees:st.employees,departments:st.departments,attendance:st.attendance,leaves:st.leaves,holidays:st.holidays,tasks:st.tasks,meetings:st.meetings,notifications:st.notifications,conversations:st.conversations,messages:st.messages,settings:st.settings,roles:st.roles,reads:{},rev:st.rev};
  try{db.reads=JSON.parse(localStorage.getItem(readsKey())||'{}')}catch(e){}
  sess.me=st.me;takeSnap()}
async function load(){applyState(await api('/api/state'))}
function save(){
  try{localStorage.setItem(readsKey(),JSON.stringify(db.reads))}catch(e){}
  if(!diff())return;
  pending++;
  queue=queue.then(async()=>{
    const body=diff();if(!body)return;
    try{
      const r=await api('/api/sync',body);
      let changed=false;['attendance','leaves'].forEach(c=>(r.updated[c]||[]).forEach(u=>{const o=db[c].find(x=>x.id===u.id);if(o){const same=J(o)===J(Object.assign({},u,{action:o.action,note:o.note}))||J(o)===J(u);if(!same)changed=true;Object.keys(o).forEach(k=>delete o[k]);Object.assign(o,u)}else{db[c].push(u);changed=true}}));
      db.employees.forEach(e=>delete e.password);
      db.rev=r.rev;takeSnap();
      if(changed&&window.rerender&&!document.querySelector('.overlay'))window.rerender();
    }catch(e){
      if(e.status===401){location.reload();return}
      U.toast(e.message,true);
      try{await load()}catch(_){}
      if(window.rerender)window.rerender()}
  }).finally(()=>{pending--});
}
async function poll(force){
  if(!db||pending>0)return;
  if(document.hidden&&force!==true)return;
  try{
    const st=await api('/api/state?rev='+db.rev);
    if(st.same){const on=new Set(st.online);db.employees.forEach(e=>e.online=on.has(e.id));return}
    if(dirty())return;
    applyState(st);
    const busy=document.querySelector('.overlay')||/INPUT|TEXTAREA|SELECT/.test((document.activeElement||{}).tagName||'');
    if(window.rerender&&!busy)window.rerender();
  }catch(e){if(e.status===401)location.reload()}
}
function startPoll(ms){stopPoll();pollT=setInterval(poll,ms||6000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll()})}
function stopPoll(){clearInterval(pollT)}
function clearData(){db=null}

/* ---------- lookups ---------- */
const A=()=>db.settings.attendance;
const emp=id=>db.employees.find(e=>e.id===id)||{id,name:'Unknown',title:'',dept:'',role:'Employee',color:'#999',online:false};
const dept=id=>(db.departments.find(d=>d.id===id)||{name:'—'}).name;
const me=()=>emp(sess.me);
const can=p=>!!(db.roles[me().role]||{})[p];
const initials=n=>n.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase();
const isHoliday=s=>db.holidays.find(h=>h.date===s);
const isWeekend=s=>A().weekend.includes(parse(s).getDay());
const isWorkday=s=>!isWeekend(s)&&!isHoliday(s);
/* Who the signed-in user may see: Admin = everyone, Manager = self + assigned team, Employee = self */
const inScope=e=>{const m=me();return m.role==='Admin'||e.id===m.id||(m.role==='Manager'&&e.manager===m.id)};
const activeEmps=()=>db.employees.filter(e=>e.status==='Active'&&inScope(e));
const leaveDays=l=>l.days||countLeaveDays(l.from,l.to);
const isPending=l=>l.status==='Pending Manager Approval'||l.status==='Pending Admin Approval';

function leaveOn(empId,s){return db.leaves.find(l=>l.emp===empId&&l.status==='Approved'&&l.from<=s&&s<=l.to)}
function countLeaveDays(from,to){let n=0;for(let d=from;d<=to;d=addDays(d,1))if(isWorkday(d))n++;return n}
function leaveBalance(empId){
  const Y=String(new Date().getFullYear()),res={};
  Object.entries(db.settings.leave).forEach(([type,p])=>{
    const used=db.leaves.filter(l=>l.emp===empId&&l.type===type&&l.status==='Approved'&&l.from.startsWith(Y)).reduce((a,l)=>a+leaveDays(l),0);
    const pending=db.leaves.filter(l=>l.emp===empId&&l.type===type&&isPending(l)).reduce((a,l)=>a+leaveDays(l),0);
    res[type]={total:p.days,used,pending,left:p.days-used,unlimited:type==='Unpaid'};
  });return res}

function record(empId,s){return db.attendance.find(r=>r.emp===empId&&r.date===s)}
/* Effective status for an employee on a date (adds virtual leave/absent) */
function statusFor(empId,s){
  const r=record(empId,s);if(r)return r.status;
  const tf=A().trackFrom;if(tf&&s<tf)return null;
  const j=emp(empId).joined;if(j&&s<j)return null;
  if(s>todayStr())return leaveOn(empId,s)?'leave':null;
  if(leaveOn(empId,s))return 'leave';
  if(!isWorkday(s))return null;
  if(s===todayStr())return nowMin()<=toMin(A().start)+A().grace?'pending':'absent';
  return 'absent';
}
function workedHours(r){
  if(!r||!r.in)return null;
  const end=r.out?toMin(r.out):(r.date===todayStr()?nowMin():null);
  if(end==null)return null;
  let brk=r.breakMin||0;if(r.breakStart&&!r.out)brk+=Math.max(0,nowMin()-toMin(r.breakStart));
  return Math.max(0,(end-toMin(r.in)-brk)/60)}
const overtime=r=>{const h=workedHours(r);return h==null||!r.out?0:Math.max(0,h-A().overtimeAfter)};

/* ---------- notifications ---------- */
function notify(key,type,title,body,to){
  const s=db.settings.notify[key];if(s&&!s.app)return;
  db.notifications.unshift({id:uid('n'),type,title,body,to,read:false,time:new Date().toISOString()});
}
function myNotifs(){const m=me();return db.notifications.filter(n=>n.to==='all'||n.to===m.id||(n.to==='admins'&&m.role==='Admin')).sort((a,b)=>b.time.localeCompare(a.time))}

window.D={load,save,api,setToken,getToken,startPoll,stopPoll,clearData,poll,sess,saveSess,get db(){return db},
  pad,ymd,parse,addDays,todayStr,nowMin,toMin,toHM,nowHM,MONTHS,DOW,fmtDate,fmt12,fmtH,ago,startOfWeek,uid,
  A,emp,dept,me,can,initials,isHoliday,isWeekend,isWorkday,activeEmps,inScope,leaveDays,isPending,leaveOn,countLeaveDays,leaveBalance,record,statusFor,workedHours,overtime,notify,myNotifs,hash,rngFor};
})();
