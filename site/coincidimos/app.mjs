import {DAYS,time,key,overlap,paint} from './logic.mjs';
const main=document.querySelector('#main'),dialog=document.querySelector('#dialog'),dialogBody=document.querySelector('#dialog-body');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={data:null,view:'mine',selected:new Set(),baseline:'',dirty:false,saving:false,error:'',gesture:null,focus:0,recovery:null};
const pageBase=document.documentElement.dataset.base||'';
const apiBase=document.documentElement.dataset.api||'';
const groupCandidate=pageBase?new URLSearchParams(location.search).get('g'):location.pathname.match(/^\/g\/([A-Za-z0-9_-]{43})$/)?.[1];
const id=/^[A-Za-z0-9_-]{43}$/.test(groupCandidate||'')?groupCandidate:null;
const homePath=pageBase||'/';
const groupPath=groupId=>pageBase?pageBase+'?g='+groupId:'/g/'+groupId;
const groupUrl=groupId=>location.origin+groupPath(groupId);
let poll,toastTimer,editToken=null;
try{const stored=id&&localStorage.getItem('coincidimos-edit:'+id);if(/^[A-Za-z0-9_-]{43}$/.test(stored||'')){editToken=stored;state.recovery=stored;}}catch{}
function rememberEditToken(token){
 editToken=token;state.recovery=token;
 try{localStorage.setItem('coincidimos-edit:'+id,token);}
 catch{toast('Guarda tu enlace personal para poder volver a editar.');}
}

document.querySelector('#dialog-close').onclick=()=>dialog.close();
function toast(message){const el=document.querySelector('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3000);}
function modal(html){dialogBody.innerHTML=html;dialog.showModal();}
async function api(path,options={}){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  try{
    const response=await fetch(apiBase+path,{...options,signal:controller.signal,headers:{'Content-Type':'application/json',...(editToken?{'X-Coincidimos-Session':editToken}:{}),...options.headers}});
    const data=await response.json();
    if(!response.ok)throw Object.assign(new Error(data.error||'No pudimos completar la operación.'),{status:response.status});
    return data;
  }catch(e){if(e.name==='AbortError')throw new Error('La conexión tardó demasiado. Reintenta.');if(e instanceof TypeError)throw new Error('No pudimos conectar. Comprueba tu conexión y reintenta.');throw e;}finally{clearTimeout(timeout);}
}
const endpoint=action=>'/api/groups/'+id+(action?'/'+action:'');
const me=()=>state.data?.participants.find(p=>p.id===state.data.me);
const serial=()=>JSON.stringify({slots:[...state.selected].sort(),name:document.querySelector('#personal-name')?.value.trim()||me()?.name||''});
function updateDirty(){state.dirty=serial()!==state.baseline;state.error='';saveStatus();}
function saveStatus(){
 const status=document.querySelector('#save-status'),button=document.querySelector('#save');
 if(!status)return;
 status.textContent=state.saving?'Guardando…':state.error|| (state.dirty?'Cambios sin guardar':me()?.responded?'Disponibilidad guardada':'Todavía no has enviado tu respuesta');
 status.classList.toggle('error',Boolean(state.error));
 if(button){button.disabled=state.saving||(!state.dirty&&me()?.responded);button.textContent=state.saving?'Guardando…':state.error?'Reintentar guardado':'Guardar disponibilidad';}
 const retry=document.querySelector('#reload-conflict');if(retry)retry.hidden=!state.conflict;
}
function options(selected,includeEnd=false){
 let html='';for(let m=0;m<=(includeEnd?1440:1410);m+=30)html+='<option value="'+m+'"'+(m===selected?' selected':'')+'>'+time(m)+'</option>';return html;
}
function home(){
 main.innerHTML=`<section class="welcome"><div class="welcome-copy"><span class="eyebrow">MENOS IDAS Y VUELTAS, MÁS ENCUENTROS</span><h1>Siempre hay un<br>momento <em>en común.</em></h1><p>Comparte tu disponibilidad habitual y encuentra ese ratito en el que todos pueden. De lunes a domingo, sin elegir fechas.</p><div class="week-ornament" aria-hidden="true">${DAYS.map((d,i)=>'<span class="'+(i===3?'pressed':'')+'">'+d.slice(0,2)+'</span>').join('')}</div><p class="small quiet">Suave para marcar. Fácil para coincidir.</p></div><section class="create-surface"><span class="eyebrow">EMPECEMOS POR TU GRUPO</span><h2>Hagamos espacio.</h2><p class="quiet">Un nombre, un enlace y una semana compartida.</p><form id="create"><label for="group-name">Nombre del grupo</label><input id="group-name" name="name" placeholder="Por ejemplo, nuestro café semanal" maxlength="60" required autocomplete="off"><div class="field-pair"><div><label for="start">Desde</label><select id="start">${options(480)}</select></div><div><label for="end">Hasta</label><select id="end">${options(1320,true)}</select></div></div><label for="timezone">Zona horaria del grupo</label><input id="timezone" value="America/Lima" required maxlength="80" list="zones"><datalist id="zones"><option value="America/Lima"><option value="America/Bogota"><option value="America/Mexico_City"><option value="America/Argentina/Buenos_Aires"><option value="Europe/Madrid"></datalist><p class="small quiet">Todos marcarán los horarios en esta referencia.</p><button class="primary wide" type="submit">Crear grupo <span aria-hidden="true">↗</span></button><p id="create-status" role="status" class="small"></p></form><div class="form-foot">Sin cuenta · Intervalos de 30 minutos</div></section></section>`;
 document.querySelector('#create').onsubmit=async e=>{
   e.preventDefault();const button=e.currentTarget.querySelector('button'),status=document.querySelector('#create-status');
   const start=Number(document.querySelector('#start').value),end=Number(document.querySelector('#end').value);
   if(start>=end){status.textContent='La hora final debe ser posterior a la inicial.';return;}
   button.disabled=true;status.textContent='Creando tu grupo…';
   try{const result=await api('/api/groups',{method:'POST',body:JSON.stringify({name:document.querySelector('#group-name').value,start,end,timezone:document.querySelector('#timezone').value.trim()})});location.assign(groupPath(result.id));}
   catch(e){status.textContent=e.message;status.classList.add('error');button.disabled=false;}
 };
}
function errorPage(message){
 main.innerHTML='<section class="error-page"><span class="eyebrow">NO PUDIMOS ABRIR ESTE ESPACIO</span><h1>Volvamos a intentarlo.</h1><p>'+escape(message)+'</p><button id="retry" class="primary">Reintentar carga</button> <a class="secondary" href="'+homePath+'">Crear otro grupo</a></section>';
 document.querySelector('#retry').onclick=()=>load();
}
async function load(background=false){
 try{
   const data=await api(endpoint());
   if(background){
     // Preserve unsaved changes, pointer gestures, focus, and the version used for optimistic editing.
     const old=me();if(old){const mine=data.participants.find(p=>p.id===old.id);if(mine){mine.version=old.version;mine.slots=old.slots;mine.responded=old.responded;mine.name=old.name;}}
     state.data=data;renderSummary();if(state.view==='group')refreshGroupCells();
     const stale=document.querySelector('#refresh-status');if(stale)stale.textContent='Actualización automática activa';
     return;
   }
   state.data=data;state.selected=new Set(me()?.slots||[]);state.baseline='';state.editName=undefined;state.dirty=false;state.error='';state.conflict=false;render();
   clearInterval(poll);poll=setInterval(()=>{if(!document.hidden&&!state.saving&&!state.gesture)load(true);},15000);
 }catch(e){
   if(background){const status=document.querySelector('#refresh-status');if(status)status.textContent='No se pudo actualizar. Usa Actualizar para reintentar.';}
   else errorPage(e.message);
 }
}
function render(){
 const {group}=state.data,p=me();
 main.innerHTML=`<section class="group-heading"><div><span class="eyebrow">TU SEMANA, EN COMÚN</span><h1>${escape(group.name)}</h1><p class="quiet">Encontremos un momento para coincidir.</p></div><button id="share" class="primary">Compartir enlace <span aria-hidden="true">↗</span></button></section><div class="group-meta"><span class="reference">◷ ${escape(group.timezone)} <span>· ${time(group.start)}–${time(group.end)}</span></span><span>Semana habitual · 30 min por bloque</span></div><div class="workspace"><section class="schedule"><div class="schedule-top"><div class="tabs" role="tablist" aria-label="Vista de disponibilidad"><button id="mine-tab" role="tab" aria-selected="${state.view==='mine'}" aria-controls="schedule-panel">Mi disponibilidad</button><button id="group-tab" role="tab" aria-selected="${state.view==='group'}" aria-controls="schedule-panel">Coincidencias del grupo</button></div><button id="refresh" class="text-button">Actualizar</button></div><div id="schedule-panel" role="tabpanel" aria-labelledby="${state.view==='mine'?'mine-tab':'group-tab'}"><div id="identity"></div><div class="grid-help" id="grid-help"></div><div class="grid-scroll" tabindex="0" role="region" aria-label="Cuadrícula semanal, desplazable horizontalmente"><div id="grid" class="weekly-grid"></div></div><div id="bottom"></div></div><p id="refresh-status" class="small quiet">Actualización automática activa</p></section><aside class="sidebar"><section><div class="aside-title"><h2>En este grupo</h2><span id="participant-count" class="count"></span></div><p id="response-count" class="small quiet"></p><ul id="people" class="people"></ul></section><section class="moments"><span class="eyebrow">UN RATITO PARA ENCONTRARNOS</span><h2>Mejores momentos</h2><div id="recommendations"></div></section><section id="detail" class="detail" aria-live="polite"><span class="small quiet">Los detalles del horario aparecerán aquí.</span></section></aside></div>`;
 document.querySelector('#share').onclick=()=>copy(groupUrl(id),'Enlace del grupo copiado');
 document.querySelector('#refresh').onclick=async()=>{
   if(state.dirty){toast('Tienes cambios sin guardar. Guárdalos antes de recargar tu respuesta.');await load(true);}
   else await load();
 };
 for(const [selector,view] of [['#mine-tab','mine'],['#group-tab','group']]){
   document.querySelector(selector).onclick=()=>{state.view=view;renderPanel();};
   document.querySelector(selector).onkeydown=e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const next=view==='mine'?'#group-tab':'#mine-tab';document.querySelector(next).focus();document.querySelector(next).click();}};
 }
 renderPanel();renderSummary();
}
function renderPanel(){
 const p=me(),mine=state.view==='mine';
 for(const [selector,active] of [['#mine-tab',mine],['#group-tab',!mine]]){const b=document.querySelector(selector);b.setAttribute('aria-selected',active);b.tabIndex=active?0:-1;}
 document.querySelector('#schedule-panel').setAttribute('aria-labelledby',mine?'mine-tab':'group-tab');
 const identity=document.querySelector('#identity'),bottom=document.querySelector('#bottom');
 if(mine&&p){
   identity.innerHTML='<div class="personal"><span class="avatar" aria-hidden="true">'+escape(p.name[0].toUpperCase())+'</span><div><label for="personal-name">Tu disponibilidad habitual</label><input id="personal-name" value="'+escape(state.editName??p.name)+'" maxlength="60" required aria-label="Tu nombre"></div><button id="personal-link" class="text-button">Enlace personal</button></div>';
   document.querySelector('#personal-name').oninput=e=>{state.editName=e.target.value;updateDirty();};
   document.querySelector('#personal-link').onclick=()=>{
     if(!state.recovery){modal('<h2>Tu respuesta está protegida</h2><p>Puedes editarla en este navegador gracias a tu sesión privada. El enlace de recuperación se entrega al entrar por primera vez; si lo guardaste, úsalo para recuperar esta misma sesión en otro navegador.</p>');return;}
     modal('<h2>Guarda tu enlace personal</h2><p>Este enlace permite editar tus respuestas de esta sesión. Consérvalo en privado y comparte solo el enlace del grupo con otras personas.</p><label for="private-url">Enlace privado de recuperación</label><input id="private-url" readonly value="'+escape(groupUrl(id)+'#editar='+state.recovery)+'"><button id="copy-private" class="primary">Copiar enlace personal</button>');
     document.querySelector('#copy-private').onclick=()=>copy(document.querySelector('#private-url').value,'Enlace personal copiado');
   };
 }else if(mine){
   identity.innerHTML='<div class="join-intro"><h2>Tu lugar en la semana</h2><p class="quiet">Escribe tu nombre y marca los momentos en los que sueles estar disponible.</p><form id="join" class="join-form"><label class="sr-only" for="join-name">Tu nombre</label><input id="join-name" placeholder="Tu nombre" maxlength="60" required autocomplete="given-name"><button class="primary">Entrar al grupo</button></form><p id="join-status" role="status" class="small"></p></div>';
   document.querySelector('#join').onsubmit=async e=>{
     e.preventDefault();const b=e.currentTarget.querySelector('button'),status=document.querySelector('#join-status');b.disabled=true;status.textContent='Entrando…';
     try{const result=await api(endpoint('join'),{method:'POST',body:JSON.stringify({name:document.querySelector('#join-name').value})});rememberEditToken(result.recovery);await load();toast('Ya tienes tu espacio. Guarda tu enlace personal para volver desde otro navegador.');}
     catch(e){status.textContent=e.message;b.disabled=false;}
   };
 }else identity.innerHTML='<div class="group-intro"><h2>Así coincide nuestra semana</h2><p class="quiet">Cada bloque reúne las disponibilidades que ya se guardaron.</p></div>';
 document.querySelector('#grid-help').innerHTML=mine?'<span>Toques para marcar · Arrastra con el mouse</span><span>Teclado: flechas + espacio</span>':'<span class="legend"><i></i> Nadie <i class="partial"></i> Algunos <i class="all"></i> Todos</span><span>Toca o enfoca un bloque para ver quiénes</span>';
 renderGrid();
 if(mine&&p){
   bottom.innerHTML='<div class="save-bar"><div><p id="save-status" role="status" aria-live="polite"></p><button id="clear" class="text-button">Limpiar selección</button> <button id="reload-conflict" class="text-button" hidden>Recargar mi respuesta</button></div><button id="save" class="primary">Guardar disponibilidad</button></div>';
   if(!state.baseline)state.baseline=serial();
   document.querySelector('#clear').onclick=()=>{modal('<h2>¿Limpiar tu selección?</h2><p>Se quitarán todos los bloques marcados. El cambio se guardará solo cuando pulses Guardar disponibilidad.</p><button id="confirm-clear" class="primary">Sí, limpiar selección</button>');document.querySelector('#confirm-clear').onclick=()=>{state.selected.clear();renderGrid();updateDirty();dialog.close();};};
   document.querySelector('#save').onclick=save;
   document.querySelector('#reload-conflict').onclick=()=>{modal('<h2>Recargar tu respuesta</h2><p>Se descartarán tus cambios locales y se cargará la última respuesta guardada.</p><button id="confirm-reload" class="primary">Descartar cambios y recargar</button>');document.querySelector('#confirm-reload').onclick=()=>{state.baseline='';state.editName=undefined;dialog.close();load();};};
   saveStatus();
 }else bottom.innerHTML='<p class="small quiet grid-foot">'+(mine?'Entra al grupo para empezar a marcar.':'La intensidad del verde indica la proporción del grupo disponible. Las respuestas pendientes también cuentan en el total.')+'</p>';
}
function cellLabel(day,minute,selected,count,total){
 const slot=DAYS[day]+', '+time(minute)+'–'+time(minute+30);
 return slot+', '+(state.view==='mine'?(selected?'seleccionado':'sin seleccionar'):count+' de '+total+' disponibles');
}
function renderGrid(){
 const g=state.data.group,grid=document.querySelector('#grid'),mine=state.view==='mine',summary=overlap(state.data.participants,g.start,g.end),lookup=new Map(summary.cells.map(c=>[key(c.day,c.minute),c]));
 let html='<div class="grid-corner">Hora</div>'+DAYS.map(d=>'<div class="day-head">'+d+'</div>').join('');
 let index=0;
 for(let m=g.start;m<g.end;m+=30){
   html+='<div class="hour '+(m%60===0?'hour-line':'')+'">'+time(m)+'</div>';
   for(let day=0;day<7;day++){
     const k=key(day,m),selected=state.selected.has(k),c=lookup.get(k);
     html+='<button class="slot '+(selected&&mine?'selected ':'')+(!mine?(c.all?'all':c.count?'partial-'+Math.min(4,Math.ceil(c.count/summary.total*4)):''):'')+'" data-slot="'+k+'" data-index="'+index+'" tabindex="'+(index===state.focus?'0':'-1')+'" aria-label="'+cellLabel(day,m,selected,c.count,summary.total)+'"'+(mine?' aria-pressed="'+selected+'"':'')+(mine&&!me()?' disabled':'')+'><span aria-hidden="true">'+(mine?(selected?'✓':''):c.count?c.count:'·')+'</span></button>';
     index++;
   }
 }
 grid.innerHTML=html;
 grid.onpointerdown=e=>{
   state.pointerType=e.pointerType;
   const b=e.target.closest('[data-slot]');
   if(!b||!mine||!me()||state.saving||e.pointerType==='touch'||e.button!==0)return;
   e.preventDefault();b.focus();
   state.gesture={selected:!state.selected.has(b.dataset.slot),visited:new Set()};
   applyPaint(b);
 };
 grid.onpointermove=e=>{
   if(!state.gesture)return;
   const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-slot]');
   if(target&&grid.contains(target))applyPaint(target);
 };
 grid.onclick=e=>{
   const b=e.target.closest('[data-slot]');if(!b)return;
   if(mine){
     if(!me()||state.saving||(e.detail>0&&state.pointerType!=='touch'))return;
     if(state.selected.has(b.dataset.slot))state.selected.delete(b.dataset.slot);else state.selected.add(b.dataset.slot);
     updateCell(b);updateDirty();
   }else details(b.dataset.slot);
 };
 if(state.focusHandler)grid.removeEventListener('focusin',state.focusHandler);
 state.focusHandler=e=>{
   const b=e.target.closest('[data-slot]');if(!b)return;
   grid.querySelector('[tabindex="0"]')?.setAttribute('tabindex','-1');b.tabIndex=0;state.focus=Number(b.dataset.index);
   if(!mine)details(b.dataset.slot);
 };
 grid.addEventListener('focusin',state.focusHandler);
 grid.onkeydown=e=>{
   const b=e.target.closest('[data-slot]');if(!b)return;
   state.focus=Number(b.dataset.index);
   const count=grid.querySelectorAll('[data-slot]').length;
   const changes={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7,Home:-state.focus%7,End:6-state.focus%7};
   if(e.key in changes){e.preventDefault();let n=state.focus+changes[e.key];if(e.ctrlKey&&e.key==='Home')n=0;if(e.ctrlKey&&e.key==='End')n=count-1;grid.querySelector('[data-index="'+Math.max(0,Math.min(count-1,n))+'"]')?.focus();}
 };
}
function applyPaint(b){if(paint(state.selected,b.dataset.slot,state.gesture.selected,state.gesture.visited)){updateCell(b);updateDirty();}}
function updateCell(b){
 const [d,m]=b.dataset.slot.split(':').map(Number),selected=state.selected.has(b.dataset.slot);
 b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));b.setAttribute('aria-label',cellLabel(d,m,selected,0,0));b.firstElementChild.textContent=selected?'✓':'';
}
for(const event of ['pointerup','pointercancel','blur'])window.addEventListener(event,()=>{state.gesture=null;});
function refreshGroupCells(){
 const g=state.data.group,summary=overlap(state.data.participants,g.start,g.end);
 for(const c of summary.cells){const b=document.querySelector('[data-slot="'+key(c.day,c.minute)+'"]');if(!b)continue;b.className='slot '+(c.all?'all':c.count?'partial-'+Math.min(4,Math.ceil(c.count/summary.total*4)):'');b.setAttribute('aria-label',cellLabel(c.day,c.minute,false,c.count,summary.total));b.firstElementChild.textContent=c.count||'·';}
 if(state.detail)details(state.detail);
}
function details(k){
 state.detail=k;const [day,minute]=k.split(':').map(Number),summary=overlap(state.data.participants,state.data.group.start,state.data.group.end),c=summary.cells.find(c=>c.day===day&&c.minute===minute);
 document.querySelector('#detail').innerHTML='<span class="eyebrow">ESTE MOMENTO</span><h2>'+DAYS[day]+', '+time(minute)+'–'+time(minute+30)+'</h2><p class="detail-count">'+c.count+' de '+summary.total+' disponibles</p><p>'+escape(c.names.join(' · ')||'Nadie ha marcado este bloque.')+'</p>';
}
function renderSummary(){
 const g=state.data.group,summary=overlap(state.data.participants,g.start,g.end);
 document.querySelector('#participant-count').textContent=summary.total;
 document.querySelector('#response-count').textContent=summary.responded+' de '+summary.total+' respondieron';
 document.querySelector('#people').innerHTML=state.data.participants.length?state.data.participants.map(p=>'<li><span class="avatar" aria-hidden="true">'+escape(p.name[0].toUpperCase())+'</span><div><strong>'+escape(p.name)+(p.id===state.data.me?' <span class="you">tú</span>':'')+'</strong><span class="small quiet">'+(p.responded?'Respuesta guardada':'Pendiente de responder')+'</span></div><span class="person-status '+(p.responded?'answered':'')+'" aria-hidden="true">'+(p.responded?'✓':'·')+'</span></li>').join(''):'<li class="empty-copy">Aquí aparecerán las personas que entren. Comparte el enlace para empezar.</li>';
 let intro;
 if(!summary.total)intro='Tu grupo ya tiene espacio. Ahora solo falta invitar a alguien.';
 else if(summary.responded<2)intro='Todavía no hay suficientes respuestas para comparar. Necesitamos al menos dos.';
 else if(summary.responded<summary.total)intro='Faltan '+(summary.total-summary.responded)+' respuestas. Estos resultados son provisionales.';
 else if(!summary.intervals.some(i=>i.all))intro='Aún no coinciden todos. Estos son los horarios con más personas.';
 else intro='Encontramos espacio para todos.';
 const intervals=summary.responded>=2?summary.intervals.slice(0,5):[];
 document.querySelector('#recommendations').innerHTML='<p class="quiet small">'+intro+'</p>'+intervals.map(i=>'<button class="recommendation '+(i.all?'complete':'')+'" data-moment="'+key(i.day,i.start)+'"><span class="moment-day">'+DAYS[i.day]+' <span class="moment-badge">'+(i.all?'Todos coinciden':i.count+' de '+summary.total)+'</span></span><strong>'+time(i.start)+'–'+time(i.end)+'</strong><span class="small quiet">'+escape(i.names.join(', '))+'</span></button>').join('')+(summary.responded>=2&&!intervals.length?'<p class="small">Todavía no hay disponibilidad marcada. Prueben añadir más horarios.</p>':'');
 for(const b of document.querySelectorAll('[data-moment]'))b.onclick=()=>{state.view='group';renderPanel();document.querySelector('[data-slot="'+b.dataset.moment+'"]')?.focus();};
}
async function save(){
 if(state.saving)return;
 const p=me(),name=document.querySelector('#personal-name').value.trim();
 if(!name){state.error='Escribe tu nombre antes de guardar.';saveStatus();return;}
 state.saving=true;state.error='';saveStatus();
 const slots=[...state.selected],version=p.version;
 // Freeze the submitted response and identity while the request is pending.
 document.querySelector('#personal-name').disabled=true;document.querySelector('#clear').disabled=true;
 try{
   const result=await api(endpoint('me'),{method:'PUT',body:JSON.stringify({name,slots,version})});
   p.name=name;p.slots=slots;p.responded=true;p.version=result.version;
   state.baseline=serial();state.dirty=false;state.editName=name;renderSummary();toast('Disponibilidad guardada. Ya cuenta para el grupo.');
 }catch(e){state.error=e.message;state.conflict=e.status===409;}
 finally{state.saving=false;document.querySelector('#personal-name')?.removeAttribute('disabled');document.querySelector('#clear')?.removeAttribute('disabled');saveStatus();}
}
async function copy(text,message){
 try{await navigator.clipboard.writeText(text);toast(message);}
 catch{modal('<h2>Copia tu enlace</h2><label for="copy-url">Selecciona y copia el enlace</label><input id="copy-url" readonly value="'+escape(text)+'">');document.querySelector('#copy-url').select();}
}
window.addEventListener('beforeunload',e=>{if(state.dirty){e.preventDefault();e.returnValue='';}});
async function boot(){
 if(pageBase?!groupCandidate:location.pathname==='/'){home();return;}
 if(!id){errorPage('El enlace no tiene un formato válido. Pide a tu grupo que te lo comparta otra vez.');return;}
 const recovery=location.hash.match(/^#editar=([A-Za-z0-9_-]{43})$/)?.[1];
 if(recovery){
   history.replaceState(null,'',location.pathname+location.search);
   try{await api(endpoint('recover'),{method:'POST',body:JSON.stringify({token:recovery})});rememberEditToken(recovery);}
   catch(e){errorPage(e.message);return;}
 }
 await load();
}
boot();
