/* UI toolkit: icons, components, charts, modal, toast, export */
(function(){
const P={
home:'<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
dash:'<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="11" width="8" height="10" rx="2"/><rect x="3" y="14" width="8" height="7" rx="2"/>',
calendar:'<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4M16 2v4M3 10h18"/>',
clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
timer:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',
tasks:'<rect x="4" y="3" width="16" height="18" rx="3"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
leave:'<rect x="3" y="7" width="18" height="13" rx="3"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
chat:'<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
reports:'<path d="M3 3v18h18"/><path d="M8 17v-5M13 17V8M18 17v-3"/>',
bell:'<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0"/>',
settings:'<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
x:'<path d="M6 6l12 12M18 6 6 18"/>',
plus:'<path d="M12 5v14M5 12h14"/>',
chevL:'<path d="m15 6-6 6 6 6"/>',chevR:'<path d="m9 6 6 6-6 6"/>',chevD:'<path d="m6 9 6 6 6-6"/>',
check:'<path d="m5 12 5 5 9-10"/>',
logout:'<path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H9"/>',
login:'<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 8l4 4-4 4M14 12H3"/>',
users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.500 20a6.500 6.500 0 0 1 13 0M16 4.500a3.500 3.500 0 0 1 0 7M18 14.500a6.500 6.500 0 0 1 3.500 5.500"/>',
user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
pin:'<path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.800 7 12 7 12z"/><circle cx="12" cy="9" r="2.500"/>',
download:'<path d="M12 3v12m0 0-4-4m4 4 4-4M4 20h16"/>',
edit:'<path d="M4 20h4L19 9l-4-4L4 16zM13.500 6.500l4 4"/>',
trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
send:'<path d="M21 3 3 10.500l7 2.500 2.500 7z"/><path d="M21 3 10 13"/>',
coffee:'<path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 10h2a2 2 0 0 1 0 4h-2M7 2v3M11 2v3"/>',
alert:'<path d="M12 3 2 20h20zM12 10v4M12 17.500v.1"/>',
shield:'<path d="M12 3 4 6v6c0 5 3.500 8 8 9 4.500-1 8-4 8-9V6z"/>',
building:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 21v-5h6v5"/>',
lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
mail:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 8 9 6 9-6"/>',
phone:'<path d="M5 4h4l2 5-2.500 1.500a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
trend:'<path d="m3 17 6-6 4 4 8-8M15 7h6v6"/>',
printer:'<path d="M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><rect x="7" y="14" width="10" height="7" rx="1"/>',
more:'<circle cx="5" cy="12" r="1.200"/><circle cx="12" cy="12" r="1.200"/><circle cx="19" cy="12" r="1.200"/>',
filter:'<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.500v.1"/>',
list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.1M3 12h.1M3 18h.1"/>',
board:'<rect x="3" y="3" width="5" height="18" rx="1.500"/><rect x="10" y="3" width="5" height="12" rx="1.500"/><rect x="17" y="3" width="4" height="8" rx="1.500"/>',
flag:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
mapoff:'<path d="M12 21s7-6.200 7-12a7 7 0 1 0-14 0c0 5.800 7 12 7 12z"/><path d="m9 6 6 6M15 6l-6 6"/>',
home2:'<path d="M3 10.500 12 3l9 7.500M5 9v11h14V9"/>',
star:'<path d="m12 3 2.700 5.600 6.100.9-4.400 4.300 1 6.100L12 17l-5.400 2.900 1-6.100L3.200 9.500l6.100-.9z"/>',
send2:'<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
moon:'<path d="M20 14.500A8 8 0 1 1 9.500 4a6.500 6.500 0 0 0 10.500 10.500z"/>',
eye:'<path d="M2 12s3.500-7 10-7 10 7 10 7-3.500 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
eyeoff:'<path d="M3 3l18 18M10.600 6.200A9.900 9.900 0 0 1 12 6c6.500 0 10 6 10 6a17 17 0 0 1-3.200 3.900M6.600 6.700C3.700 8.500 2 12 2 12s3.500 6 10 6c1.600 0 3-.4 4.300-1M9.900 9.900a3 3 0 0 0 4.200 4.200"/>',
undo:'<path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3"/>'
};
const I=(n,cls)=>`<svg class="i ${cls||''}" viewBox="0 0 24 24">${P[n]||''}</svg>`;
const logoHTML=()=>{const c=window.D&&D.db&&D.db.settings&&D.db.settings.company;return `<img src="${c&&c.logo?c.logo:'assets/logo.png'}" alt="Company logo">`};
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>[...(r||document).querySelectorAll(s)];

const STATUS={present:['ok','Present'],late:['warn','Late'],absent:['bad','Absent'],half:['warn','Half Day'],leave:['info','On Leave'],pending:['','Not in yet']};
const SC={present:'#1f9d55',late:'#e0a100',absent:'#d64545',leave:'#2f6fed',half:'#c77d00'};
const pill=(st,txt)=>{const s=STATUS[st]||['',st];return `<span class="pill ${s[0]}">${esc(txt||s[1])}</span>`};
const tone=(cls,txt)=>`<span class="pill ${cls}">${esc(txt)}</span>`;
const avatar=(e,cls,st)=>`<div class="avatar ${cls||''}" style="${e.photo?`background:#d9d9d3 url('${e.photo}') center/cover no-repeat`:`background:${e.color}`}">${e.photo?'':D.initials(e.name)}${st?`<i class="st ${e.online?'on':''}"></i>`:''}</div>`;
/* resize an image file to a small square JPEG data-URL */
const pickPhoto=(file,contain)=>new Promise((ok,no)=>{if(!file||!file.type.startsWith('image/'))return no(new Error('Please choose an image file'));if(file.size>8e6)return no(new Error('Image is too large (max 8 MB)'));
  const img=new Image(),url=URL.createObjectURL(file);img.onerror=()=>no(new Error('Could not read that image'));
  img.onload=()=>{const S=contain?360:240,c=document.createElement('canvas');c.width=c.height=S;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,S,S);if(contain){const k=Math.min(S/img.width,S/img.height),w=img.width*k,h=img.height*k;x.imageSmoothingQuality='high';x.drawImage(img,(S-w)/2,(S-h)/2,w,h)}else{const m=Math.min(img.width,img.height),sx=(img.width-m)/2,sy=(img.height-m)/2;x.drawImage(img,sx,sy,m,m,0,0,S,S)}URL.revokeObjectURL(url);ok(c.toDataURL('image/jpeg',.85))};img.src=url});

/* interactive crop dialog (drag to move, slider / wheel to zoom) → 240px square JPEG data-URL, or null if cancelled */
const cropPhoto=file=>new Promise((ok,no)=>{
  if(!file||!file.type.startsWith('image/'))return no(new Error('Please choose an image file'));
  if(file.size>12e6)return no(new Error('Image is too large (max 12 MB)'));
  const url=URL.createObjectURL(file),img=new Image();
  img.onerror=()=>no(new Error('Could not read that image'));
  img.onload=()=>{
    const V=Math.min(280,innerWidth-80),base=Math.max(V/img.width,V/img.height);
    let zoom=1,ox=0,oy=0,done=false;
    const finish=v=>{if(!done){done=true;URL.revokeObjectURL(url);ok(v)}};
    modal({title:'Crop photo',body:'<div class="cropper"><canvas width="'+V+'" height="'+V+'" style="width:'+V+'px;height:'+V+'px"></canvas><div class="field" style="width:'+V+'px"><label>Zoom</label><input type="range" min="1" max="4" step="0.01" value="1"></div><p class="sm muted">Drag the image to reposition it.</p></div>',
    mount:ov=>{
      const cv=$('canvas',ov),x=cv.getContext('2d'),sl=$('input',ov);
      const clamp=()=>{const s=base*zoom,mx=Math.max(0,(img.width*s-V)/2),my=Math.max(0,(img.height*s-V)/2);ox=Math.min(mx,Math.max(-mx,ox));oy=Math.min(my,Math.max(-my,oy))};
      const draw=()=>{clamp();const s=base*zoom,w=img.width*s,h=img.height*s;x.fillStyle='#fff';x.fillRect(0,0,V,V);x.imageSmoothingQuality='high';x.drawImage(img,V/2+ox-w/2,V/2+oy-h/2,w,h)};
      let drag=null;
      cv.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY,ox,oy};cv.setPointerCapture(e.pointerId)};
      cv.onpointermove=e=>{if(!drag)return;ox=drag.ox+e.clientX-drag.x;oy=drag.oy+e.clientY-drag.y;draw()};
      cv.onpointerup=cv.onpointercancel=()=>{drag=null};
      sl.oninput=()=>{zoom=+sl.value;draw()};
      cv.onwheel=e=>{e.preventDefault();zoom=Math.min(4,Math.max(1,zoom+(e.deltaY<0?0.08:-0.08)));sl.value=zoom;draw()};
      new MutationObserver(()=>{if(!document.body.contains(ov))finish(null)}).observe(document.body,{childList:true});
      draw()},
    actions:[{text:'Cancel'},{text:'Use photo',cls:'primary',fn:ov=>{const o=document.createElement('canvas');o.width=o.height=240;o.getContext('2d').drawImage($('canvas',ov),0,0,V,V,0,0,240,240);finish(o.toDataURL('image/jpeg',.88))}}]});
  };
  img.src=url});
const person=(e,sub)=>`<div class="person">${avatar(e)}<div><b>${esc(e.name)}</b><span>${esc(sub==null?e.title:sub)}</span></div></div>`;
const empty=(msg,ic)=>`<div class="empty">${I(ic||'info')}<div>${esc(msg)}</div></div>`;
const opts=(arr,sel,all)=>(all?`<option value="">${esc(all)}</option>`:'')+arr.map(a=>{const v=Array.isArray(a)?a[0]:a,l=Array.isArray(a)?a[1]:a;return `<option value="${esc(v)}" ${String(v)===String(sel)?'selected':''}>${esc(l)}</option>`}).join('');
const empOpts=(sel,all,list)=>opts((list||D.activeEmps()).map(e=>[e.id,e.name]),sel,all);

/* toast */
function toast(msg,err){let w=$('.toasts');if(!w){w=document.createElement('div');w.className='toasts';document.body.appendChild(w)}
  const t=document.createElement('div');t.className='toast'+(err?' err':'');t.innerHTML=(err?I('alert'):I('check'))+`<span>${esc(msg)}</span>`;w.appendChild(t);setTimeout(()=>t.remove(),3200)}

/* modal */
function modal(o){
  const ov=document.createElement('div');ov.className='overlay';
  ov.innerHTML=`<div class="modal ${o.wide?'wide':''}" role="dialog" aria-modal="true"><div class="modal-h"><h2 style="font-size:18px">${esc(o.title)}</h2><button class="iconbtn" data-x aria-label="Close" style="box-shadow:none;background:var(--soft)">${I('x')}</button></div><div class="modal-b">${o.body}</div>${o.actions&&o.actions.length?'<div class="modal-f"></div>':''}</div>`;
  const close=()=>{ov.remove();document.removeEventListener('keydown',esc_)};
  const esc_=e=>{if(e.key==='Escape')close()};document.addEventListener('keydown',esc_);
  ov.addEventListener('mousedown',e=>{if(e.target===ov)close()});
  $('[data-x]',ov).onclick=close;
  const f=$('.modal-f',ov);
  (o.actions||[]).forEach(a=>{const b=document.createElement('button');b.className='btn '+(a.cls||'');b.innerHTML=a.text;b.onclick=()=>{const r=a.fn?a.fn(ov,close):undefined;if(r!==false)close()};f.appendChild(b)});
  document.body.appendChild(ov);
  if(o.mount)o.mount(ov,close);
  const first=$('input:not([type=hidden]),select,textarea',ov);if(first&&innerWidth>720)first.focus();
  return close}
const confirmBox=(title,msg,okText,fn,danger)=>modal({title,body:`<p class="ink2" style="padding-bottom:6px">${esc(msg)}</p>`,actions:[{text:'Cancel'},{text:okText||'Confirm',cls:danger?'danger':'primary',fn}]});
const val=(root,name)=>{const el=root.querySelector(`[name="${name}"]`);return el?(el.type==='checkbox'?el.checked:el.value.trim()):''};

/* CSV */
function csv(name,rows){
  const t=rows.map(r=>r.map(c=>{c=c==null?'':String(c);return /[",\n]/.test(c)?'"'+c.replace(/"/g,'""')+'"':c}).join(',')).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['﻿'+t],{type:'text/csv'}));a.download=name+'.csv';document.body.appendChild(a);a.click();a.remove();toast('Exported '+name+'.csv')}

/* pagination helper */
function paginate(arr,page,per){const pages=Math.max(1,Math.ceil(arr.length/per));page=Math.min(Math.max(1,page),pages);return {items:arr.slice((page-1)*per,page*per),page,pages,total:arr.length}}
const pagerHTML=(p,id)=>`<div class="pager"><span class="sm muted">${p.total?`Showing ${(p.page-1)*15+1}–${Math.min(p.page*15,p.total)} of ${p.total}`:'No results'}</span><div class="row"><button class="btn sm" data-pg="${p.page-1}" ${p.page<=1?'disabled':''}>${I('chevL')} Prev</button><span class="sm b">${p.page} / ${p.pages}</span><button class="btn sm" data-pg="${p.page+1}" ${p.page>=p.pages?'disabled':''}>Next ${I('chevR')}</button></div></div>`;

/* ---------- charts (SVG) ---------- */
const CW=()=>innerWidth<720?340:640;
const nice=m=>{if(m<=5)return 5;const p=Math.pow(10,Math.floor(Math.log10(m)));const n=m/p;return (n<=1?1:n<=2?2:n<=5?5:10)*p};
function axisY(W,H,pl,pb,max,steps,fmt){let s='';for(let i=0;i<=steps;i++){const y=H-pb-(H-pb-14)*i/steps;s+=`<line class="gl" x1="${pl}" x2="${W}" y1="${y}" y2="${y}"/><text x="${pl-8}" y="${y+4}" text-anchor="end">${fmt?fmt(max*i/steps):Math.round(max*i/steps)}</text>`}return s}
function stacked(data,keys,o){
  o=o||{};const W=o.w||CW(),H=o.h||230,pl=30,pb=26,n=data.length;
  const max=nice(Math.max(...data.map(d=>keys.reduce((a,k)=>a+(d.v[k]||0),0)),1));
  const bw=(W-pl)/n,w=Math.min(26,bw*0.62);
  let s=axisY(W,H,pl,pb,max,4);
  data.forEach((d,i)=>{let y=H-pb;const x=pl+bw*i+(bw-w)/2;
    keys.forEach(k=>{const v=d.v[k]||0;if(!v)return;const hh=(H-pb-14)*v/max;y-=hh;
      s+=`<rect class="hv" x="${x}" y="${y+1}" width="${w}" height="${Math.max(hh-2,1)}" rx="3" fill="${SC[k]}" data-tip="${esc(d.label)} · ${STATUS[k][1]}: ${v}"/>`});
    if(n<=16||i%2===0)s+=`<text x="${x+w/2}" y="${H-8}" text-anchor="middle">${esc(d.label)}</text>`});
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img">${s}</svg><div class="tip"></div></div>`}
function bars(data,o){
  o=o||{};const W=o.w||CW(),H=o.h||200,pl=o.pl==null?30:o.pl,pb=26,n=data.length;
  const max=o.max||nice(Math.max(...data.map(d=>d.value),1));
  const bw=(W-pl)/n,w=Math.min(o.bw||28,bw*0.62);
  let s=o.noaxis?'':axisY(W,H,pl,pb,max,4,o.fmt);
  data.forEach((d,i)=>{const x=pl+bw*i+(bw-w)/2,hh=Math.max((H-pb-14)*d.value/max,d.value?3:0);
    s+=`<rect class="hv" x="${x}" y="${H-pb-hh}" width="${w}" height="${hh}" rx="5" fill="${d.color||o.color||'var(--ink)'}" data-tip="${esc(d.label)}: ${esc(d.tip||(o.fmt?o.fmt(d.value):d.value))}"/>`;
    if(n<=16||i%2===0)s+=`<text x="${x+w/2}" y="${H-8}" text-anchor="middle">${esc(d.label)}</text>`});
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img">${s}</svg><div class="tip"></div></div>`}
function line(data,o){
  o=o||{};const W=o.w||CW(),H=o.h||210,pl=34,pb=26,n=data.length;
  const max=o.max||nice(Math.max(...data.map(d=>d.value),1));
  const px=i=>pl+(W-pl-8)*(n===1?0.5:i/(n-1)),py=v=>H-pb-(H-pb-14)*v/max;
  let s=axisY(W,H,pl,pb,max,4,o.fmt);
  const pts=data.map((d,i)=>[px(i),py(d.value)]);
  const path=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  s+=`<path d="${path} L${px(n-1)} ${H-pb} L${px(0)} ${H-pb}Z" fill="${o.color||'var(--ink)'}" opacity=".07"/><path d="${path}" fill="none" stroke="${o.color||'var(--ink)'}" stroke-width="2.200" stroke-linejoin="round" stroke-linecap="round"/>`;
  data.forEach((d,i)=>{s+=`<circle class="hv" cx="${pts[i][0]}" cy="${pts[i][1]}" r="${n>20?3:4.500}" fill="var(--card)" stroke="${o.color||'var(--ink)'}" stroke-width="2" data-tip="${esc(d.label)}: ${esc(o.fmt?o.fmt(d.value):d.value)}"/>`;
    if(n<=16||i%Math.ceil(n/8)===0)s+=`<text x="${pts[i][0]}" y="${H-8}" text-anchor="middle">${esc(d.label)}</text>`});
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img">${s}</svg><div class="tip"></div></div>`}
function donut(items,center,sub){
  const S=170,r=62,c=2*Math.PI*r,tot=items.reduce((a,b)=>a+b.value,0)||1;let off=0,s='';
  items.forEach(it=>{const l=c*it.value/tot;s+=`<circle class="hv" cx="85" cy="85" r="${r}" fill="none" stroke="${it.color}" stroke-width="20" stroke-dasharray="${Math.max(l-2,0)} ${c-Math.max(l-2,0)}" stroke-dashoffset="${-off}" transform="rotate(-90 85 85)" data-tip="${esc(it.label)}: ${it.value}"/>`;off+=l});
  return `<div class="chart" style="width:${S}px;flex:none"><svg viewBox="0 0 ${S} ${S}">${s}<text x="85" y="86" text-anchor="middle" style="font-size:24px;font-weight:700;fill:var(--ink)">${center}</text><text x="85" y="104" text-anchor="middle">${esc(sub||'')}</text></svg><div class="tip"></div></div>`}
function hbars(items,o){o=o||{};const max=o.max||Math.max(...items.map(i=>i.value),1);
  return `<div class="stack" style="gap:12px">${items.map(i=>`<div><div class="row between sm" style="margin-bottom:5px"><span class="b">${esc(i.label)}</span><span class="muted">${esc(i.text!=null?i.text:i.value)}</span></div><div class="bar ${o.cls||''}"><i style="width:${Math.min(100,i.value/max*100)}%;${i.color?'background:'+i.color:''}"></i></div></div>`).join('')}</div>`}
const legend=keys=>`<div class="legend">${keys.map(k=>`<span><i style="background:${SC[k]}"></i>${STATUS[k][1]}</span>`).join('')}</div>`;

document.addEventListener('mouseover',e=>{const t=e.target.closest&&e.target.closest('[data-tip]');if(!t)return;
  const c=t.closest('.chart'),tip=c&&c.querySelector('.tip');if(!tip)return;tip.textContent=t.dataset.tip;
  const cr=c.getBoundingClientRect(),tr=t.getBoundingClientRect();tip.style.left=Math.min(Math.max(tr.left+tr.width/2-cr.left,50),cr.width-50)+'px';tip.style.top=(tr.top-cr.top)+'px';tip.classList.add('on')});
document.addEventListener('mouseout',e=>{const t=e.target.closest&&e.target.closest('[data-tip]');if(!t)return;const tip=t.closest('.chart').querySelector('.tip');if(tip)tip.classList.remove('on')});

window.U={pickPhoto,cropPhoto,I,esc,$,$$,pill,tone,avatar,person,empty,opts,empOpts,toast,modal,confirmBox,val,csv,paginate,pagerHTML,stacked,bars,line,donut,hbars,legend,SC,STATUS};
/* adds a show/hide (eye) button to every password input inside root */
window.U.eyeify=root=>{(root||document).querySelectorAll('input[type=password]').forEach(inp=>{
  if(inp.parentNode.classList.contains('pw'))return;
  const w=document.createElement('div');w.className='pw';inp.parentNode.insertBefore(w,inp);w.appendChild(inp);
  const b=document.createElement('button');b.type='button';b.className='eye';b.setAttribute('aria-label','Show password');b.innerHTML=I('eye');w.appendChild(b);
  b.onclick=()=>{const show=inp.type==='password';inp.type=show?'text':'password';b.innerHTML=I(show?'eyeoff':'eye');b.setAttribute('aria-label',show?'Hide password':'Show password');inp.focus()}})};
Object.defineProperty(window.U,'LOGO',{get:logoHTML});
})();
