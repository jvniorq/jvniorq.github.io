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
 function draw(){
  const params=new URLSearchParams(),words=norm($("q").value).trim().split(/\s+/).filter(Boolean);if(words.length)params.set("q",$("q").value.trim())
  for(const key in fields)if($(key).value)params.set(key,$(key).value)
  history.replaceState(null,"",location.pathname+(params.size?"?"+params:"")+location.hash)
  const results=courses.filter(c=>Object.keys(fields).every(k=>!$(k).value||$(k).value===c[k]||(k==="mode"&&c.mode==="Virtual o presencial"&&$(k).value==="Virtual"))&&words.every(w=>norm([c.title,c.provider,c.topic,c.details,c.country,c.when].join(" ")).includes(w)))
  $("count").textContent=results.length+" de "+courses.length+" opciones";$("cards").replaceChildren()
  if(!results.length)$("cards").textContent="No encontramos coincidencias. Prueba con otra palabra o quita un filtro."
  for(const c of results){
   const el=$("card").content.cloneNode(true),find=s=>el.querySelector(s)
   for(const [sel,v] of Object.entries({".topic":c.topic,".status":c.status,"h3":c.title,".org":c.provider,".facts":[c.mode,c.price,c.date].join(" · "),".when":c.when,".detail":c.details,"small":"Ficha revisada el "+c.verified.split("-").reverse().join("/")}))find(sel).textContent=v
   if(c.status.includes("cerrada")||c.status.includes("confirmar"))find(".status").classList.add("closed")
   find(".go").href=c.url;$("cards").append(el)
  }
 }
 $("clear").onclick=()=>{$("q").value="";for(const k in fields)$(k).value="";draw()}
 $("share").onclick=async e=>{e.preventDefault();const url=new URL(location.href);url.hash="catalogo";try{await navigator.clipboard.writeText(url.href);$("share").textContent="Enlace copiado";setTimeout(()=>$("share").textContent="Copiar búsqueda",2200)}catch{$("feedback").textContent="Copia este enlace: "+url.href}}
 draw()
}
init().catch(()=>$("count").textContent="No se pudo cargar el catálogo. Vuelve a cargar la página.")
