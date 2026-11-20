export const api='https://aula-nuclear-base25.kwestan-97.chatgpt.site/api/';
const key='aula-base25-sesion-v1';
let session=null;
try { session=JSON.parse(sessionStorage.getItem(key)); } catch {}
export function current(){return session}
export function remember(account){
 session=account;
 try{if(account)sessionStorage.setItem(key,JSON.stringify(account));else sessionStorage.removeItem(key)}catch{}
 window.dispatchEvent(new Event('aula-session'));
}
export async function resource(path, method='GET'){
 const active=session;
 if(!active)throw Error('Inicia sesión.');
 const r=await fetch(api+path,{method,cache:'no-store',credentials:'omit',headers:{Authorization:'Bearer '+active.token}});
 if(r.status===401&&session===active){remember(null);throw Error('Tu sesión terminó. Ingresa de nuevo.')}
 if(!r.ok)throw Error('No se pudo cargar el recurso. Inténtalo otra vez.');
 return r;
}