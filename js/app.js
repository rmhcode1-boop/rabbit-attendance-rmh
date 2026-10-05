/* App shell: routing, sidebar, topbar, global actions (check-in/out) */
(function(){
const {I,esc,$,$$}=U;
const PAGES={};
const ROLE_LABEL={Admin:'Administrator',Manager:'Manager',Employee:'Employee'};
window.PAGES=PAGES;
const NAV=[
 ['dashboard','Dashboard','dash'],['calendar','Calendar','calendar'],['attendance','Attendance','clock'],['timesheet','Timesheet','timer'],
 ['tasks','Tasks','tasks'],['leaves','Leaves','leave'],['chat','Chat','chat'],['holidays','Holidays','sun'],
 ['reports','Reports','reports'],['notifications','Notifications','bell']];
const MORE=[['settings','Settings','settings']];
let cur='dashboard',ctx={},resizeCat=null;

function applyTheme(){document.documentElement.dataset.theme=D.sess.theme==='dark'?'dark':'light'}
window.applyTheme=applyTheme;
function route(){
  if(!D.db)return;
  const raw=(location.hash||'#/dashboard').replace(/^#\/?/,'').split('?')[0];
  const r=Routes.resolve(raw,D.me().role);
  if(!r.allowed)cur='unauthorized';
  else{
    if(r.target.includes('?')){history.replaceState(null,'','#/'+r.target)}
    cur=PAGES[r.page]?r.page:'dashboard';
  }
  closeDrawer();render();const pg=$('#page');if(pg)pg.classList.add('enter');window.scrollTo(0,0)}
function render(keepScroll){
  const y=scrollY;
  const unread=D.myNotifs().filter(n=>!n.read).length;
  const m=D.me();
  document.body.classList.toggle('collapsed',!!D.sess.collapsed);
  const link=n=>{if(!Routes.canOpen(n[0],m.role))return '';return `<a href="#/${n[0]}" class="${cur===n[0]?'active':''}">${I(n[2])}<span>${n[1]}</span>${n[0]==='notifications'&&unread?`<em class="badge-n">${unread}</em>`:''}</a>`};
  $('#app').innerHTML=`
  <aside class="sidebar" aria-label="Main navigation">
    <div class="brand"><div class="logo">${U.LOGO}</div><div><b>Rabbit Marketing<br>House</b><small>Attendance & HR</small></div></div>
    <nav class="nav"><div class="nav-label">Workspace</div>${NAV.slice(0,4).map(link).join('')}<div class="nav-label">Collaboration</div>${NAV.slice(4,8).map(link).join('')}<div class="nav-label">Insights</div>${NAV.slice(8).map(link).join('')}</nav>
    <div class="side-foot">${MORE.map(link).join('')}<button id="btn-logout">${I('logout')}<span>Log Out</span></button><button id="btn-collapse" class="hide-m">${I('chevL')}<span>Collapse</span></button></div>
  </aside>
  <div class="scrim" id="scrim"></div>
  <div class="main">
    <header class="topbar">
      <button class="iconbtn" id="btn-drawer" aria-label="Menu" style="display:none">${I('menu')}</button>
      <div class="search"><span>${I('search')}</span><input id="gsearch" placeholder="Search employees, tasks, pages…" autocomplete="off"><div class="search-res" id="sres"></div></div>
      <div class="spacer"></div>
      <button class="iconbtn" id="btn-theme" aria-label="Toggle dark mode" title="Toggle dark mode">${I(D.sess.theme==='dark'?'sun':'moon')}</button>
      <div class="pop"><button class="iconbtn" id="btn-bell" aria-label="Notifications">${I('bell')}${unread?'<i class="dot"></i>':''}</button><div class="menu notif-menu" id="notif-menu"></div></div>
      <div class="pop"><div class="userchip" id="btn-user" tabindex="0">${U.avatar(m,'',true)}<div class="nm"><b>${esc(m.name)}</b><span>${ROLE_LABEL[m.role]||m.role}</span></div><span class="hide-m">${I('chevD')}</span></div><div class="menu" id="user-menu"></div></div>
    </header>
    <main class="page" id="page"></main>
  </div>
  <nav class="bottomnav" aria-label="Quick navigation">
    ${[['dashboard','Home','dash'],['attendance','Attendance','clock'],['tasks','Tasks','tasks'],['chat','Chat','chat']].map(n=>`<a href="#/${n[0]}" class="${cur===n[0]?'active':''}" aria-label="${n[1]}" title="${n[1]}"${cur===n[0]?' aria-current="page"':''}>${I(n[2])}<span>${n[1]}</span></a>`).join('')}
    <button id="btn-more" aria-label="More" title="More">${I('menu')}<span>More</span></button>
  </nav>`;
  ctx={};
  PAGES[cur]($('#page'));
  bindShell();
  if(keepScroll)scrollTo(0,y);
  resizeCat=innerWidth<720?'s':innerWidth<1100?'m':'l';
}
window.rerender=()=>{if(!$('#page')||!D.db)return;const y=scrollY;PAGES[cur]($('#page'));refreshChrome();scrollTo(0,y)};
window.go=p=>{location.hash='#/'+p};

function closeDrawer(){document.body.classList.remove('drawer-open')}
function notifMenuHTML(){const nl=D.myNotifs().slice(0,6);return `<div class="row between" style="padding:14px 16px 6px"><b>Notifications</b><a href="#/notifications" class="sm b">View all</a></div><div class="nl">${nl.length?nl.map(n=>`<a href="#/notifications" class="li" style="padding:10px;border-radius:12px;border:0;align-items:flex-start"><span class="dotc" style="margin-top:6px;background:${n.read?'transparent':'var(--brand)'}"></span><div class="grow"><b style="font-size:13px">${esc(n.title)}</b><span class="sm muted">${esc(n.body)}</span><div class="xs muted">${D.ago(n.time)}</div></div></a>`).join(''):U.empty('You\'re all caught up','bell')}</div>`}
/* update only the parts of the shell that can change (badges, bell, user chip, logo) */
function refreshChrome(){
  const un=D.myNotifs().filter(n=>!n.read).length,m=D.me();
  const bell=$('#btn-bell');if(bell){const d=bell.querySelector('.dot');if(un&&!d)bell.insertAdjacentHTML('beforeend','<i class="dot"></i>');if(!un&&d)d.remove()}
  const nl=$('.nav a[href="#/notifications"]');if(nl){const b=nl.querySelector('.badge-n');if(un){if(b)b.textContent=un;else nl.insertAdjacentHTML('beforeend','<em class="badge-n">'+un+'</em>')}else if(b)b.remove()}
  const nm=$('#notif-menu');if(nm&&!nm.classList.contains('open'))nm.innerHTML=notifMenuHTML();
  const uc=$('#btn-user');if(uc)uc.innerHTML=U.avatar(m,'',true)+'<div class="nm"><b>'+esc(m.name)+'</b><span>'+(ROLE_LABEL[m.role]||m.role)+'</span></div><span class="hide-m">'+I('chevD')+'</span>';
  const lg=$('.sidebar .logo');if(lg)lg.innerHTML=U.LOGO;
}
function bindShell(){
  $('#btn-theme').onclick=()=>{D.sess.theme=D.sess.theme==='dark'?'light':'dark';D.saveSess();applyTheme();render(true)};
  const db=$('#btn-drawer');if(innerWidth<=900)db.style.display='grid';
  db.onclick=()=>document.body.classList.add('drawer-open');
  $('#btn-more').onclick=()=>document.body.classList.add('drawer-open');
  $('#scrim').onclick=closeDrawer;
  $('#btn-collapse').onclick=()=>{D.sess.collapsed=!D.sess.collapsed;D.saveSess();document.body.classList.toggle('collapsed',D.sess.collapsed)};
  $('#btn-logout').onclick=doLogout;
  // menus
  const um=$('#user-menu'),nm=$('#notif-menu');
  um.innerHTML=`<div class="mh">Signed in as</div><div style="padding:4px 10px 10px"><b style="display:block">${esc(D.me().name)}</b><span class="xs muted">${esc(D.me().email)} · ${D.me().role}</span></div><a href="#/settings?my">${I('user')} My profile</a><a href="#/settings">${I('settings')} Settings</a><button id="menu-logout">${I('logout')} Log out</button>`;
  $('#menu-logout',um).onclick=doLogout;
  nm.innerHTML=notifMenuHTML();
  const toggle=(btn,menu,other)=>btn.addEventListener('click',e=>{e.stopPropagation();other.classList.remove('open');menu.classList.toggle('open')});
  toggle($('#btn-bell'),nm,um);toggle($('#btn-user'),um,nm);
  nm.onclick=e=>e.stopPropagation();
  um.addEventListener('click',e=>{if(!e.target.closest('[data-as]'))um.classList.remove('open')});
  // search
  const gs=$('#gsearch'),sr=$('#sres');
  gs.oninput=()=>{const q=gs.value.trim().toLowerCase();if(q.length<2){sr.classList.remove('open');return}
    const res=[];
    D.db.employees.filter(e=>e.name.toLowerCase().includes(q)||e.title.toLowerCase().includes(q)).slice(0,5).forEach(e=>res.push(`<a href="#/attendance?emp=${e.id}">${U.avatar(e,'sm')}<div><b style="font-size:13px">${esc(e.name)}</b><div class="xs muted">${esc(e.title)} · ${esc(D.dept(e.dept))}</div></div></a>`));
    D.db.tasks.filter(t=>t.title.toLowerCase().includes(q)).slice(0,4).forEach(t=>res.push(`<a href="#/tasks?open=${t.id}"><span class="kpi"><span class="ico" style="width:28px;height:28px;border-radius:9px">${I('tasks')}</span></span><div><b style="font-size:13px">${esc(t.title)}</b><div class="xs muted">Task · ${esc(D.emp(t.assignee).name)}</div></div></a>`));
    NAV.filter(n=>n[1].toLowerCase().includes(q)).forEach(n=>res.push(`<a href="#/${n[0]}"><span class="kpi"><span class="ico" style="width:28px;height:28px;border-radius:9px">${I(n[2])}</span></span><b style="font-size:13px">${n[1]}</b></a>`));
    sr.innerHTML=res.join('')||'<div class="empty">No results</div>';sr.classList.add('open')};
  gs.onblur=()=>setTimeout(()=>sr.classList.remove('open'),180);
}
document.addEventListener('click',()=>{$$('.menu.open').forEach(m=>m.classList.remove('open'))});

/* ---------- attendance actions (shared by dashboard & attendance page) ---------- */
function geo(cb){
  if(!navigator.geolocation){cb(null);return}
  let done=false;const f=v=>{if(!done){done=true;cb(v)}};
  setTimeout(()=>f(null),4500);
  navigator.geolocation.getCurrentPosition(p=>f({lat:+p.coords.latitude.toFixed(4),lng:+p.coords.longitude.toFixed(4)}),()=>f(null),{timeout:4000,maximumAge:60000});
}
window.doCheckIn=function(){
  const m=D.me(),T=D.todayStr(),a=D.A();
  if(D.record(m.id,T)&&D.record(m.id,T).in){U.toast('You have already checked in today',true);return}
  if(D.leaveOn(m.id,T)){U.toast('You are on approved leave today',true);return}
  U.modal({title:'Check in',body:`<p class="ink2" style="margin-bottom:14px">It's <b>${D.fmt12(D.nowHM())}</b>. Choose where you're working from — your location will be captured for verification.</p>
  <div class="form-grid"><div class="field full"><label>Work mode</label><select class="sel" name="mode"><option>Office</option>${a.remote?'<option>Remote</option><option>Field</option>':''}</select></div><div class="field full"><label>Note (optional)</label><input class="inp" name="note" placeholder="e.g. Client visit in the afternoon"></div></div>`,
  actions:[{text:'Cancel'},{text:I('login')+' Check in now',cls:'primary',fn:(ov)=>{
    const mode=U.val(ov,'mode'),note=U.val(ov,'note');
    U.toast('Capturing location…');
    geo(pos=>{
      const t=D.nowHM(),late=D.toMin(t)>D.toMin(a.start)+a.grace;
      const gps=mode==='Remote'?'Remote':pos?'Verified':'Unavailable';
      const old=D.record(m.id,T);D.db.attendance=D.db.attendance.filter(r=>r!==old);
      D.db.attendance.push({id:old?old.id:D.uid('a'),emp:m.id,date:T,status:late?'late':'present',in:t,out:null,breakMin:0,mode,gps,coords:pos,note});
      if(late)D.notify('lateAlerts','attendance','Late check-in alert',m.name+' checked in at '+D.fmt12(t)+' (late).','admins');
      D.save();U.toast(late?'Checked in at '+D.fmt12(t)+' — marked Late':'Checked in at '+D.fmt12(t)+'. Have a great day!');rerender()});
    return true}}]});
};
window.doCheckOut=function(){
  const m=D.me(),r=D.record(m.id,D.todayStr());
  if(!r||!r.in){U.toast('Check in first',true);return}
  if(r.out){U.toast('Already checked out today',true);return}
  U.confirmBox('Check out','Check out now at '+D.fmt12(D.nowHM())+'?','Check out',()=>{
    if(r.breakStart){r.breakMin=(r.breakMin||0)+Math.max(0,D.nowMin()-D.toMin(r.breakStart));delete r.breakStart}
    r.out=D.nowHM();
    const h=D.workedHours(r);if(h<D.A().halfDay&&r.status==='present')r.status='half';
    D.save();U.toast('Checked out. You worked '+D.fmtH(h)+' today.');rerender()});
};
window.doBreak=function(){
  const r=D.record(D.me().id,D.todayStr());if(!r||!r.in||r.out)return;
  if(r.breakStart){r.breakMin=(r.breakMin||0)+Math.max(0,D.nowMin()-D.toMin(r.breakStart));delete r.breakStart;U.toast('Break ended')}
  else{r.breakStart=D.nowHM();U.toast('Break started')}
  D.save();rerender()};

/* ---------- sign in / sign up / forgot & reset password / first-run setup ---------- */
const AUTH={allowSignup:true};
function authScreen(mode,extra){
  if(mode===true)mode='setup';if(!mode)mode='signin';extra=extra||{};
  document.querySelectorAll('.auth').forEach(x=>x.remove());
  const ov=document.createElement('div');ov.className='overlay auth';ov.style.cssText='background:var(--bg);z-index:300;overflow:auto';
  const fld=(label,ph,name,type,auto)=>'<div class="field"><label for="a_'+name+'">'+label+'</label><input class="inp" id="a_'+name+'" type="'+type+'" name="'+name+'" autocomplete="'+auto+'" placeholder="'+ph+'"></div>';
  const lnk=(m,t)=>'<button type="button" class="auth-link" data-m="'+m+'">'+t+'</button>';
  let h1='',fields='',btn='Login',row='',bottom='';
  if(mode==='signin'){h1='Sign in';fields=fld('Email address','Enter your email','email','email','username')+fld('Password','Enter your password','password','password','current-password');
    row='<div class="auth-row"><span></span>'+lnk('forgot','Forgot password?')+'</div>';bottom=AUTH.allowSignup?'New user? '+lnk('signup','Create an account'):'Accounts are created by your Admin.'}
  else if(mode==='signup'){h1='Create your account';btn='Sign up';
    fields=fld('Full name','Enter your full name','name','text','name')+fld('Email address','Enter your work email','email','email','username')+fld('Password','At least 8 characters','password','password','new-password')+fld('Confirm password','Repeat your password','password2','password','new-password');
    row='<label class="auth-check"><input type="checkbox" name="agree"> <span>I agree to follow the company\'s attendance &amp; privacy policies</span></label>';bottom='Already have an account? '+lnk('signin','Sign in')}
  else if(mode==='forgot'){h1='Forgot password?';btn='Request password reset';fields='<p class="auth-note">Enter your work email. Your Admin will be notified and will send you a reset link.</p>'+fld('Email address','Enter your work email','email','email','username');bottom=lnk('signin','← Back to sign in')}
  else if(mode==='reset'){h1='Choose a new password';btn='Update password';fields=fld('New password','At least 8 characters','password','password','new-password')+fld('Confirm new password','Repeat your password','password2','password','new-password')}
  else{h1='Set up your workspace';btn='Create Admin account';fields='<p class="auth-note">Create the first Admin account. You can add your team afterwards.</p>'+fld('Your name','Enter your full name','name','text','name')+fld('Email address','Enter your email','email','email','username')+fld('Password','At least 8 characters','password','password','new-password')+fld('Confirm password','Repeat your password','password2','password','new-password')}
  const wave='';
  ov.innerHTML='<div class="auth-wrap"><aside class="auth-side"><i class="auth-layer l1"></i><i class="auth-layer l2"></i><i class="auth-layer l3"></i><h2 class="auth-welcome-t">Welcome to</h2><div class="auth-brand"><div class="auth-logo"><img src="assets/logo.png" alt="Rabbit Marketing House"></div><b>Rabbit Marketing House</b></div><p class="auth-desc">Attendance, leave, timesheets and team collaboration — everything your team needs, in one clean workspace.</p><div class="auth-foot-links"><span>ATTENDANCE</span><i></i><span>TIMESHEETS</span><i></i><span>LEAVE</span></div>'+wave+'</aside>'+
   '<form class="auth-main" autocomplete="on" novalidate><div class="auth-card"><div class="auth-logo-m"><img src="assets/logo.png" alt="Rabbit Marketing House"></div><h1>'+h1+'</h1><div class="auth-fields">'+fields+row+'</div><div class="auth-err" id="auth-err" role="alert"></div><button class="btn primary auth-btn" id="auth-go">'+btn+'</button>'+(bottom?'<p class="auth-bottom">'+bottom+'</p>':'')+'</div></form></div>';
  document.body.appendChild(ov);
  U.eyeify(ov);
  $$('[data-m]',ov).forEach(b=>b.onclick=()=>authScreen(b.dataset.m));
  const f=$('form',ov),err=m=>{$('#auth-err',ov).textContent=m},go=$('#auth-go',ov);
  const done=(title,msg,toMode,label)=>{$('.auth-main',ov).innerHTML='<div class="auth-card"><div class="auth-logo-m" style="display:block"><img src="assets/logo.png" alt="Rabbit Marketing House"></div><div style="text-align:center;padding:6px 0"><div class="ico ok kpi" style="width:60px;height:60px;border-radius:20px;margin:0 auto 18px;display:grid;place-items:center">'+I('check')+'</div><h1 style="margin-bottom:10px">'+title+'</h1><p class="auth-note" style="max-width:340px;margin:0 auto 24px">'+msg+'</p><button class="btn primary auth-btn" id="auth-back" style="width:auto;padding:0 34px">'+label+'</button></div></div>';$('#auth-back',ov).onclick=()=>authScreen(toMode)};
  f.onsubmit=async e=>{e.preventDefault();err('');
    const v=n=>f[n]?f[n].value.trim():'',pw=f.password?f.password.value:'';
    if(f.email&&!v('email'))return err('Please enter your email address');
    if(mode==='signin'&&!pw)return err('Please enter your password');
    if(['signup','setup'].includes(mode)&&!v('name'))return err('Please enter your name');
    if(['signup','setup','reset'].includes(mode)){if(pw.length<8)return err('Password must be at least 8 characters');if(pw!==f.password2.value)return err('The two passwords do not match')}
    if(mode==='signup'&&!f.agree.checked)return err('Please tick the box to agree to the policies');
    go.disabled=true;go.classList.add('loading');go.textContent=mode==='signin'?'Signing in…':'Please wait…';
    try{
      if(mode==='signin'||mode==='setup'){await D.api(mode==='setup'?'/api/setup':'/api/login',{name:v('name'),email:v('email'),password:pw});ov.remove();history.replaceState(null,'','#/dashboard');await start();return}
      if(mode==='signup'){await D.api('/api/signup',{name:v('name'),email:v('email'),password:pw});return done('Request sent','Your Admin has been notified. You will be able to sign in as soon as your account is approved.','signin','Back to sign in')}
      if(mode==='forgot'){await D.api('/api/forgot',{email:v('email')});return done('Request received','If an account exists for that email, your Admin has been notified and will send you a password reset link.','signin','Back to sign in')}
      if(mode==='reset'){await D.api('/api/reset',{token:extra.token,password:pw});history.replaceState(null,'','#/dashboard');return done('Password updated','You can now sign in with your new password.','signin','Go to sign in')}
    }catch(er){err(er.message);go.disabled=false;go.classList.remove('loading');go.textContent=btn}
  };
  setTimeout(()=>{const first=f.querySelector('input');if(first)first.focus()},50);
}
async function doLogout(){try{await D.api('/api/logout',{})}catch(e){}D.setToken('');D.stopPoll();D.clearData();$('#app').innerHTML='';history.replaceState(null,'','#/login');authScreen('signin')}
async function start(){await D.load();if(!location.hash||location.hash==='#'||/^#\/(login|reset)/.test(location.hash))history.replaceState(null,'','#/dashboard');route();D.startPoll()}

PAGES.unauthorized=function(root){
  root.innerHTML=head('Access denied','')+'<div class="card" style="max-width:520px">'+U.empty('You don\'t have permission to open this page with your account ('+(ROLE_LABEL[D.me().role]||D.me().role)+').','lock')+'<p class="sm muted" style="text-align:center;margin:-6px 0 14px">Taking you back to your dashboard in <b id="ad-count">6</b>s…</p><div class="row" style="justify-content:center"><a class="btn primary" href="#/dashboard">Go to my dashboard</a></div></div>';
  let n=6;const t=setInterval(()=>{const el=document.getElementById('ad-count');if(!el||cur!=='unauthorized'){clearInterval(t);return}n--;el.textContent=n;if(n<=0){clearInterval(t);location.hash='#/dashboard'}},1000);
};

/* ---------- boot ---------- */
window.addEventListener('hashchange',route);
window.addEventListener('resize',()=>{const c=innerWidth<720?'s':innerWidth<1100?'m':'l';if(resizeCat&&c!==resizeCat)render(true)});
setInterval(()=>{ if(cur==='dashboard'){const c=$('#live-clock');if(c)c.textContent=new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) }},15000);
window.boot=async function(){applyTheme();
  try{const r=await D.api('/api/me');AUTH.allowSignup=r.allowSignup!==false;if(r.needSetup)return authScreen('setup');
    const rt=/^#\/reset\?token=([a-f0-9]+)/.exec(location.hash);if(!r.user&&rt)return authScreen('reset',{token:rt[1]});
    if(!r.user)return authScreen('signin');await start()}
  catch(e){document.body.insertAdjacentHTML('beforeend','<div class="empty" style="padding:80px 20px">Cannot reach the attendance server. If you run this system, make sure the Node server is running (<b>npm run dev</b>) and open the address it prints. Static hosts such as Vercel cannot run it.</div>')}};
})();
