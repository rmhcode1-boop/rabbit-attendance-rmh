/* Pages: Tasks, Leaves, Chat, Holidays */
(function(){
const {I,esc,$,$$,pill,tone,avatar,person,empty,opts,empOpts,toast,modal,val}=U;
const P=PAGES;

/* ================= TASKS ================= */
const TK={view:'board',who:'',prio:'',q:'',mine:false};
const ST=['To Do','In Progress','Completed'];
function visibleTasks(){
  const m=D.me(),all=D.can('assignTasks');
  return D.db.tasks.filter(t=>(all||t.assignee===m.id||t.creator===m.id)&&(!TK.who||t.assignee===TK.who)&&(!TK.prio||t.priority===TK.prio)&&(!TK.mine||t.assignee===m.id)&&(!TK.q||t.title.toLowerCase().includes(TK.q.toLowerCase())))}
function logTask(t,text){t.history.push({t:new Date().toISOString(),text,by:D.me().id})}
function changeTask(t,patch,done){
  const m=D.me(),old=t.status;Object.assign(t,patch);
  if(patch.status&&patch.status!==old){
    if(t.status==='Completed')t.progress=100;
    if(t.status==='To Do'&&old==='Completed')t.progress=0;
    if(t.status==='In Progress'&&t.progress===0)t.progress=10;
    logTask(t,`Status changed: ${old} → ${t.status}`);
    const other=m.id===t.creator?t.assignee:t.creator;
    if(other!==m.id)D.notify('taskUpdates','task','Task updated',`${m.name} moved "${t.title}" to ${t.status}.`,other)}
  D.save();if(done)done()}
const dueTxt=t=>{const T=D.todayStr();if(t.status==='Completed')return `<span class="muted sm">Done</span>`;return t.due<T?`<span class="pill bad nodot">Overdue ${D.fmtDate(t.due,{day:'2-digit',month:'short'})}</span>`:t.due===T?'<span class="pill warn nodot">Due today</span>':`<span class="sm muted">Due ${D.fmtDate(t.due,{day:'2-digit',month:'short'})}</span>`};
P.tasks=function(root){
  const m=D.me(),all=D.can('assignTasks');
  function draw(){
    const list=visibleTasks();
    const card=t=>`<div class="tcard" draggable="true" data-id="${t.id}"><div class="row between"><span class="prio ${t.priority.toLowerCase()}">${t.priority}</span>${dueTxt(t)}</div><b>${esc(t.title)}</b><div><div class="row between xs muted" style="margin-bottom:5px"><span>Progress</span><span>${t.progress}%</span></div><div class="bar ${t.progress===100?'ok':''}"><i style="width:${t.progress}%"></i></div></div><div class="row between">${person(D.emp(t.assignee),'')}<span class="xs muted">${D.fmtDate(t.created,{day:'2-digit',month:'short'})}</span></div></div>`;
    let body;
    if(!list.length)body=`<div class="card">${empty('No tasks match your filters','tasks')}</div>`;
    else if(TK.view==='board')body=`<div class="board">${ST.map(s=>{const c=list.filter(t=>t.status===s);return `<div class="col" data-col="${s}"><div class="col-h"><span>${s}</span><span class="pill nodot">${c.length}</span></div>${c.map(card).join('')||'<div class="empty sm">Drop tasks here</div>'}</div>`}).join('')}</div>`;
    else body=`<div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Task</th><th>Assignee</th><th>Priority</th><th>Due</th><th>Progress</th><th>Status</th></tr></thead><tbody>${list.sort((a,b)=>a.due.localeCompare(b.due)).map(t=>`<tr data-id="${t.id}" style="cursor:pointer"><td class="first" data-label="Task"><b>${esc(t.title)}</b></td><td data-label="Assignee">${person(D.emp(t.assignee),'')}</td><td data-label="Priority"><span class="prio ${t.priority.toLowerCase()}">${t.priority}</span></td><td data-label="Due">${dueTxt(t)}</td><td data-label="Progress" style="min-width:120px"><div class="bar"><i style="width:${t.progress}%"></i></div></td><td data-label="Status">${tone(t.status==='Completed'?'ok':t.status==='In Progress'?'info':'',t.status)}</td></tr>`).join('')}</tbody></table></div></div>`;
    const all_=D.db.tasks.filter(t=>all||t.assignee===m.id||t.creator===m.id);
    root.innerHTML=head('Tasks',`${all_.filter(t=>t.status!=='Completed').length} open · ${all_.filter(t=>t.status==='Completed').length} completed`,`<div class="tabs"><button data-v="board" class="${TK.view==='board'?'on':''}">Board</button><button data-v="list" class="${TK.view==='list'?'on':''}">List</button></div><button class="btn primary" id="new">${I('plus')} New task</button>`)+
    `<div class="filters"><div class="field"><label>Search</label><input class="inp" id="q" value="${esc(TK.q)}" placeholder="Search tasks…"></div>${all?`<div class="field"><label>Assignee</label><select class="sel" id="who">${empOpts(TK.who,'Everyone')}</select></div>`:''}<div class="field"><label>Priority</label><select class="sel" id="prio">${opts(['High','Medium','Low'],TK.prio,'All priorities')}</select></div>${all?`<button class="chip ${TK.mine?'on':''}" id="mine" style="height:42px">Assigned to me</button>`:''}</div>${body}`;
    bind()}
  function bind(){
    $$('[data-v]',root).forEach(b=>b.onclick=()=>{TK.view=b.dataset.v;draw()});
    const q=$('#q');q.oninput=()=>{TK.q=q.value;const p=q.selectionStart;draw();const n=$('#q');n.focus();n.setSelectionRange(p,p)};
    const w=$('#who');if(w)w.onchange=()=>{TK.who=w.value;draw()};
    $('#prio').onchange=e=>{TK.prio=e.target.value;draw()};
    const mi=$('#mine');if(mi)mi.onclick=()=>{TK.mine=!TK.mine;draw()};
    $('#new').onclick=()=>taskForm(null,draw);
    $$('[data-id]',root).forEach(c=>c.addEventListener('click',()=>taskDetail(c.dataset.id,draw)));
    // drag & drop
    $$('.tcard',root).forEach(c=>{c.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',c.dataset.id);c.classList.add('dragging')});c.addEventListener('dragend',()=>c.classList.remove('dragging'))});
    $$('.col',root).forEach(col=>{col.addEventListener('dragover',e=>{e.preventDefault();col.classList.add('over')});col.addEventListener('dragleave',()=>col.classList.remove('over'));
      col.addEventListener('drop',e=>{e.preventDefault();col.classList.remove('over');const t=D.db.tasks.find(x=>x.id===e.dataTransfer.getData('text/plain'));if(!t||t.status===col.dataset.col)return;
        if(!(D.can('assignTasks')||t.assignee===m.id)){toast('Only the assignee or a manager can move this task',true);return}
        changeTask(t,{status:col.dataset.col},draw);toast('Moved to '+col.dataset.col)})});
  }
  draw();
  const o=Q().get('open');if(o&&D.db.tasks.find(t=>t.id===o)){history.replaceState(null,'','#/tasks');taskDetail(o,draw)}
};
function taskForm(t,done){
  const m=D.me(),all=D.can('assignTasks');
  modal({title:t?'Edit task':'Create task',body:`<div class="form-grid"><div class="field full"><label>Title</label><input class="inp" name="title" value="${esc(t&&t.title||'')}" placeholder="What needs to be done?"></div><div class="field full"><label>Description</label><textarea class="txt" name="desc">${esc(t&&t.desc||'')}</textarea></div>
  <div class="field"><label>Assign to</label><select class="sel" name="as" ${all?'':'disabled'}>${empOpts(t?t.assignee:m.id)}</select></div><div class="field"><label>Priority</label><select class="sel" name="prio">${opts(['High','Medium','Low'],t?t.priority:'Medium')}</select></div>
  <div class="field"><label>Due date</label><input class="inp" type="date" name="due" value="${t?t.due:D.addDays(D.todayStr(),3)}"></div><div class="field"><label>Status</label><select class="sel" name="st">${opts(ST,t?t.status:'To Do')}</select></div></div>`,
  actions:[{text:'Cancel'},{text:t?'Save changes':'Create task',cls:'primary',fn:ov=>{
    const title=val(ov,'title');if(!title){toast('Please enter a title',true);return false}
    const as=all?val(ov,'as'):m.id,d=val(ov,'due');if(!d){toast('Please choose a due date',true);return false}
    if(t){const ch=as!==t.assignee;Object.assign(t,{title,desc:val(ov,'desc'),assignee:as,priority:val(ov,'prio'),due:d});changeTask(t,{status:val(ov,'st')});logTask(t,'Task details edited'+(ch?' · reassigned to '+D.emp(as).name:''));
      if(ch&&as!==m.id)D.notify('taskAssignments','task','Task assigned',`${m.name} assigned you "${title}".`,as)}
    else{const nt={id:D.uid('t'),title,desc:val(ov,'desc'),assignee:as,creator:m.id,priority:val(ov,'prio'),due:d,status:val(ov,'st'),progress:val(ov,'st')==='Completed'?100:0,created:D.todayStr(),history:[{t:new Date().toISOString(),text:'Task created and assigned to '+D.emp(as).name,by:m.id}]};
      D.db.tasks.unshift(nt);if(as!==m.id)D.notify('taskAssignments','task','Task assigned',`${m.name} assigned you "${title}".`,as)}
    D.save();toast(t?'Task updated':'Task created');done()}}]})}
function taskDetail(id,done){
  const t=D.db.tasks.find(x=>x.id===id);if(!t)return;const m=D.me();
  const canEdit=D.can('assignTasks')||t.creator===m.id,canMove=canEdit||t.assignee===m.id;
  modal({wide:true,title:t.title,body:`<div class="row wrap" style="margin-bottom:14px"><span class="prio ${t.priority.toLowerCase()}">${t.priority} priority</span>${dueTxt(t)}${tone(t.status==='Completed'?'ok':t.status==='In Progress'?'info':'',t.status)}</div>
  <p class="ink2" style="margin-bottom:16px">${esc(t.desc||'No description provided.')}</p>
  <div class="grid g2" style="margin-bottom:18px"><div><div class="xs muted" style="margin-bottom:6px">Assigned to</div>${person(D.emp(t.assignee))}</div><div><div class="xs muted" style="margin-bottom:6px">Created by</div>${person(D.emp(t.creator),D.fmtDate(t.created))}</div></div>
  <div class="form-grid" style="margin-bottom:18px"><div class="field"><label>Status</label><select class="sel" name="st" ${canMove?'':'disabled'}>${opts(ST,t.status)}</select></div><div class="field"><label>Progress: <span id="pv">${t.progress}</span>%</label><input type="range" name="pr" min="0" max="100" step="5" value="${t.progress}" ${canMove?'':'disabled'}></div><div class="field full"><label>Add an update note</label><input class="inp" name="note" placeholder="Share progress or blockers…" ${canMove?'':'disabled'}></div></div>
  <h3 style="margin-bottom:10px">Task history</h3><div class="hist">${t.history.slice().reverse().map(h=>`<div><b>${esc(h.text)}</b><div class="xs muted">${esc(D.emp(h.by).name)} · ${D.ago(h.t)}</div></div>`).join('')}</div>`,
  mount:ov=>{const r=$('[name=pr]',ov);r.oninput=()=>$('#pv',ov).textContent=r.value},
  actions:[...(canEdit?[{text:I('trash')+' Delete',cls:'danger',fn:()=>{U.confirmBox('Delete task','Delete "'+t.title+'" permanently?','Delete',()=>{D.db.tasks=D.db.tasks.filter(x=>x!==t);D.save();toast('Task deleted');done()},true);return true}},{text:I('edit')+' Edit',fn:()=>{setTimeout(()=>taskForm(t,done),0)}}]:[]),{text:'Close'},...(canMove?[{text:'Save update',cls:'primary',fn:ov=>{
    const st=val(ov,'st'),pr=+val(ov,'pr'),note=val(ov,'note');let ch=false;
    if(pr!==t.progress){logTask(t,`Progress updated: ${t.progress}% → ${pr}%`);t.progress=pr;ch=true;if(pr===100&&st!=='Completed')ov.querySelector('[name=st]').value='Completed'}
    const ns=pr===100?'Completed':(pr>0&&st==='To Do'?'In Progress':st);
    if(note){logTask(t,'Note: '+note);ch=true}
    if(ns!==t.status){changeTask(t,{status:ns});ch=true}
    if(pr===100)t.progress=100;
    D.save();if(ch)toast('Task updated');done()}}]:[])]})}

/* ================= LEAVES (Employee → Manager → Admin) ================= */
const LV={tab:null,filter:''};
const dRange=l=>D.fmtDate(l.from,{day:'2-digit',month:'short'})+(l.to!==l.from?' – '+D.fmtDate(l.to,{day:'2-digit',month:'short'}):'');
const lvId=l=>'LV-'+String(l.id).slice(-6).toUpperCase();
/* optimistic local update; the server's response replaces it with the authoritative record */
function optimistic(l,act,note){
  const m=D.me(),T=D.todayStr();
  if(act==='cancel'){l.status='Cancelled';l.adminStatus='—'}
  else if(act==='manager-approve'){l.status='Pending Admin Approval';l.managerStatus='Approved';l.adminStatus='Pending';l.managerActionDate=T}
  else if(act==='manager-reject'){l.status='Rejected';l.managerStatus='Rejected';l.rejectionReason=note;l.rejectedBy=m.name;l.managerActionDate=T}
  else if(act==='admin-approve'){l.status='Approved';l.adminStatus='Approved';l.adminActionDate=T;l.finalDate=T}
  else if(act==='admin-reject'){l.status='Rejected';l.adminStatus='Rejected';l.rejectionReason=note;l.rejectedBy=m.name;l.adminActionDate=T}
  l.action=act;l.note=note||'';D.save()}
function canAct(l){const m=D.me();
  if(m.role==='Manager')return l.status==='Pending Manager Approval'&&l.managerId===m.id&&l.emp!==m.id?'manager':null;
  if(m.role==='Admin')return D.isPending(l)&&l.emp!==m.id?'admin':null;
  return null}
function leaveView(l,after){
  const e=D.emp(l.emp),mg=l.managerId?D.emp(l.managerId):null,act=canAct(l),m=D.me();
  const row=(k,v)=>'<div class="set-row" style="padding:9px 0"><b style="font-weight:600;color:var(--ink2)">'+k+'</b><span style="text-align:right">'+v+'</span></div>';
  const steps=[
    ['Applied',D.fmtDate(l.applied),'ok'],
    ['Manager review',l.managerStatus==='—'?'Not required':l.managerStatus+(l.managerActionDate?' · '+D.fmtDate(l.managerActionDate):''),l.managerStatus==='Approved'?'ok':l.managerStatus==='Rejected'?'bad':'warn'],
    ['Admin review',l.adminStatus==='—'?(l.status==='Rejected'||l.status==='Cancelled'?'—':'Waiting'):l.adminStatus+(l.adminActionDate?' · '+D.fmtDate(l.adminActionDate):''),l.adminStatus==='Approved'?'ok':l.adminStatus==='Rejected'?'bad':'warn']];
  modal({title:'Leave request '+lvId(l),wide:true,body:
    '<div class="row wrap" style="margin-bottom:10px">'+leavePill(l)+'</div>'+
    row('Employee',esc(e.name)+' <span class="muted">('+esc(e.code||e.id)+')</span>')+row('Manager',mg?esc(mg.name):'<span class="muted">Not assigned</span>')+
    row('Leave type',esc(l.type))+row('From',D.fmtDate(l.from))+row('To',D.fmtDate(l.to))+row('Number of days',D.leaveDays(l))+row('Reason',esc(l.reason))+row('Applied on',D.fmtDate(l.applied))+
    row('Manager status',esc(l.managerStatus||'—')+(l.managerActionDate?' · '+D.fmtDate(l.managerActionDate):''))+row('Admin status',esc(l.adminStatus||'—')+(l.adminActionDate?' · '+D.fmtDate(l.adminActionDate):''))+
    (l.rejectionReason?row('Rejection reason','<span style="color:var(--bad)">'+esc(l.rejectionReason)+'</span>'+(l.rejectedBy?' <span class="muted">— '+esc(l.rejectedBy)+'</span>':'')):'')+
    (l.finalDate?row('Final approval date',D.fmtDate(l.finalDate)):'')+
    '<h3 style="margin:16px 0 10px">Progress</h3><div class="hist">'+steps.map(x=>'<div><b>'+x[0]+'</b><div class="xs muted">'+esc(x[1])+'</div></div>').join('')+'</div>',
    actions:[{text:'Close'},...(act?[{text:'Reject',cls:'danger',fn:()=>{setTimeout(()=>rejectModal(l,act,after),0)}},{text:'Approve',cls:'ok',fn:()=>{approve(l,act,after)}}]:[])]})}
function approve(l,act,after){
  optimistic(l,act+'-approve');
  U.toast(act==='manager'?'Approved — forwarded to Admin for final approval':'Leave approved');after()}
function rejectModal(l,act,after){
  modal({title:'Reject leave request',body:'<p class="ink2" style="margin-bottom:12px">'+esc(D.emp(l.emp).name)+' · '+esc(l.type)+' · '+dRange(l)+'</p><div class="field"><label>Reason for rejection (required)</label><textarea class="txt" name="note" placeholder="The employee will see this"></textarea></div>',
    actions:[{text:'Cancel'},{text:'Reject request',cls:'danger',fn:ov=>{const n=val(ov,'note');if(!n){toast('Please give a reason for rejection',true);return false}optimistic(l,act+'-reject',n);toast('Leave rejected');after()}}]})}
P.leaves=function(root){
  const m=D.me(),role=m.role;
  const tabs=role==='Employee'?[['mine','My leave history']]:role==='Manager'?[['pending','Pending requests'],['team','Team history'],['mine','My leaves']]:[['all','All requests'],['mine','My leaves']];
  if(!LV.tab||!tabs.find(t=>t[0]===LV.tab))LV.tab=tabs[0][0];
  function draw(){
    const bal=D.leaveBalance(m.id);
    const mine=D.db.leaves.filter(l=>l.emp===m.id).sort((x,y)=>y.applied.localeCompare(x.applied));
    const others=D.db.leaves.filter(l=>l.emp!==m.id).sort((x,y)=>y.applied.localeCompare(x.applied));
    const pendingMine=role==='Manager'?others.filter(l=>l.status==='Pending Manager Approval'&&l.managerId===m.id):[];
    let list=LV.tab==='mine'?mine:LV.tab==='pending'?pendingMine:LV.tab==='team'?others.filter(l=>l.managerId===m.id||D.emp(l.emp).manager===m.id):others.concat([]);
    if(LV.tab==='all')list=D.db.leaves.slice().sort((x,y)=>y.applied.localeCompare(x.applied));
    const showFilter=LV.tab==='all'||LV.tab==='team';
    const FL=['All','Pending Manager Approval','Pending Admin Approval','Approved','Rejected'];
    const cnt=f=>f==='All'?list.length:list.filter(l=>l.status===f).length;
    if(showFilter&&LV.filter)list=list.filter(l=>l.status===LV.filter);
    const approvalsView=LV.tab!=='mine';
    const mineRow=l=>'<tr><td class="first" data-label="Leave type"><b>'+esc(l.type)+' Leave</b></td><td data-label="From">'+D.fmtDate(l.from,{day:'2-digit',month:'short'})+'</td><td data-label="To">'+D.fmtDate(l.to,{day:'2-digit',month:'short'})+'</td><td data-label="Days">'+D.leaveDays(l)+'</td><td data-label="Status">'+leavePill(l)+(l.status==='Rejected'&&l.rejectionReason?'<div class="xs" style="color:var(--bad);margin-top:4px;max-width:260px">Reason: '+esc(l.rejectionReason)+'</div>':'')+'</td><td data-label="Applied on" class="nowrap">'+D.fmtDate(l.applied,{day:'2-digit',month:'short'})+'</td><td data-label=""><div class="row" style="justify-content:flex-end"><button class="btn sm" data-v="'+l.id+'">View</button>'+(D.isPending(l)?'<button class="btn sm danger" data-cn="'+l.id+'">Cancel</button>':'')+'</div></td></tr>';
    const apprRow=l=>{const e=D.emp(l.emp),act=canAct(l);return '<tr><td class="first" data-label="Employee">'+person(e,D.dept(e.dept))+'</td><td data-label="Leave type"><b>'+esc(l.type)+'</b></td><td data-label="Dates" class="nowrap">'+dRange(l)+'</td><td data-label="Days">'+D.leaveDays(l)+'</td><td data-label="Reason" style="max-width:240px">'+esc(l.reason)+(l.status==='Rejected'&&l.rejectionReason?'<div class="xs" style="color:var(--bad)">Rejected: '+esc(l.rejectionReason)+'</div>':'')+'</td><td data-label="Status">'+leavePill(l)+'</td><td data-label=""><div class="row" style="justify-content:flex-end"><button class="btn sm" data-v="'+l.id+'">View</button>'+(act?'<button class="btn sm ok" data-ap="'+l.id+'">Approve</button><button class="btn sm danger" data-rj="'+l.id+'">Reject</button>':'')+'</div></td></tr>'};
    const empty_=LV.tab==='pending'?'No requests waiting for your approval':LV.tab==='mine'?'You haven\'t applied for any leave yet':'No leave requests found';
    const title={mine:role==='Employee'?'My leave history':'My leaves',pending:'Pending requests',team:'Team leave history',all:'All leave requests'}[LV.tab];
    root.innerHTML=head('Leaves',role==='Employee'?'Apply for leave and track the approval status.':role==='Manager'?'Review your team\'s leave requests and manage your own.':'Final approval for leave requests and company-wide leave history.',
      '<button class="btn primary" id="apply">'+I('plus')+' Apply leave</button>')+
    '<div class="grid g4 keep2" style="margin-bottom:18px">'+Object.entries(bal).map(([k,b])=>'<div class="card kpi"><div class="top"><span>'+k+' leave</span><span class="ico '+(k==='Annual'?'brand':k==='Sick'?'bad':k==='Casual'?'info':'')+'">'+I('leave')+'</span></div><div class="val">'+(b.unlimited?'∞':b.left)+'<small> '+(b.unlimited?'':'/ '+b.total+' days')+'</small></div>'+(b.unlimited?'':'<div class="bar '+(k==='Annual'?'brand':'')+'"><i style="width:'+Math.min(100,b.used/Math.max(b.total,1)*100)+'%"></i></div>')+'<div class="foot">'+b.used+' used'+(b.pending?' · '+b.pending+' pending':'')+'</div></div>').join('')+'</div>'+
    '<div class="card"><div class="row between wrap" style="margin-bottom:14px"><div class="tabs">'+tabs.map(t=>'<button data-t="'+t[0]+'" class="'+(LV.tab===t[0]?'on':'')+'">'+t[1]+(t[0]==='pending'&&pendingMine.length?' ('+pendingMine.length+')':'')+'</button>').join('')+'</div></div>'+
    (showFilter?'<div class="chips" style="margin-bottom:14px">'+FL.map(f=>'<button class="chip '+((LV.filter||'All')===f?'on':'')+'" data-f="'+f+'">'+f+' ('+cnt(f)+')</button>').join('')+'</div>':'')+
    '<h2 style="margin-bottom:12px;font-size:15px">'+title+'</h2>'+
    (list.length?'<div class="tbl-wrap"><table class="tbl"><thead><tr>'+(approvalsView?'<th>Employee</th><th>Leave type</th><th>Dates</th><th>Days</th><th>Reason</th><th>Status</th><th></th>':'<th>Leave type</th><th>From</th><th>To</th><th>Days</th><th>Status</th><th>Applied on</th><th></th>')+'</tr></thead><tbody>'+list.map(approvalsView?apprRow:mineRow).join('')+'</tbody></table></div>':empty(empty_,'leave'))+'</div>';
    $$('[data-t]',root).forEach(b=>b.onclick=()=>{LV.tab=b.dataset.t;LV.filter='';draw()});
    $$('[data-f]',root).forEach(b=>b.onclick=()=>{LV.filter=b.dataset.f==='All'?'':b.dataset.f;draw()});
    $('#apply').onclick=()=>applyModal(draw);
    const find=id=>D.db.leaves.find(x=>x.id===id);
    $$('[data-v]',root).forEach(b=>b.onclick=()=>leaveView(find(b.dataset.v),draw));
    $$('[data-ap]',root).forEach(b=>b.onclick=()=>{const l=find(b.dataset.ap);approve(l,canAct(l),draw)});
    $$('[data-rj]',root).forEach(b=>b.onclick=()=>{const l=find(b.dataset.rj);rejectModal(l,canAct(l),draw)});
    $$('[data-cn]',root).forEach(b=>b.onclick=()=>U.confirmBox('Cancel request','Cancel this leave request?','Cancel request',()=>{optimistic(find(b.dataset.cn),'cancel');toast('Request cancelled');draw()},true))}
  draw()};
function applyModal(done){
  const m=D.me(),bal=D.leaveBalance(m.id),T=D.todayStr();
  const mg=m.manager?D.emp(m.manager):null;
  const route=m.role==='Admin'?'As an Admin, your own leave is approved automatically.':m.role==='Manager'?'Your request goes to the Admin for approval.':(mg&&mg.name&&mg.status==='Active'&&mg.role==='Manager')?'Your request goes to your manager ('+esc(mg.name)+'), then to the Admin for final approval.':'No manager is assigned to you, so your request goes straight to the Admin.';
  modal({title:'Apply for leave',body:'<div class="form-grid"><div class="field full"><label>Leave type</label><select class="sel" name="type">'+Object.keys(bal).map(k=>'<option value="'+k+'">'+k+' '+(bal[k].unlimited?'':'('+(bal[k].left-bal[k].pending)+' available)')+'</option>').join('')+'</select></div><div class="field"><label>From</label><input class="inp" type="date" name="from" value="'+T+'"></div><div class="field"><label>To</label><input class="inp" type="date" name="to" value="'+T+'"></div><div class="field full"><div class="pill info nodot" id="dcount" style="align-self:flex-start">1 working day</div></div><div class="field full"><label>Reason</label><textarea class="txt" name="reason" placeholder="Briefly explain the reason for leave"></textarea></div><p class="sm muted full" style="grid-column:1/-1">'+route+'</p></div>',
  mount:ov=>{const f=$('[name=from]',ov),t=$('[name=to]',ov),c=$('#dcount',ov);const up=()=>{if(t.value<f.value)t.value=f.value;c.textContent=D.countLeaveDays(f.value,t.value)+' working day(s) · weekends & holidays excluded'};f.onchange=t.onchange=up;up()},
  actions:[{text:'Cancel'},{text:'Submit request',cls:'primary',fn:ov=>{
    const type=val(ov,'type'),from=val(ov,'from'),to=val(ov,'to'),reason=val(ov,'reason');
    if(!from||!to||to<from){toast('Please select a valid date range',true);return false}
    if(!reason){toast('Please add a reason',true);return false}
    const days=D.countLeaveDays(from,to);if(!days){toast('Selected dates are all weekends/holidays',true);return false}
    if(!bal[type].unlimited&&days>bal[type].left-bal[type].pending){toast('Not enough '+type+' leave balance ('+(bal[type].left-bal[type].pending)+' available)',true);return false}
    if(D.db.leaves.some(l=>l.emp===m.id&&!['Rejected','Cancelled'].includes(l.status)&&l.from<=to&&from<=l.to)){toast('You already have a request overlapping these dates',true);return false}
    const hasMgr=m.role==='Employee'&&mg&&mg.status==='Active'&&mg.role==='Manager';
    const rec={id:D.uid('l'),emp:m.id,managerId:hasMgr?mg.id:null,type,from,to,days,reason,applied:T,status:'Pending Admin Approval',managerStatus:'—',adminStatus:'Pending',managerActionDate:null,adminActionDate:null,rejectionReason:'',rejectedBy:'',finalDate:null};
    if(m.role==='Admin')Object.assign(rec,{status:'Approved',adminStatus:'Approved',adminActionDate:T,finalDate:T});
    else if(hasMgr)Object.assign(rec,{status:'Pending Manager Approval',managerStatus:'Pending',adminStatus:'—'});
    D.db.leaves.push(rec);D.save();toast(m.role==='Admin'?'Leave recorded and approved':'Leave request submitted');done()}}]})}

/* ================= CHAT ================= */
const CH={conv:null,q:''};
const REPLIES=['Got it 👍','Sure, on it!','Thanks for the update.','Let me check and get back to you.','Sounds good!','Can we discuss this in a quick call?','Noted. I\'ll share it by EOD.','Perfect, thank you!'];
function convInfo(c,me){
  if(c.type==='group')return {name:c.name,online:c.members.filter(id=>D.emp(id).online).length,sub:c.members.length+' members',e:null};
  const o=D.emp(c.members.find(x=>x!==me)||c.members[0]);return {name:o.name,e:o,sub:o.online?'Online':'Offline',online:o.online}}
const lastMsg=id=>D.db.messages.filter(m=>m.conv===id).sort((a,b)=>a.ts.localeCompare(b.ts)).pop();
function unreadN(c,me){const seen=D.db.reads[me+'|'+c.id]||'';return D.db.messages.filter(m=>m.conv===c.id&&m.from!==me&&m.ts>seen).length}
function markSeen(c,me){const l=lastMsg(c.id);if(l){D.db.reads[me+'|'+c.id]=l.ts;D.save()}}
P.chat=function(root){
  const me=D.me().id;
  const mine=()=>D.db.conversations.filter(c=>c.members.includes(me));
  if(CH.conv&&!mine().find(c=>c.id===CH.conv))CH.conv=null;
  let mobileOpen=false;
  function draw(){
    const draft=($('#msg')||{}).value||'';
    const convs=mine().map(c=>({c,l:lastMsg(c.id),i:convInfo(c,me)})).filter(x=>!CH.q||x.i.name.toLowerCase().includes(CH.q.toLowerCase())).sort((a,b)=>((b.l&&b.l.ts)||'').localeCompare((a.l&&a.l.ts)||''));
    if(!CH.conv&&innerWidth>720&&convs.length)CH.conv=convs[0].c.id;
    const cur=CH.conv?D.db.conversations.find(c=>c.id===CH.conv):null;
    if(cur)markSeen(cur,me);
    let main;
    if(!cur)main=`<div class="chat-main"><div class="empty" style="margin:auto">${I('chat')}<div>Select a conversation to start chatting</div></div></div>`;
    else{const i=convInfo(cur,me),msgs=D.db.messages.filter(m=>m.conv===cur.id).sort((a,b)=>a.ts.localeCompare(b.ts));let lastDay='';
      main=`<div class="chat-main"><div class="chat-top"><button class="iconbtn back-btn" id="back" style="box-shadow:none;background:var(--soft)" aria-label="Back">${I('chevL')}</button>${i.e?avatar(i.e,'',true):`<div class="avatar" style="background:var(--dark)">${I('users')}</div>`}<div class="grow" style="flex:1;min-width:0"><b style="display:block">${esc(i.name)}</b><span class="sm muted">${cur.type==='group'?i.online+' online · '+i.sub:(i.online?'<span style="color:var(--ok)">● Online</span>':'Offline')}</span></div>${cur.type==='group'?`<button class="btn sm" id="members">${I('users')} <span class="hide-m">Members</span></button>`:''}</div>
      <div class="msgs" id="msgs">${msgs.map(m=>{const d=m.ts.slice(0,10),sep=d!==lastDay?`<div class="day-sep">${d===D.todayStr()?'Today':D.fmtDate(d,{day:'2-digit',month:'short'})}</div>`:'';lastDay=d;const mine_=m.from===me,t=new Date(m.ts).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
        return sep+`<div class="msg ${mine_?'me':''}">${cur.type==='group'&&!mine_?`<span class="who">${esc(D.emp(m.from).name)}</span>`:''}<div class="bubble">${esc(m.text)}</div><time>${t}</time></div>`}).join('')||'<div class="empty">No messages yet — say hello 👋</div>'}</div>
      <form class="composer" id="cf"><input class="inp" id="msg" placeholder="Type a message…" autocomplete="off"><button class="btn primary" aria-label="Send">${I('send')}<span class="hide-m">Send</span></button></form></div>`}
    root.innerHTML=head('Chat','Message colleagues and teams.',`<button class="btn primary" id="newc">${I('plus')} New chat</button>`)+
    `<div class="chat ${cur?'open':''}"><div class="chat-side"><div class="hd"><div class="search" style="max-width:none"><span>${I('search')}</span><input id="cq" value="${esc(CH.q)}" placeholder="Search conversations"></div></div><div class="convs">${convs.map(x=>{const n=unreadN(x.c,me);return `<div class="conv ${CH.conv===x.c.id?'on':''}" data-c="${x.c.id}">${x.i.e?avatar(x.i.e,'',true):`<div class="avatar" style="background:${['#2b2b30','#ff6a2b','#2f6fed','#1f9d55'][x.c.id.length%4]}">${I('users')}</div>`}<div class="grow"><b><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(x.i.name)}</span><span class="xs muted nowrap" style="font-weight:500">${x.l?D.ago(x.l.ts):''}</span></b><p>${x.l?(x.l.from===me?'You: ':x.c.type==='group'?esc(D.emp(x.l.from).name.split(' ')[0])+': ':'')+esc(x.l.text):'No messages'}</p></div>${n?`<span class="unread">${n}</span>`:''}</div>`}).join('')||U.empty('No conversations','chat')}</div></div>${main}</div>`;
    bind(draft)}
  function bind(draft){
    const cq=$('#cq');cq.oninput=()=>{CH.q=cq.value;const p=cq.selectionStart;draw();const n=$('#cq');n.focus();n.setSelectionRange(p,p)};
    $$('[data-c]',root).forEach(c=>c.onclick=()=>{CH.conv=c.dataset.c;draw();const m=$('#msgs');if(m)m.scrollTop=m.scrollHeight});
    const m=$('#msgs');if(m)m.scrollTop=m.scrollHeight;
    const b=$('#back');if(b)b.onclick=()=>{CH.conv=null;draw()};
    const mb=$('#members');if(mb)mb.onclick=()=>{const c=D.db.conversations.find(x=>x.id===CH.conv);modal({title:c.name+' · members',body:`<div class="list">${c.members.map(id=>`<div class="li">${person(D.emp(id),D.emp(id).title)}<div class="grow"></div>${D.emp(id).online?tone('ok','Online'):tone('','Offline')}</div>`).join('')}</div>`,actions:[{text:'Close'}]})};
    $('#newc').onclick=newChat;
    const f=$('#cf');if(f){const inp=$('#msg');inp.value=draft;if(innerWidth>720)inp.focus();
      f.onsubmit=e=>{e.preventDefault();const text=inp.value.trim();if(!text)return;
        D.db.messages.push({id:D.uid('m'),conv:CH.conv,from:me,text,ts:new Date().toISOString()});D.save();inp.value='';draw();
        const c=D.db.conversations.find(x=>x.id===CH.conv);
        if(c.type==='dm'){const o=D.emp(c.members.find(x=>x!==me));if(o.online){const cid=c.id;setTimeout(()=>{D.db.messages.push({id:D.uid('m'),conv:cid,from:o.id,text:REPLIES[Math.floor(Math.random()*REPLIES.length)],ts:new Date().toISOString()});D.save();if(location.hash.startsWith('#/chat')&&CH.conv===cid)draw();else rerender()},1800+Math.random()*1500)}}}}}
  function newChat(){
    modal({title:'New conversation',body:`<div class="tabs" style="margin-bottom:14px"><button class="on" data-k="dm">Direct message</button><button data-k="group">Group</button></div><div id="nc-dm" class="field"><label>Employee</label><select class="sel" name="emp">${empOpts('',null,D.db.employees.filter(e=>e.id!==me&&e.status==='Active'))}</select></div><div id="nc-g" style="display:none"><div class="field" style="margin-bottom:12px"><label>Group name</label><input class="inp" name="gname" placeholder="e.g. Diwali Campaign Team"></div><div class="field"><label>Members</label><div style="max-height:200px;overflow:auto;border:1px solid var(--line);border-radius:12px;padding:6px">${D.db.employees.filter(e=>e.id!==me&&e.status==='Active').map(e=>`<label class="row" style="padding:7px 8px;cursor:pointer"><input type="checkbox" value="${e.id}" name="gm"> ${esc(e.name)} <span class="muted xs">${esc(e.title)}</span></label>`).join('')}</div></div></div>`,
    mount:ov=>{let k='dm';$$('[data-k]',ov).forEach(b=>b.onclick=()=>{k=b.dataset.k;$$('[data-k]',ov).forEach(x=>x.classList.toggle('on',x===b));$('#nc-dm',ov).style.display=k==='dm'?'':'none';$('#nc-g',ov).style.display=k==='group'?'':'none';ov.dataset.k=k})},
    actions:[{text:'Cancel'},{text:'Start chat',cls:'primary',fn:ov=>{
      if(ov.dataset.k==='group'){const name=val(ov,'gname'),ms=$$('[name=gm]:checked',ov).map(x=>x.value);if(!name||!ms.length){toast('Enter a group name and pick members',true);return false}
        const c={id:D.uid('c'),type:'group',name,members:[me,...ms]};D.db.conversations.push(c);D.db.messages.push({id:D.uid('m'),conv:c.id,from:me,text:'Created the group "'+name+'"',ts:new Date().toISOString()});CH.conv=c.id}
      else{const o=val(ov,'emp');if(!o)return false;let c=D.db.conversations.find(x=>x.type==='dm'&&x.members.includes(me)&&x.members.includes(o));if(!c){c={id:D.uid('c'),type:'dm',members:[me,o]};D.db.conversations.push(c)}CH.conv=c.id}
      D.save();draw()}}]})}
  draw()};

/* ================= HOLIDAYS ================= */
const HL={tab:'list',year:new Date().getFullYear()};
P.holidays=function(root){
  const admin=D.can('manageHolidays'),T=D.todayStr();
  function draw(){
    const list=D.db.holidays.filter(h=>h.date.startsWith(HL.year)).sort((a,b)=>a.date.localeCompare(b.date));
    const next=D.db.holidays.filter(h=>h.date>=T).sort((a,b)=>a.date.localeCompare(b.date))[0];
    let body;
    if(HL.tab==='list')body=list.length?`<div class="grid g2">${list.map(h=>{const past=h.date<T,dn=Math.round((D.parse(h.date)-D.parse(T))/864e5);return `<div class="card" style="display:flex;gap:16px;align-items:flex-start;${past?'opacity:.62':''}"><div class="avatar" style="width:58px;height:62px;border-radius:16px;background:${past?'var(--soft2)':'var(--dark)'};color:${past?'var(--ink2)':'#fff'};flex-direction:column;line-height:1.1"><span style="font-size:20px;font-weight:700">${h.date.slice(8)}</span><span style="font-size:10px;text-transform:uppercase;letter-spacing:.06em">${D.MONTHS[+h.date.slice(5,7)-1].slice(0,3)}</span></div><div class="grow" style="flex:1;min-width:0"><div class="row between"><b style="font-size:15px">${esc(h.name)}</b>${past?'':tone(dn===0?'warn':'info',dn===0?'Today':'in '+dn+' days')}</div><div class="sm muted" style="margin:2px 0 6px">${D.fmtDate(h.date,{weekday:'long'})}</div><div class="sm ink2">${esc(h.desc||'—')}</div>${admin?`<div class="row" style="margin-top:12px"><button class="btn sm" data-e="${h.id}">${I('edit')} Edit</button><button class="btn sm danger" data-d="${h.id}">${I('trash')} Delete</button></div>`:''}</div></div>`}).join('')}</div>`:`<div class="card">${empty('No holidays added for '+HL.year,'sun')}</div>`;
    else body=`<div class="grid g4">${D.MONTHS.map((mn,mi)=>{const first=new Date(HL.year,mi,1,12),n=new Date(HL.year,mi+1,0).getDate();let cells=D.DOW.map(x=>`<span class="xs muted b">${x[0]}</span>`).join('')+'<span></span>'.repeat(first.getDay());
      for(let d=1;d<=n;d++){const ds=HL.year+'-'+D.pad(mi+1)+'-'+D.pad(d),h=D.isHoliday(ds),wk=D.isWeekend(ds);cells+=`<span ${h?`data-h="${h.id}" title="${esc(h.name)}"`:''} style="display:grid;place-items:center;height:30px;border-radius:9px;font-size:12px;${h?'background:#6b4bd6;color:#fff;font-weight:700;cursor:pointer':wk?'color:var(--muted)':''}${ds===T?';outline:2px solid var(--ink)':''}">${d}</span>`}
      return `<div class="card" style="padding:16px"><b style="display:block;margin-bottom:10px">${mn}</b><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center">${cells}</div></div>`}).join('')}</div><div class="legend" style="margin-top:14px"><span><i style="background:#6b4bd6"></i>Company holiday</span><span><i style="background:var(--soft2)"></i>Weekend</span></div>`;
    root.innerHTML=head('Holidays','Company holidays and festival breaks for '+HL.year+'.',`<div class="tabs"><button data-t="list" class="${HL.tab==='list'?'on':''}">List</button><button data-t="cal" class="${HL.tab==='cal'?'on':''}">Calendar</button></div>${admin?`<button class="btn primary" id="add">${I('plus')} Add holiday</button>`:''}`)+
    `<div class="grid g3 keep2" style="margin-bottom:18px"><div class="card kpi"><div class="top"><span>Total holidays</span><span class="ico brand">${I('sun')}</span></div><div class="val">${list.length}</div><div class="foot">in ${HL.year}</div></div><div class="card kpi"><div class="top"><span>Next holiday</span><span class="ico info">${I('calendar')}</span></div><div class="val" style="font-size:20px">${next?esc(next.name):'—'}</div><div class="foot">${next?D.fmtDate(next.date,{weekday:'long',day:'numeric',month:'long'}):'None scheduled'}</div></div><div class="card kpi"><div class="top"><span>Year</span><span class="ico">${I('clock')}</span></div><div class="row" style="margin-top:2px"><button class="btn sm icon" id="py" aria-label="Previous year">${I('chevL')}</button><div class="val" style="font-size:22px">${HL.year}</div><button class="btn sm icon" id="ny" aria-label="Next year">${I('chevR')}</button></div></div></div>${body}`;
    $$('[data-t]',root).forEach(b=>b.onclick=()=>{HL.tab=b.dataset.t;draw()});
    $('#py').onclick=()=>{HL.year--;draw()};$('#ny').onclick=()=>{HL.year++;draw()};
    const a=$('#add');if(a)a.onclick=()=>hForm(null,draw);
    $$('[data-e]',root).forEach(b=>b.onclick=()=>hForm(D.db.holidays.find(h=>h.id===b.dataset.e),draw));
    $$('[data-d]',root).forEach(b=>b.onclick=()=>{const h=D.db.holidays.find(x=>x.id===b.dataset.d);U.confirmBox('Delete holiday','Remove "'+h.name+'" from the holiday list?','Delete',()=>{D.db.holidays=D.db.holidays.filter(x=>x!==h);D.save();toast('Holiday deleted');draw()},true)});
    $$('[data-h]',root).forEach(c=>c.onclick=()=>{const h=D.db.holidays.find(x=>x.id===c.dataset.h);if(admin)hForm(h,draw);else modal({title:h.name,body:`<p class="muted" style="margin-bottom:6px">${D.fmtDate(h.date,{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p><p>${esc(h.desc)}</p>`,actions:[{text:'Close'}]})})}
  draw()};
function hForm(h,done){
  modal({title:h?'Edit holiday':'Add holiday',body:`<div class="form-grid"><div class="field full"><label>Holiday name</label><input class="inp" name="name" value="${esc(h&&h.name||'')}"></div><div class="field full"><label>Date</label><input class="inp" type="date" name="date" value="${h?h.date:D.todayStr()}"></div><div class="field full"><label>Description</label><textarea class="txt" name="desc">${esc(h&&h.desc||'')}</textarea></div></div>`,
  actions:[{text:'Cancel'},{text:h?'Save':'Add holiday',cls:'primary',fn:ov=>{const name=val(ov,'name'),date=val(ov,'date');if(!name||!date){toast('Name and date are required',true);return false}
    if(D.db.holidays.some(x=>x.date===date&&x!==h)){toast('A holiday already exists on this date',true);return false}
    if(h)Object.assign(h,{name,date,desc:val(ov,'desc')});else{D.db.holidays.push({id:D.uid('h'),name,date,desc:val(ov,'desc')});D.notify('holidays','holiday','Holiday announced',`${name} on ${D.fmtDate(date,{day:'2-digit',month:'short'})} — ${val(ov,'desc')||'office closed'}.`,'all')}
    D.save();toast(h?'Holiday updated':'Holiday added');done()}}]})}
})();
