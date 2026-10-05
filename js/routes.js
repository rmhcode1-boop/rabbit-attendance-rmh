/* Route configuration + role checks (the app's "ProtectedRoute" logic).
   Every navigation goes through Routes.resolve(); the server enforces the same rules on the data. */
(function(){
const ALL=['Admin','Manager','Employee'];
/* who may open which route (first path segment, or the full path for the specific entries) */
const ROUTES={
  dashboard:ALL,calendar:ALL,attendance:ALL,timesheet:ALL,tasks:ALL,leaves:ALL,chat:ALL,holidays:ALL,notifications:ALL,settings:ALL,
  reports:['Admin','Manager'],           // Manager sees team reports only (server scopes the data)
  'reports/company':['Admin'],
  admin:['Admin'],users:['Admin']
};
/* friendly URLs that map onto an existing page */
const ALIAS={'reports/company':'reports','admin/users':'settings?sec=employees',users:'settings?sec=employees',admin:'dashboard'};
/* sidebar entries per role (derived from ROUTES so the menu and the guard can never disagree) */
const NAV_ORDER=['dashboard','calendar','attendance','timesheet','tasks','leaves','chat','holidays','reports','notifications','settings'];
const sidebar=role=>NAV_ORDER.filter(p=>(ROUTES[p]||ALL).includes(role));

function resolve(path,role){
  path=String(path||'').replace(/^\/+|\/+$/g,'')||'dashboard';
  const seg=path.split('/')[0];
  const rule=ROUTES[path]||ROUTES[seg];
  if(rule&&!rule.includes(role))return {allowed:false,page:'unauthorized',path};
  const target=ALIAS[path]||path;
  const [page]=target.split('?');
  return {allowed:true,page:page.split('/')[0],target,path};
}
window.Routes={ROUTES,ALIAS,sidebar,resolve,canOpen:(path,role)=>resolve(path,role).allowed};
})();
