import {api,current,remember,resource} from './session.js';
const el = id => document.getElementById(id);
const dialog=el('cuenta'), form=el('account-form'), message=el('auth-message');
const trigger=el('account-button'), identifier=el('identifier'), password=el('account-pass'), alias=el('account-name'), code=el('code');
let mode='ingreso', user=current(), busy=false;
function render(next){
 mode=next;
 const register=next==='registro',recover=next==='recuperar';
 form.hidden=!!user; el('account-links').hidden=!!user;
 el('sign-out').hidden=!user;
 alias.hidden=alias.labels[0].hidden=!register;alias.required=register;
 code.hidden=code.labels[0].hidden=!recover;code.required=recover;
 identifier.type=register?'email':'text';identifier.autocomplete=register?'email':'username';
 el('id-label').textContent=register?'Correo electrónico':'Usuario o correo';
 el('pass-label').textContent=recover?'Contraseña nueva':'Contraseña';
 password.minLength=next==='ingreso'?1:10;password.autocomplete=next==='ingreso'?'current-password':'new-password';
 el('notice').hidden=!register;el('submit-account').textContent=register?'Crear cuenta':recover?'Cambiar contraseña':'Ingresar';
 el('switch-mode').textContent=next==='ingreso'?'Crear cuenta':'Volver al ingreso';
 el('reset-pass').hidden=recover;
 message.textContent=user?'Sesión iniciada como '+user.alias:register?'Usa cualquier correo y una contraseña de al menos 10 caracteres.':recover?'Introduce tu código privado y elige una contraseña nueva.':'Ingresa con tu cuenta de Aula Nuclear.';
}
function identify(account){
 user=account;remember(account);trigger.textContent=user?user.alias:'Mi cuenta';
 window.aulaUser=user?user.id:'visitante';
 window.dispatchEvent(new CustomEvent('aula-account',{detail:window.aulaUser}));
}
trigger.onclick=()=>{dialog.showModal()};
el('close-account').onclick=()=>dialog.close();
dialog.onclose=()=>{password.value='';code.value=''};
el('switch-mode').onclick=()=>render(mode==='ingreso'?'registro':'ingreso');
el('reset-pass').onclick=()=>render('recuperar');
el('sign-out').onclick=async()=>{try{await resource('salir','POST')}finally{remember(null);location.reload()}};
el('recovery-done').onclick=()=>{el('recovery-value').textContent='';el('recovery-result').hidden=true;render('ingreso');dialog.close()};
form.onsubmit=async e=>{
 e.preventDefault();if(busy)return;busy=true;
 const action=mode;
 const body={email:identifier.value,password:password.value,alias:alias.value,code:code.value};
 for(const b of dialog.querySelectorAll('button'))b.disabled=true;
 try{
  const response=await fetch(api+action,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const data=await response.json();
  if(!response.ok){message.textContent=data.error||'No se pudo completar la operación.';return}
  if(data.id)identify({id:data.id,alias:data.alias,token:data.token});
  form.reset();render('ingreso');
  if(data.recovery){form.hidden=true;el('account-links').hidden=true;el('sign-out').hidden=true;el('recovery-value').textContent=data.recovery;el('recovery-result').hidden=false;message.textContent=action==='registro'?'Tu cuenta está creada.':'Tu contraseña está actualizada.'}
  else dialog.close();
 }catch{message.textContent='No se pudo contactar al servicio de Aula Nuclear. Comprueba tu conexión e inténtalo de nuevo.'}
 finally{busy=false;password.value='';for(const b of dialog.querySelectorAll('button'))b.disabled=false}
};
render('ingreso');

el('register-now').onclick=()=>{render(user?'ingreso':'registro');dialog.showModal()};
el('explore').onclick=e=>{if(el('catalogo').hidden){e.preventDefault();render('ingreso');dialog.showModal()}};
window.addEventListener('aula-session',()=>{user=current();trigger.textContent=user?user.alias:'Mi cuenta';render('ingreso')});
trigger.textContent=user?user.alias:'Mi cuenta';