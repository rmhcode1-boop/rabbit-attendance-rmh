/* Pages: Dashboard, Calendar, Attendance, Timesheet */
(function(){
const {I,esc,$,$$,pill,avatar,person,empty,opts,empOpts,toast,modal,val}=U;
const P=PAGES;
const Q=()=>new URLSearchParams((location.hash.split('?')[1]||''));
window.Q=Q;
const head=(t,sub,act)=>`<div class="page-head"><div><h1>${t}</h1>${sub?`<p>${sub}</p>`:''}</div><div class="actions">${act||''}</div></div>`;
window.head=head;
const sleep=(m)=>new Promise(r=>setTimeout(r,m));
window.leaveTone=st=>st==='Approved'?'ok':st==='Rejected'?'bad':st==='Cancelled'?'':st==='Pending Admin Approval'?'info':'warn';
window.leavePill=l=>U.tone(leaveTone(l.status),l.status);

/* ---- shared computations ---- */
function dayCounts(date){
  const c={present:0,late:0,absent:0,leave:0,half:0,pending:0,total:0};
  D.activeEmps().forEach(e=>{if(e.joined>date)return;const s=D.statusFor(e.id,date);if(!s)return;c[s]++;c.total++});
  return c}
function workdays(n,end){const out=[];let d=end||D.todayStr();while(out.length<n){if(D.isWorkday(d))out.push(d);d=D.addDays(d,-1)}return out.reverse()}
function empRows(from,to,filt){ // per-employee summary
  filt=filt||{};
  return D.activeEmps().filter(e=>(!filt.emp||e.id===filt.emp)&&(!filt.dept||e.dept===filt.dept)).map(e=>{
    const r={e,present:0,late:0,absent:0,leave:0,half:0,hours:0,ot:0,brk:0,days:0,workdays:0};
    for(let d=from;d<=to;d=D.addDays(d,1)){
      if(!D.isWorkday(d)||d<e.joined||d>D.todayStr())continue;
      const s=D.statusFor(e.id,d);if(!s||s==='pending')continue;
      r.workdays++;r[s]++;
      const rec=D.record(e.id,d);const h=D.workedHours(rec);
      if(h!=null){r.hours+=h;r.days++;r.brk+=(rec.breakMin||0)/60;r.ot+=D.overtime(rec)}}
    r.pct=r.workdays-r.leave>0?Math.round((r.present+r.late+r.half)/(r.workdays-r.leave)*100):100;
    return r})}
window.empRows=empRows;window.dayCounts=dayCounts;

/* ================= DASHBOARD ================= */
P.dashboard=function(root){
  const m=D.me(),T=D.todayStr(),a=D.A(),rec=D.record(m.id,T),viewAll=D.can('viewAllAttendance');
  const hr=new Date().getHours();const greet=hr<12?'Good morning':hr<17?'Good afternoon':'Good evening';
  const c=dayCounts(T),active=c.total-c.pending;
  const denom=c.present+c.late+c.half+c.absent;
  const pct=denom?Math.round((c.present+c.late+c.half)/denom*100):100;
  const worked=rec&&rec.in?D.workedHours(rec):null;
  const onBreak=rec&&rec.breakStart&&!rec.out;
  let state=!rec||!rec.in?(D.leaveOn(m.id,T)?'leave':'none'):rec.out?'done':onBreak?'break':'in';
  const stText={none:'You haven\'t checked in yet',leave:'You are on approved leave today',in:'Working — checked in at '+D.fmt12(rec&&rec.in),break:'On break since '+D.fmt12(rec&&rec.breakStart),done:'Shift complete — see you tomorrow'}[state];
  const hero=`<div class="hero"><svg class="deco" viewBox="0 0 160 100" fill="none" stroke="#fff" stroke-width="2.500" stroke-linecap="round"><path d="M10 80c12-30 18-50 28-20s16 30 30 0 18-60 30-20 14 40 28 10"/></svg>
  <div><div class="muted sm">${D.fmtDate(T,{weekday:'long',day:'numeric',month:'long'})}</div><div class="clock" id="live-clock">${new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</div></div>
  <div class="row"><span class="pill ${state==='in'?'ok':state==='break'?'warn':state==='leave'?'info':''}" style="${state==='none'||state==='done'?'background:#222;color:#cfcfd4':''}">${esc(stText)}</span>${rec&&rec.status==='late'?'<span class="pill warn">Late</span>':''}</div>
  <div class="meta"><div><small>Check-in</small><b>${rec&&rec.in?D.fmt12(rec.in):'—'}</b></div><div><small>Check-out</small><b>${rec&&rec.out?D.fmt12(rec.out):'—'}</b></div><div><small>Worked</small><b>${worked!=null?D.fmtH(worked):'—'}</b></div></div>
  <div class="row wrap">${state==='none'?`<button class="btn light" onclick="doCheckIn()">${I('login')} Check in</button>`:''}${state==='in'?`<button class="btn light" onclick="doCheckOut()">${I('logout')} Check out</button><button class="btn" onclick="doBreak()">${I('coffee')} Start break</button>`:''}${state==='break'?`<button class="btn brand" onclick="doBreak()">${I('coffee')} End break</button>`:''}${state==='done'?`<button class="btn" disabled>${I('check')} Completed</button>`:''}<span class="sm muted">Shift ${D.fmt12(a.start)} – ${D.fmt12(a.end)}${rec&&rec.gps?' · GPS: '+esc(rec.gps):''}</span></div></div>`;
  // my week
  const ws=D.startOfWeek(T);const wk=[...Array(7)].map((_,i)=>{const d=D.addDays(ws,i),h=D.workedHours(D.record(m.id,d));return {label:D.DOW[i][0],value:+(h||0).toFixed(1),color:d===T?'var(--ink)':'var(--soft2)',tip:h?D.fmtH(h):'No hours',d}});
  const wkTotal=wk.reduce((x,y)=>x+y.value,0);
  const weekCard=`<div class="card"><div class="card-h"><div><h2>My working hours</h2><div class="sub">This week · target ${a.fullDay*5}h</div></div><div class="right"><div class="bb" style="font-size:22px;letter-spacing:-.03em">${D.fmtH(wkTotal)}</div><div class="xs muted">${Math.round(wkTotal/(a.fullDay*5)*100)}% of target</div></div></div>${U.bars(wk,{h:170,pl:0,noaxis:true,max:Math.max(10,...wk.map(x=>x.value)),fmt:v=>v+'h'})}<div class="bar brand" style="margin-top:6px"><i style="width:${Math.min(100,wkTotal/(a.fullDay*5)*100)}%"></i></div></div>`;
  const kpi=(t,v,ic,tn,foot)=>`<div class="card kpi"><div class="top"><span>${t}</span><span class="ico ${tn}">${I(ic)}</span></div><div class="val">${v}</div><div class="foot">${foot}</div></div>`;
  const kpisCompany=`<div class="grid g4 keep2">${kpi('Present',c.present+c.half,'check','ok',pct+'% attendance today')}${kpi('Late',c.late,'clock','warn','After '+D.fmt12(D.toHM(D.toMin(a.start)+a.grace)))}${kpi('Absent',c.absent+(c.pending?0:0),'x','bad',c.pending?c.pending+' yet to check in':'Not checked in')}${kpi('On leave',c.leave,'leave','info','Approved leave today')}</div>`;
  // ----- role-specific KPIs and cards -----
  const role=m.role,month0=T.slice(0,8)+'01';
  const myLeaves=D.db.leaves.filter(l=>l.emp===m.id).sort((x,y)=>y.applied.localeCompare(x.applied));
  const leaveRow=(l,who)=>'<div class="li">'+(who?person(D.emp(l.emp),l.type+' · '+D.fmtDate(l.from,{day:'2-digit',month:'short'})+(l.to!==l.from?' – '+D.fmtDate(l.to,{day:'2-digit',month:'short'}):'')):'<div class="grow"><b>'+esc(l.type)+' Leave</b><span class="sm muted">'+D.fmtDate(l.from,{day:'2-digit',month:'short'})+(l.to!==l.from?' – '+D.fmtDate(l.to,{day:'2-digit',month:'short'}):'')+' · '+D.leaveDays(l)+' day(s)</span></div>')+'<div class="grow"></div>'+leavePill(l)+'</div>';
  let kpis2='',leaveCard='',balCard='';
  if(role==='Admin'){
    const all_=D.activeEmps(),pend=D.db.leaves.filter(D.isPending),ap=D.db.leaves.filter(l=>l.status==='Approved'&&l.to>=month0&&l.from<=T.slice(0,8)+'31');
    kpis2=`<div class="grid g4 keep2">${kpi('Total employees',all_.filter(e=>e.role==='Employee').length,'users','info','Active employees')}${kpi('Total managers',all_.filter(e=>e.role==='Manager').length,'shield','brand','Team managers')}${kpi('Present today',c.present+c.late+c.half,'check','ok',pct+'% attendance')}${kpi('Absent today',c.absent,'x','bad',c.pending?c.pending+' yet to check in':'Not checked in')}</div>
    <div class="grid g4 keep2">${kpi('Pending leave requests',pend.length,'leave','warn',pend.filter(l=>l.status==='Pending Admin Approval').length+' awaiting your approval')}${kpi('Approved leaves',ap.length,'check','ok','This month')}${kpi('Late today',c.late,'clock','warn','After '+D.fmt12(D.toHM(D.toMin(a.start)+a.grace)))}${kpi('On leave today',c.leave,'leave','info','Approved leave')}</div>`;
    const rl=D.db.leaves.slice().sort((x,y)=>y.applied.localeCompare(x.applied)).slice(0,6);
    leaveCard=`<div class="card"><div class="card-h"><h2>Recent leave requests</h2><a href="#/leaves" class="sm b">View all</a></div>${rl.length?'<div class="list">'+rl.map(l=>leaveRow(l,true)).join('')+'</div>':empty('No leave requests yet','leave')}</div>`;
  }else if(role==='Manager'){
    const team=D.activeEmps().filter(e=>e.id!==m.id),tc={present:0,late:0,absent:0,leave:0,half:0,pending:0};
    team.forEach(e=>{const st=D.statusFor(e.id,T);if(st)tc[st]++});
    const pend=D.db.leaves.filter(l=>l.status==='Pending Manager Approval'&&l.managerId===m.id),openT=D.db.tasks.filter(t=>t.status!=='Completed');
    const tp=tc.present+tc.late+tc.half,td=tp+tc.absent;
    kpis2=`<div class="grid g4 keep2">${kpi('My team',team.length,'users','info','Employees assigned to you')}${kpi('Present today',tp,'check','ok',(td?Math.round(tp/td*100):100)+'% of team')}${kpi('Absent today',tc.absent,'x','bad',tc.pending?tc.pending+' yet to check in':'Not checked in')}${kpi('Pending leave requests',pend.length,'leave','warn','Awaiting your approval')}</div>
    <div class="grid g4 keep2">${kpi('Pending tasks',openT.length,'tasks','brand','Open team tasks')}${kpi('Late today',tc.late,'clock','warn','Team arrivals')}${kpi('Team on leave',tc.leave,'leave','info','Approved leave today')}${kpi('My leave balance',D.leaveBalance(m.id).Annual.left,'leave','','Annual days left')}</div>`;
    leaveCard=`<div class="card"><div class="card-h"><div><h2>Pending leave requests</h2><div class="sub">From your team</div></div><a href="#/leaves" class="sm b">Review</a></div>${pend.length?'<div class="list">'+pend.slice(0,6).map(l=>leaveRow(l,true)).join('')+'</div>':empty('No requests waiting for you','leave')}</div>`;
  }else{
    const mm=empRows(month0,T,{emp:m.id})[0]||{pct:100,present:0,late:0,half:0,absent:0};
    const bal=D.leaveBalance(m.id),openT=D.db.tasks.filter(t=>t.assignee===m.id&&t.status!=='Completed');
    const todayTxt={present:'Present',late:'Present (Late)',half:'Half day',leave:'On leave',absent:'Absent',pending:'Not checked in'}[D.statusFor(m.id,T)||'pending']||'—';
    kpis2=`<div class="grid g4 keep2">${kpi('My attendance',mm.pct+'%','clock','ok',(mm.present+mm.late+mm.half)+' days present this month')}${kpi("Today's status",'<span style="font-size:20px">'+todayTxt+'</span>','check',rec&&rec.in?'ok':'warn',rec&&rec.in?'Checked in '+D.fmt12(rec.in):'Check in from the card above')}${kpi('My pending tasks',openT.length,'tasks','brand',openT.filter(t=>t.due<T).length+' overdue')}${kpi('My leave balance',bal.Annual.left+'<small> / '+bal.Annual.total+'</small>','leave','info','Annual leave days left')}</div>`;
    leaveCard=`<div class="card"><div class="card-h"><h2>Recent leave requests</h2><a href="#/leaves" class="sm b">View all</a></div>${myLeaves.length?'<div class="list">'+myLeaves.slice(0,5).map(l=>leaveRow(l,false)).join('')+'</div>':empty('You haven\'t applied for leave yet','leave')}</div>`;
    balCard=`<div class="card"><div class="card-h"><h2>My leave balance</h2><a href="#/leaves" class="sm b">Apply leave</a></div><div class="stack" style="gap:14px">${Object.entries(bal).map(([k,b])=>b.unlimited?'<div class="row between sm"><b>'+k+'</b><span class="muted">'+b.used+' used</span></div>':'<div><div class="row between sm" style="margin-bottom:5px"><b>'+k+'</b><span class="muted">'+b.left+' of '+b.total+' left'+(b.pending?' · '+b.pending+' pending':'')+'</span></div><div class="bar brand"><i style="width:'+Math.min(100,b.used/Math.max(b.total,1)*100)+'%"></i></div></div>').join('')}</div></div>`;
  }
  // working hours (company / team, last 7 working days) and task overview
  const hrsDays=workdays(7).filter(d=>d<=T);
  const hrsData=hrsDays.map(d=>{const tot=D.activeEmps().reduce((a,e)=>a+(D.workedHours(D.record(e.id,d))||0),0);return {label:D.DOW[D.parse(d).getDay()],value:+tot.toFixed(1),tip:D.fmtH(tot)}});
  const hoursCard='<div class="card"><div class="card-h"><div><h2>'+(role==='Admin'?'Working hours':'Team working hours')+'</h2><div class="sub">Total hours logged · last 7 working days</div></div><span class="pill nodot">'+D.fmtH(hrsData.reduce((a,x)=>a+x.value,0))+'</span></div>'+U.bars(hrsData,{h:190,color:'var(--ink)',fmt:v=>v+'h'})+'</div>';
  const tk=D.db.tasks,tkn=st=>tk.filter(t=>t.status===st).length,overdue=tk.filter(t=>t.status!=='Completed'&&t.due<T).length;
  const taskCard='<div class="card"><div class="card-h"><div><h2>Task overview</h2><div class="sub">'+tk.length+' task'+(tk.length===1?'':'s')+(overdue?' · <span style="color:var(--bad)">'+overdue+' overdue</span>':'')+'</div></div><a href="#/tasks" class="sm b">Open tasks</a></div>'+(tk.length?U.hbars([{label:'To Do',value:tkn('To Do'),text:tkn('To Do')},{label:'In Progress',value:tkn('In Progress'),text:tkn('In Progress'),color:'var(--info)'},{label:'Completed',value:tkn('Completed'),text:tkn('Completed'),color:'var(--ok)'}],{max:Math.max(1,tk.length)}):empty('No tasks yet','tasks'))+'</div>';
  // trend
  const days=workdays(14).filter(d=>d<=T);
  const trend=days.map(d=>{const k=dayCounts(d);return {label:d.slice(8),v:{present:k.present,late:k.late+k.half,absent:k.absent,leave:k.leave}}});
  const trendCard=`<div class="card"><div class="card-h"><div><h2>Attendance trend</h2><div class="sub">Last 14 working days · headcount by status</div></div></div>${U.stacked(trend,['present','late','absent','leave'])}<div style="margin-top:8px">${U.legend(['present','late','absent','leave'])}</div></div>`;
  // dept today
  const depts=D.db.departments.map(d=>{const es=D.activeEmps().filter(e=>e.dept===d.id);const inn=es.filter(e=>['present','late','half'].includes(D.statusFor(e.id,T))).length;return {label:d.name,value:inn,max:es.length,text:inn+' / '+es.length}});
  const donutCard=`<div class="card"><div class="card-h"><div><h2>Today by department</h2><div class="sub">Checked in vs headcount</div></div></div><div class="row" style="gap:18px;align-items:center;margin-bottom:16px">${U.donut([{label:'Present',value:c.present+c.half,color:U.SC.present},{label:'Late',value:c.late,color:U.SC.late},{label:'Absent',value:c.absent,color:U.SC.absent},{label:'On leave',value:c.leave,color:U.SC.leave},{label:'Not in yet',value:c.pending,color:'var(--soft2)'}],pct+'%','present')}<div class="stack" style="gap:8px;font-size:12px">${[['Present',c.present+c.half,U.SC.present],['Late',c.late,U.SC.late],['Absent',c.absent,U.SC.absent],['On leave',c.leave,U.SC.leave],['Not in yet',c.pending,'var(--soft2)']].map(x=>`<span><i style="display:inline-block;width:9px;height:9px;border-radius:3px;background:${x[2]};margin-right:6px"></i>${x[0]} <b>${x[1]}</b></span>`).join('')}</div></div>${U.hbars(depts.map(d=>({label:d.label,value:d.value/Math.max(d.max,1)*100,text:d.text})),{max:100})}</div>`;
  // tasks today
  const mine=D.db.tasks.filter(t=>(m.role==='Manager'?true:t.assignee===m.id)&&t.status!=='Completed').sort((x,y)=>x.due.localeCompare(y.due)).slice(0,5);
  const tasksCard=`<div class="card"><div class="card-h"><h2>${m.role==='Manager'?'Team tasks':m.role==='Employee'?'My pending tasks':'Today\'s tasks'}</h2><a href="#/tasks" class="sm b">See all</a></div>${mine.length?`<div class="list">${mine.map(t=>`<a class="li" href="#/tasks?open=${t.id}"><span class="ico ${t.due<T?'bad':t.due===T?'warn':''} kpi" style="width:36px;height:36px;border-radius:12px;display:grid;place-items:center;background:var(--soft2)">${I('tasks')}</span><div class="grow"><b>${esc(t.title)}</b><span class="sm muted">${m.role==='Manager'?esc(D.emp(t.assignee).name)+' · ':''}${t.due<T?'Overdue · ':t.due===T?'Due today · ':'Due '+D.fmtDate(t.due,{day:'2-digit',month:'short'})+' · '}${t.progress}%</span></div><span class="prio ${t.priority.toLowerCase()}">${t.priority}</span></a>`).join('')}</div>`:empty('No pending tasks — nice work!','tasks')}</div>`;
  const hols=D.db.holidays.filter(h=>h.date>=T).sort((x,y)=>x.date.localeCompare(y.date)).slice(0,3);
  const mts=D.db.meetings.filter(x=>x.date>=T).sort((x,y)=>(x.date+x.time).localeCompare(y.date+y.time)).slice(0,3);
  const upCard=`<div class="card"><div class="card-h"><h2>Upcoming</h2><a href="#/holidays" class="sm b">Holidays</a></div><div class="list">${hols.map(h=>`<div class="li"><div class="avatar" style="background:#ece7fb;color:#6b4bd6;flex-direction:column;line-height:1"><span style="font-size:14px">${h.date.slice(8)}</span><span style="font-size:8px;text-transform:uppercase">${D.MONTHS[+h.date.slice(5,7)-1].slice(0,3)}</span></div><div class="grow"><b>${esc(h.name)}</b><span class="sm muted">Holiday · in ${Math.round((D.parse(h.date)-D.parse(T))/864e5)} days</span></div></div>`).join('')}${mts.map(x=>`<div class="li"><span class="avatar" style="background:var(--dark)">${I('calendar')}</span><div class="grow"><b>${esc(x.title)}</b><span class="sm muted">${x.date===T?'Today':D.fmtDate(x.date,{weekday:'short',day:'2-digit',month:'short'})} · ${D.fmt12(x.time)}</span></div></div>`).join('')}</div></div>`;
  const nts=D.myNotifs().slice(0,4);
  const notCard=`<div class="card"><div class="card-h"><h2>Recent notifications</h2><a href="#/notifications" class="sm b">View all</a></div>${nts.length?`<div class="list">${nts.map(n=>`<div class="li"><span class="dotc" style="background:${n.read?'var(--soft2)':'var(--brand)'}"></span><div class="grow"><b style="font-size:13px">${esc(n.title)}</b><span class="sm muted">${esc(n.body)}</span></div><span class="xs muted nowrap">${D.ago(n.time)}</span></div>`).join('')}</div>`:empty('No notifications','bell')}</div>`;
  // who's in
  const ppl=D.activeEmps().filter(e=>e.joined<=T).map(e=>({e,s:D.statusFor(e.id,T),r:D.record(e.id,T)})).sort((x,y)=>(x.r&&x.r.in||'99').localeCompare(y.r&&y.r.in||'99')).slice(0,viewAll?8:6);
  const whoCard=`<div class="card"><div class="card-h"><div><h2>${m.role==='Manager'?'Team attendance today':'Who\'s in today'}</h2><div class="sub">${c.present+c.late+c.half} of ${c.total} checked in</div></div><a href="#/attendance" class="sm b">${viewAll?'Full log':'My attendance'}</a></div><div class="list">${ppl.map(x=>`<div class="li">${person(x.e,x.e.title)}<div class="grow"></div>${viewAll&&x.r&&x.r.in?`<span class="sm muted nowrap hide-m">${D.fmt12(x.r.in)}</span>`:''}${pill(x.s)}</div>`).join('')}</div></div>`;
  // stats
  const emps=D.activeEmps();const byDept=D.db.departments.map(d=>({label:d.name,value:emps.filter(e=>e.dept===d.id).length})).filter(x=>x.value);
  const month=T.slice(0,8)+'01';const rows=empRows(month,T);const mAvg=rows.length?Math.round(rows.reduce((x,y)=>x+y.pct,0)/rows.length):0;const avgH=rows.reduce((x,y)=>x+y.hours,0)/Math.max(1,rows.reduce((x,y)=>x+y.days,0));
  const newJ=emps.filter(e=>D.addDays(e.joined,60)>=T).length;
  const statCard=`<div class="card"><div class="card-h"><h2>Employee statistics</h2><span class="pill nodot">${emps.length} active</span></div><div class="grid g3 keep2" style="gap:10px;margin-bottom:16px"><div class="card soft" style="padding:12px"><div class="muted xs">Monthly attendance</div><div class="bb" style="font-size:20px">${mAvg}%</div></div><div class="card soft" style="padding:12px"><div class="muted xs">Avg. daily hours</div><div class="bb" style="font-size:20px">${avgH.toFixed(1)}h</div></div><div class="card soft" style="padding:12px"><div class="muted xs">New joiners (60d)</div><div class="bb" style="font-size:20px">${newJ}</div></div></div>${U.hbars(byDept.map(d=>({label:d.label,value:d.value,text:d.value+' people'})),{cls:'brand',max:Math.max(...byDept.map(d=>d.value))})}</div>`;
  root.innerHTML=head(`${greet}, ${esc(m.name.split(' ')[0])}`,m.role+' dashboard · Rabbit Marketing House',role!=='Employee'?`<button class="btn" id="exp">${I('download')} Export today</button>`:'')+
   '<div class="stack"><div class="grid g-main2">'+hero+weekCard+'</div>'+kpis2+
    (role==='Admin'?'<div class="grid g-main">'+trendCard+donutCard+'</div><div class="grid g-main2">'+hoursCard+taskCard+'</div><div class="grid g3">'+leaveCard+upCard+notCard+'</div><div class="grid g-main2">'+whoCard+statCard+'</div>'
    :role==='Manager'?'<div class="grid g-main">'+trendCard+leaveCard+'</div><div class="grid g-main2">'+hoursCard+taskCard+'</div><div class="grid g3">'+tasksCard+upCard+notCard+'</div>'+whoCard
    :'<div class="grid g-main2">'+leaveCard+balCard+'</div><div class="grid g3">'+tasksCard+upCard+notCard+'</div>')+'</div>';
  const ex=$('#exp');if(ex)ex.onclick=()=>U.csv('attendance-'+T,[['Employee','Department','Status','Check-in','Check-out','Hours']].concat(D.activeEmps().map(e=>{const r=D.record(e.id,T);return [e.name,D.dept(e.dept),D.statusFor(e.id,T),r&&r.in||'',r&&r.out||'',D.workedHours(r)!=null?D.workedHours(r).toFixed(2):'']})));
};

/* ================= CALENDAR ================= */
const CAL={view:'month',date:D.todayStr(),sel:D.todayStr(),f:{attendance:true,leave:true,holiday:true,task:true,meeting:true}};
function eventsOn(d){
  const m=D.me(),all=D.can('viewAllAttendance'),ev=[],T=D.todayStr();
  const h=D.isHoliday(d);if(h)ev.push({t:'holiday',label:h.name,sub:h.desc});
  D.db.leaves.filter(l=>l.status==='Approved'&&l.from<=d&&d<=l.to&&(all||l.emp===m.id||true)).forEach(l=>ev.push({t:'leave',label:D.emp(l.emp).name.split(' ')[0]+' · '+l.type+' leave',sub:D.emp(l.emp).name+' — '+l.reason}));
  D.db.tasks.filter(t=>t.due===d&&(all||t.assignee===m.id)).forEach(t=>ev.push({t:'task',label:t.title,sub:'Assigned to '+D.emp(t.assignee).name+' · '+t.status,id:t.id}));
  D.db.meetings.filter(x=>x.date===d&&(x.all||all||x.by===m.id||(x.members||[]).includes(m.id))).forEach(x=>ev.push({t:'meeting',label:D.fmt12(x.time)+' '+x.title,sub:x.dur+' min · by '+D.emp(x.by).name,time:x.time,id:x.id}));
  if(d<=T){const s=D.statusFor(m.id,d);if(s&&s!=='pending'&&s!=='leave'){const r=D.record(m.id,d);ev.push({t:'attendance',cls:s,label:U.STATUS[s][1]+(r&&r.in?' '+r.in:''),sub:r&&r.in?`In ${D.fmt12(r.in)}${r.out?' · Out '+D.fmt12(r.out):''}`:'No check-in'})}}
  return ev.filter(e=>CAL.f[e.t])}
P.calendar=function(root){
  const T=D.todayStr();
  function draw(){
    const cd=D.parse(CAL.date),Y=cd.getFullYear(),Mo=cd.getMonth();
    let title='',body='';
    const evHTML=(e,compact)=>`<span class="ev ${e.cls||e.t}" title="${esc(e.sub||'')}">${esc(e.label)}</span>`;
    if(CAL.view==='month'){
      title=D.MONTHS[Mo]+' '+Y;const first=new Date(Y,Mo,1,12),start=D.ymd(new Date(Y,Mo,1-first.getDay(),12));
      let cells=D.DOW.map(x=>`<div class="cal-dow">${x}</div>`).join('');
      for(let i=0;i<42;i++){const d=D.addDays(start,i),out=D.parse(d).getMonth()!==Mo,ev=eventsOn(d);
        if(i>=35&&out)break;
        cells+=`<div class="cal-cell ${out?'out':''} ${D.isWeekend(d)?'wk':''} ${d===T?'today':''} ${d===CAL.sel?'sel':''}" data-d="${d}"><span class="dn">${+d.slice(8)}</span>${ev.slice(0,3).map(evHTML).join('')}${ev.length>3?`<span class="xs muted">+${ev.length-3} more</span>`:''}<div class="dots">${ev.slice(0,4).map(e=>`<i class="dotc" style="background:${{holiday:'#6b4bd6',leave:'var(--info)',task:'#93949a',meeting:'var(--dark)',attendance:U.SC[e.cls]||'#1f9d55'}[e.t]}"></i>`).join('')}</div></div>`}
      body=`<div class="cal-grid">${cells}</div>`}
    else if(CAL.view==='week'){
      const ws=D.startOfWeek(CAL.date);title=D.fmtDate(ws,{day:'numeric',month:'short'})+' – '+D.fmtDate(D.addDays(ws,6),{day:'numeric',month:'short',year:'numeric'});
      body=`<div class="week-grid">${[...Array(7)].map((_,i)=>{const d=D.addDays(ws,i);return `<div class="week-col ${d===T?'today':''}" data-d="${d}"><h4>${D.DOW[i]} ${+d.slice(8)}</h4>${eventsOn(d).map(evHTML).join('')||'<span class="xs muted">No events</span>'}</div>`}).join('')}</div>`}
    else{
      title=D.fmtDate(CAL.date,{weekday:'long',day:'numeric',month:'long',year:'numeric'});const ev=eventsOn(CAL.date);
      body=ev.length?`<div class="list day-list">${ev.map(dayRow).join('')}</div>`:empty('Nothing scheduled for this day','calendar')}
    const sel=eventsOn(CAL.sel);
    root.innerHTML=head('Calendar','Attendance, leaves, holidays, meetings and task deadlines in one place.',`<button class="btn primary" id="addm">${I('plus')} New meeting</button>`)+
    `<div class="grid g-main"><div class="card"><div class="cal-head"><div class="row"><button class="btn icon" id="prev" aria-label="Previous">${I('chevL')}</button><button class="btn icon" id="next" aria-label="Next">${I('chevR')}</button></div><div class="cal-title">${title}</div><button class="btn sm" id="today">Today</button><div class="spacer"></div><div class="tabs">${['month','week','day'].map(v=>`<button data-v="${v}" class="${CAL.view===v?'on':''}">${v[0].toUpperCase()+v.slice(1)}</button>`).join('')}</div></div>
    <div class="chips" style="margin-bottom:14px">${[['attendance','My attendance'],['leave','Leaves'],['holiday','Holidays'],['meeting','Meetings'],['task','Tasks']].map(f=>`<button class="chip ${CAL.f[f[0]]?'on':''}" data-f="${f[0]}">${f[1]}</button>`).join('')}</div>${body}</div>
    <div class="card"><div class="card-h"><div><h2>${D.fmtDate(CAL.sel,{weekday:'long',day:'numeric',month:'long'})}</h2><div class="sub">${sel.length} event${sel.length===1?'':'s'}</div></div></div>${sel.length?`<div class="list day-list">${sel.map(dayRow).join('')}</div>`:empty('No events on this day','calendar')}</div></div>`;
    bind()}
  const dayRow=e=>`<div class="li"><span class="dotc" style="margin-top:6px;background:${{holiday:'#6b4bd6',leave:'var(--info)',task:'#93949a',meeting:'var(--dark)',attendance:U.SC[e.cls]||'#1f9d55'}[e.t]}"></span><div class="grow"><b>${esc(e.label)}</b><span class="sm muted">${esc(e.sub||'')}</span></div><span class="pill nodot">${e.t}</span>${e.t==='task'?`<a class="btn sm" href="#/tasks?open=${e.id}">Open</a>`:''}</div>`;
  function shift(n){const d=D.parse(CAL.date);if(CAL.view==='month')d.setMonth(d.getMonth()+n,1);else d.setDate(d.getDate()+n*(CAL.view==='week'?7:1));CAL.date=D.ymd(d);if(CAL.view==='day')CAL.sel=CAL.date;draw()}
  function bind(){
    $('#prev').onclick=()=>shift(-1);$('#next').onclick=()=>shift(1);
    $('#today').onclick=()=>{CAL.date=CAL.sel=T;draw()};
    $$('[data-v]',root).forEach(b=>b.onclick=()=>{CAL.view=b.dataset.v;draw()});
    $$('[data-f]',root).forEach(b=>b.onclick=()=>{CAL.f[b.dataset.f]=!CAL.f[b.dataset.f];draw()});
    $$('[data-d]',root).forEach(c=>c.onclick=()=>{CAL.sel=c.dataset.d;if(CAL.view==='week'||CAL.view==='month'){}draw()});
    $('#addm').onclick=()=>meetingModal(draw)}
  draw()};
function meetingModal(done){
  modal({title:'New meeting',body:`<div class="form-grid"><div class="field full"><label>Title</label><input class="inp" name="title" placeholder="e.g. Campaign kick-off"></div><div class="field"><label>Date</label><input class="inp" type="date" name="date" value="${CAL.sel}"></div><div class="field"><label>Start time</label><input class="inp" type="time" name="time" value="11:00"></div><div class="field"><label>Duration (min)</label><input class="inp" type="number" name="dur" value="30" min="5" step="5"></div><div class="field"><label>Invite</label><select class="sel" name="who"><option value="all">Everyone</option><option value="dept">My department</option><option value="me">Only me</option></select></div></div>`,
  actions:[{text:'Cancel'},{text:'Schedule',cls:'primary',fn:ov=>{const t=val(ov,'title');if(!t||!val(ov,'date')){toast('Title and date are required',true);return false}
    const who=val(ov,'who'),m=D.me();
    D.db.meetings.push({id:D.uid('m'),title:t,date:val(ov,'date'),time:val(ov,'time')||'11:00',dur:+val(ov,'dur')||30,by:m.id,all:who==='all',members:who==='dept'?D.db.employees.filter(e=>e.dept===m.dept).map(e=>e.id):[m.id],type:'meeting'});
    D.save();toast('Meeting scheduled');done()}}]})}

/* ================= ATTENDANCE ================= */
const AT={from:null,to:null,emp:'',dept:'',status:'',page:1};
const gpsBadge=g=>({Verified:`<span class="pill ok nodot">${I('pin')} GPS verified</span>`,Remote:'<span class="pill info nodot">Remote</span>','Off-site':`<span class="pill bad nodot">${I('mapoff')} Off-site</span>`,Unavailable:'<span class="pill warn nodot">GPS unavailable</span>'}[g]||'<span class="muted">—</span>');
P.attendance=function(root){
  const T=D.todayStr(),m=D.me(),all=D.can('viewAllAttendance');
  if(!AT.from){AT.from=D.addDays(T,-6);AT.to=T}
  const q=Q();if(q.get('emp')&&all){AT.emp=q.get('emp');history.replaceState(null,'','#/attendance')}
  if(!all)AT.emp=m.id;
  function rowsData(){
    const rows=[];if(AT.from>AT.to)return rows;
    const from=AT.from<D.addDays(AT.to,-92)?D.addDays(AT.to,-92):AT.from;
    for(let d=AT.to;d>=from;d=D.addDays(d,-1)){
      if(d>T)continue;
      D.activeEmps().forEach(e=>{
        if(e.joined>d||(AT.emp&&e.id!==AT.emp)||(AT.dept&&e.dept!==AT.dept))return;
        const s=D.statusFor(e.id,d);if(!s)return;if(AT.status&&s!==AT.status)return;
        rows.push({e,d,s,r:D.record(e.id,d)})})}
    return rows}
  function draw(){
    const rec=D.record(m.id,T),rows=rowsData(),pg=U.paginate(rows,AT.page,15);AT.page=pg.page;
    const cnt={};rows.forEach(r=>cnt[r.s]=(cnt[r.s]||0)+1);
    const hrs=rows.map(r=>D.workedHours(r.r)).filter(h=>h!=null);
    let btns='';
    if(!rec||!rec.in)btns=D.leaveOn(m.id,T)?'':`<button class="btn primary" onclick="doCheckIn()">${I('login')} Check in</button>`;
    else if(!rec.out)btns=`<button class="btn" onclick="doBreak()">${I('coffee')} ${rec.breakStart?'End break':'Start break'}</button><button class="btn primary" onclick="doCheckOut()">${I('logout')} Check out</button>`;
    root.innerHTML=head('Attendance',all?'Monitor check-ins, check-outs and attendance history for the whole team.':'Your check-in history and daily status.',`${btns}<button class="btn" id="exp">${I('download')} Export</button>${D.can('editAttendance')?`<button class="btn" id="add">${I('plus')} Manual entry</button>`:''}`)+
    `<div class="grid g4 keep2" style="margin-bottom:18px">${[['Present','present'],['Late','late'],['Absent','absent'],['On leave','leave']].map(x=>`<div class="card kpi" style="padding:16px"><div class="top"><span>${x[0]}</span><i class="dotc" style="background:${U.SC[x[1]]}"></i></div><div class="val">${(cnt[x[1]]||0)+(x[1]==='present'?(cnt.half||0):0)}</div><div class="foot">${hrs.length?'':''}in selected range</div></div>`).join('')}</div>
    <div class="card"><div class="filters"><div class="field"><label>From</label><input class="inp" type="date" id="f-from" value="${AT.from}" max="${T}"></div><div class="field"><label>To</label><input class="inp" type="date" id="f-to" value="${AT.to}" max="${T}"></div>
    ${all?`<div class="field"><label>Employee</label><select class="sel" id="f-emp">${empOpts(AT.emp,'All employees')}</select></div><div class="field"><label>Department</label><select class="sel" id="f-dept">${opts(D.db.departments.map(d=>[d.id,d.name]),AT.dept,'All departments')}</select></div>`:''}
    <div class="field"><label>Status</label><select class="sel" id="f-st">${opts([['present','Present'],['late','Late'],['absent','Absent'],['half','Half Day'],['leave','On Leave'],['pending','Not in yet']],AT.status,'All statuses')}</select></div><button class="btn" id="f-reset">Reset</button></div>
    ${rows.length?`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Employee</th><th>Date</th><th>Check-in</th><th>Check-out</th><th>Hours</th><th>Status</th><th>Location</th>${D.can('editAttendance')?'<th></th>':''}</tr></thead><tbody>${pg.items.map(x=>{const h=D.workedHours(x.r);return `<tr><td class="first" data-label="Employee">${person(x.e,D.dept(x.e.dept))}</td><td data-label="Date" class="nowrap">${D.fmtDate(x.d,{weekday:'short',day:'2-digit',month:'short'})}</td><td data-label="Check-in">${x.r&&x.r.in?D.fmt12(x.r.in):'—'}</td><td data-label="Check-out">${x.r&&x.r.out?D.fmt12(x.r.out):(x.r&&x.r.in&&x.d===T?'<span class="muted">Working…</span>':'—')}</td><td data-label="Hours">${h!=null?D.fmtH(h):'—'}</td><td data-label="Status">${pill(x.s)}</td><td data-label="Location">${x.r&&x.r.mode&&x.r.mode!=='—'?`<div class="sm b">${esc(x.r.mode)}</div>`:''}${x.r&&x.r.gps&&x.r.gps!=='—'?gpsBadge(x.r.gps):'<span class="muted">—</span>'}</td>${D.can('editAttendance')?`<td data-label=""><button class="btn sm icon" data-edit="${x.e.id}|${x.d}" aria-label="Edit">${I('edit')}</button></td>`:''}</tr>`}).join('')}</tbody></table></div>${U.pagerHTML(pg)}`:empty('No attendance records match your filters','clock')}</div>`;
    const bindF=(id,k)=>{const el=$(id);if(el)el.onchange=()=>{AT[k]=el.value;AT.page=1;draw()}};
    bindF('#f-from','from');bindF('#f-to','to');bindF('#f-emp','emp');bindF('#f-dept','dept');bindF('#f-st','status');
    $('#f-reset').onclick=()=>{AT.from=D.addDays(T,-6);AT.to=T;AT.emp='';AT.dept='';AT.status='';AT.page=1;draw()};
    $$('[data-pg]',root).forEach(b=>b.onclick=()=>{AT.page=+b.dataset.pg;draw()});
    $('#exp').onclick=()=>U.csv('attendance-'+AT.from+'_to_'+AT.to,[['Employee','Department','Date','Check-in','Check-out','Hours','Break (min)','Status','Mode','GPS']].concat(rows.map(x=>[x.e.name,D.dept(x.e.dept),x.d,x.r&&x.r.in||'',x.r&&x.r.out||'',D.workedHours(x.r)!=null?D.workedHours(x.r).toFixed(2):'',x.r?x.r.breakMin||0:'',U.STATUS[x.s][1],x.r&&x.r.mode||'',x.r&&x.r.gps||''])));
    $$('[data-edit]',root).forEach(b=>b.onclick=()=>{const [e,d]=b.dataset.edit.split('|');editModal(e,d,draw)});
    const ad=$('#add');if(ad)ad.onclick=()=>editModal('',T,draw)}
  draw()};
function editModal(empId,date,done){
  const r=empId?D.record(empId,date):null;
  modal({title:r?'Edit attendance':'Manual attendance entry',body:`<div class="form-grid"><div class="field"><label>Employee</label><select class="sel" name="emp" ${empId?'disabled':''}>${empOpts(empId)}</select></div><div class="field"><label>Date</label><input class="inp" type="date" name="date" value="${date}" max="${D.todayStr()}" ${empId?'disabled':''}></div>
  <div class="field"><label>Check-in</label><input class="inp" type="time" name="in" value="${r&&r.in||''}"></div><div class="field"><label>Check-out</label><input class="inp" type="time" name="out" value="${r&&r.out||''}"></div>
  <div class="field"><label>Break (min)</label><input class="inp" type="number" name="brk" min="0" value="${r?r.breakMin||0:D.A().breakMin}"></div><div class="field"><label>Status</label><select class="sel" name="st">${opts([['present','Present'],['late','Late'],['half','Half Day'],['absent','Absent'],['leave','On Leave']],r?r.status:'present')}</select></div>
  <div class="field"><label>Work mode</label><select class="sel" name="mode">${opts(['Office','Remote','Field'],r&&r.mode)}</select></div><div class="field"><label>Note</label><input class="inp" name="note" value="${esc(r&&r.note||'')}" placeholder="Reason for adjustment"></div></div>`,
  actions:[...(r?[{text:I('trash')+' Delete',cls:'danger',fn:()=>{D.db.attendance=D.db.attendance.filter(x=>x!==r);D.save();toast('Record removed');done()}}]:[]),{text:'Cancel'},{text:'Save',cls:'primary',fn:ov=>{
    const e=empId||val(ov,'emp'),d=empId?date:val(ov,'date');if(!e||!d){toast('Select employee and date',true);return false}
    const st=val(ov,'st'),tin=val(ov,'in'),tout=val(ov,'out');
    if(['present','late','half'].includes(st)&&!tin){toast('Check-in time is required',true);return false}
    if(tin&&tout&&tout<=tin){toast('Check-out must be after check-in',true);return false}
    const data={status:st,in:tin||null,out:tout||null,breakMin:+val(ov,'brk')||0,mode:val(ov,'mode')||'Office',note:val(ov,'note')};
    const ex=D.record(e,d);if(ex)Object.assign(ex,data,{gps:ex.gps&&ex.gps!=='—'?ex.gps:'Verified'});else D.db.attendance.push(Object.assign({id:D.uid('a'),emp:e,date:d,gps:tin?(data.mode==='Remote'?'Remote':'Verified'):'—'},data));
    D.save();toast('Attendance saved');done()}}]})}

/* ================= TIMESHEET ================= */
const TS={tab:'week',week:D.startOfWeek(D.todayStr()),emp:null,from:null,to:null};
P.timesheet=function(root){
  const T=D.todayStr(),m=D.me(),all=D.can('viewAllAttendance');
  if(!TS.emp||!all)TS.emp=m.id;
  if(!TS.from){TS.from=T.slice(0,8)+'01';TS.to=T}
  const a=D.A();
  function draw(){
    let body='';
    if(TS.tab==='week'){
      const e=D.emp(TS.emp);const days=[...Array(7)].map((_,i)=>D.addDays(TS.week,i));
      const recs=days.map(d=>({d,r:D.record(e.id,d),s:D.statusFor(e.id,d)}));
      const tot=recs.reduce((x,y)=>x+(D.workedHours(y.r)||0),0),ot=recs.reduce((x,y)=>x+D.overtime(y.r),0),brk=recs.reduce((x,y)=>x+((y.r&&y.r.breakMin)||0),0);
      const wd=recs.filter(x=>x.r&&x.r.in).length;
      body=`<div class="grid g4 keep2" style="margin-bottom:18px">${[['Total hours',D.fmtH(tot),'timer','','of '+a.fullDay*5+'h expected'],['Overtime',D.fmtH(ot),'trend','warn','beyond '+a.overtimeAfter+'h/day'],['Break time',D.fmtH(brk/60),'coffee','info','Total this week'],['Avg / day',wd?D.fmtH(tot/wd):'—','clock','ok',wd+' days worked']].map(k=>`<div class="card kpi"><div class="top"><span>${k[0]}</span><span class="ico ${k[3]}">${I(k[2])}</span></div><div class="val" style="font-size:24px">${k[1]}</div><div class="foot">${k[4]}</div></div>`).join('')}</div>
      <div class="grid g-main"><div class="card"><div class="card-h"><div><h2>Daily hours</h2><div class="sub">${esc(e.name)} · ${D.fmtDate(TS.week,{day:'2-digit',month:'short'})} – ${D.fmtDate(days[6],{day:'2-digit',month:'short'})}</div></div></div>${U.bars(recs.map(x=>{const h=D.workedHours(x.r)||0;return {label:D.DOW[D.parse(x.d).getDay()]+' '+x.d.slice(8),value:+h.toFixed(2),tip:D.fmtH(h),color:h>a.overtimeAfter?'#ff6a2b':'var(--dark)'}}),{max:12,fmt:v=>v+'h'})}<div class="legend" style="margin-top:6px"><span><i style="background:var(--dark)"></i>Regular</span><span><i style="background:#ff6a2b"></i>Over ${a.overtimeAfter}h (overtime)</span></div></div>
      <div class="card"><div class="card-h"><h2>Week progress</h2></div>${U.hbars([{label:'Hours logged',value:tot,max:1,text:D.fmtH(tot)+' / '+a.fullDay*5+'h'}],{max:a.fullDay*5,cls:'brand'})}<div class="list" style="margin-top:18px"><div class="li"><div class="grow">Late arrivals</div><b>${recs.filter(x=>x.s==='late').length}</b></div><div class="li"><div class="grow">Leave days</div><b>${recs.filter(x=>x.s==='leave').length}</b></div><div class="li"><div class="grow">Absent days</div><b>${recs.filter(x=>x.s==='absent'&&x.d<=T).length}</b></div></div></div></div>
      <div class="card" style="margin-top:18px"><div class="card-h"><h2>Daily breakdown</h2></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Check-in</th><th>Check-out</th><th>Break</th><th>Worked</th><th>Overtime</th><th>Status</th></tr></thead><tbody>${recs.map(x=>{const h=D.workedHours(x.r),off=!D.isWorkday(x.d);return `<tr><td class="first" data-label="Date"><b>${D.fmtDate(x.d,{weekday:'long'})}</b><div class="sm muted">${D.fmtDate(x.d)}</div></td><td data-label="Check-in">${x.r&&x.r.in?D.fmt12(x.r.in):'—'}</td><td data-label="Check-out">${x.r&&x.r.out?D.fmt12(x.r.out):'—'}</td><td data-label="Break">${x.r&&x.r.breakMin?x.r.breakMin+' min':'—'}</td><td data-label="Worked"><b>${h!=null?D.fmtH(h):'—'}</b></td><td data-label="Overtime">${D.overtime(x.r)>0?'<span class="pill warn nodot">+'+D.fmtH(D.overtime(x.r))+'</span>':'—'}</td><td data-label="Status">${x.d>T?'<span class="muted">Upcoming</span>':off?`<span class="pill nodot">${D.isHoliday(x.d)?'Holiday':'Weekend'}</span>`:x.s?pill(x.s):'—'}</td></tr>`}).join('')}</tbody><tfoot></tfoot></table></div></div>`}
    else{
      const rows=empRows(TS.from,TS.to).sort((x,y)=>y.hours-x.hours);
      body=`<div class="card"><div class="filters"><div class="field"><label>From</label><input class="inp" type="date" id="r-from" value="${TS.from}"></div><div class="field"><label>To</label><input class="inp" type="date" id="r-to" value="${TS.to}" max="${T}"></div><button class="btn" id="r-exp">${I('download')} Export</button></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Employee</th><th>Days</th><th>Total hours</th><th>Avg / day</th><th>Break</th><th>Overtime</th><th>Late days</th></tr></thead><tbody>${rows.map(r=>`<tr><td class="first" data-label="Employee">${person(r.e,D.dept(r.e.dept))}</td><td data-label="Days">${r.days}</td><td data-label="Total hours"><b>${D.fmtH(r.hours)}</b></td><td data-label="Avg / day">${r.days?D.fmtH(r.hours/r.days):'—'}</td><td data-label="Break">${D.fmtH(r.brk)}</td><td data-label="Overtime">${r.ot>0?'<span class="pill warn nodot">'+D.fmtH(r.ot)+'</span>':'—'}</td><td data-label="Late days">${r.late||'—'}</td></tr>`).join('')}</tbody></table></div></div>`;
      TS._rows=rows}
    root.innerHTML=head('Timesheet','Working hours, breaks and overtime.',`<div class="tabs"><button data-t="week" class="${TS.tab==='week'?'on':''}">${all?'Employee timesheet':'My timesheet'}</button>${all?`<button data-t="range" class="${TS.tab==='range'?'on':''}">All employees</button>`:''}</div>`)+
    (TS.tab==='week'?`<div class="filters"><div class="row"><button class="btn icon" id="pw" aria-label="Previous week">${I('chevL')}</button><button class="btn" id="tw">This week</button><button class="btn icon" id="nw" aria-label="Next week">${I('chevR')}</button></div>${all?`<div class="field"><label>Employee</label><select class="sel" id="t-emp">${empOpts(TS.emp)}</select></div>`:''}<div class="field"><label>Week of</label><input class="inp" type="date" id="t-date" value="${TS.week}"></div></div>`:'')+body;
    $$('[data-t]',root).forEach(b=>b.onclick=()=>{TS.tab=b.dataset.t;draw()});
    const on=(id,fn)=>{const el=$(id);if(el)el.onclick=fn};
    on('#pw',()=>{TS.week=D.addDays(TS.week,-7);draw()});on('#nw',()=>{TS.week=D.addDays(TS.week,7);draw()});on('#tw',()=>{TS.week=D.startOfWeek(T);draw()});
    const te=$('#t-emp');if(te)te.onchange=()=>{TS.emp=te.value;draw()};
    const td=$('#t-date');if(td)td.onchange=()=>{if(td.value){TS.week=D.startOfWeek(td.value);draw()}};
    const rf=$('#r-from'),rt=$('#r-to');if(rf)rf.onchange=()=>{TS.from=rf.value;draw()};if(rt)rt.onchange=()=>{TS.to=rt.value;draw()};
    on('#r-exp',()=>U.csv('timesheet-'+TS.from+'_'+TS.to,[['Employee','Department','Days worked','Total hours','Avg/day','Break hours','Overtime hours','Late days']].concat(TS._rows.map(r=>[r.e.name,D.dept(r.e.dept),r.days,r.hours.toFixed(2),r.days?(r.hours/r.days).toFixed(2):0,r.brk.toFixed(2),r.ot.toFixed(2),r.late]))))}
  draw()};
})();
