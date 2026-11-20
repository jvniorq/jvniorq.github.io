const $=id=>document.getElementById(id)
const fields={topic:"Área",mode:"Modalidad",country:"País o alcance",fee:"Costo",status:"Disponibilidad"}
const norm=value=>String(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
const state=new URLSearchParams(location.search)
const today=new Intl.DateTimeFormat("sv-SE",{timeZone:"America/Lima"}).format(new Date())
async function init(){
 const response=await fetch("cursos.json")
 if(!response.ok)throw Error()
 const courses=await response.json()
 for(const c of courses)if(c.start&&c.start<=today&&c.status==="Programado")c.status="Fecha iniciada"
 for(const [key,title] of Object.entries(fields)){
  const label=document.createElement("label"),select=document.createElement("select");label.textContent=title;select.id=key
  select.add(new Option("Todas las opciones",""))
  for(const v of [...new Set(courses.map(c=>c[key]))].sort((a,b)=>a.localeCompare(b,"es")))select.add(new Option(v,v))
  select.value=state.get(key)||"";label.append(select);$("filters").append(label);select.onchange=draw
 }
 $("q").value=state.get("q")||"";$("q").oninput=draw
 let owner=window.aulaUser||'visitante', onlySaved=false, saved=new Set();
 function readSaved(){
  try{saved=new Set(JSON.parse(localStorage.getItem('aula-base25:'+owner)||'[]'))}catch{saved=new Set()}
 }
 readSaved();
 window.addEventListener('aula-account',event=>{owner=event.detail;readSaved();draw()});
 $('saved-only').onclick=()=>{onlySaved=!onlySaved;draw()};
 for(const button of document.querySelectorAll('[data-preset]')){
  button.onclick=()=>{
   const active=button.getAttribute('aria-pressed')==='true';
   if(button.dataset.preset==='virtual'){
    $('mode').value=active?'':'Virtual';$('fee').value=active?'':'Gratis';
   }else{$('country').value=active?'':'Perú'}
   draw();
  };
 }
 function draw(){
  $('saved-count').textContent=saved.size;
  $('saved-only').setAttribute('aria-pressed',String(onlySaved));
  for(const button of document.querySelectorAll('[data-preset]')){
   const active=button.dataset.preset==='virtual'?$('mode').value==='Virtual'&&$('fee').value==='Gratis':$('country').value==='Perú';
   button.setAttribute('aria-pressed',String(active));
  }
  const params=new URLSearchParams(),words=norm($("q").value).trim().split(/\s+/).filter(Boolean);if(words.length)params.set("q",$("q").value.trim())
  for(const key in fields)if($(key).value)params.set(key,$(key).value)
  history.replaceState(null,"",location.pathname+(params.size?"?"+params:"")+location.hash)
  const results=courses.filter(c=>(!onlySaved||saved.has(c.title))&&Object.keys(fields).every(k=>!$(k).value||$(k).value===c[k]||(k==="mode"&&c.mode==="Virtual o presencial"&&$(k).value==="Virtual"))&&words.every(w=>norm([c.title,c.provider,c.topic,c.details,c.country,c.when].join(" ")).includes(w)))
  $("count").textContent=results.length+" de "+courses.length+" opciones";$("cards").replaceChildren()
  if(onlySaved&&!results.length&&!saved.size)$('cards').textContent='Todavía no has guardado cursos. Desactiva Mis guardados y elige Guardar en una ficha.';
  else if(!results.length)$("cards").textContent="No encontramos coincidencias. Prueba con otra palabra o quita un filtro."
  for(const c of results){
   const el=$("card").content.cloneNode(true),find=s=>el.querySelector(s)
   for(const [sel,v] of Object.entries({".topic":c.topic,".status":c.status,"h3":c.title,".org":c.provider,".facts":[c.mode,c.price,c.date].join(" · "),".when":c.when,".detail":c.details,"small":"Ficha revisada el "+c.verified.split("-").reverse().join("/")}))find(sel).textContent=v
   if(c.status.includes("cerrada")||c.status.includes("confirmar"))find(".status").classList.add("closed")
   const save=find('.save');
   const paint=()=>{save.textContent=saved.has(c.title)?'Guardado ✓':'Guardar';save.setAttribute('aria-pressed',String(saved.has(c.title)))};
   paint();
   save.onclick=()=>{
    if(saved.has(c.title))saved.delete(c.title);else saved.add(c.title);
    try{localStorage.setItem('aula-base25:'+owner,JSON.stringify([...saved]))}catch{$('feedback').textContent='Tus guardados durarán esta sesión.'}
    if(onlySaved){draw();$('saved-only').focus()}else{paint();$('saved-count').textContent=saved.size}
   };
   find('article').style.setProperty('--delay',Math.min(results.indexOf(c),5)*30+'ms');
   find(".go").href=c.url;$("cards").append(el)
  }
 }
 $("clear").onclick=()=>{onlySaved=false;$("q").value="";for(const k in fields)$(k).value="";draw()}
 $("share").onclick=async e=>{e.preventDefault();const url=new URL(location.href);url.hash="catalogo";try{await navigator.clipboard.writeText(url.href);$("share").textContent="Enlace copiado";setTimeout(()=>$("share").textContent="Copiar búsqueda",2200)}catch{$("feedback").textContent="Copia este enlace: "+url.href}}
 draw()
}
init().catch(()=>$("count").textContent="No se pudo cargar el catálogo. Vuelve a cargar la página.")

