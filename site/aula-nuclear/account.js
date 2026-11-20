const projectId = 'aulanuclear';
const webApiKey = '';
const el = id => document.getElementById(id);
const dialog = el('cuenta'), message = el('auth-message'), fields = el('account-fields');
const form = el('account-form'), email = el('account-email'), password = el('account-pass'), nickname = el('account-name');
const trigger = el('account-button');
let registering = false, auth, sdk, loading;
trigger.onclick = () => {
  dialog.showModal();
  if (!loading) loading = initialize().catch(() => {
    loading = null;
    message.textContent = 'El servicio de cuentas aún no está disponible. Puedes seguir consultando el catálogo.';
  });
};
el('close-account').onclick = () => {password.value='';dialog.close()};
dialog.addEventListener('close',()=>{password.value=''});
function mode(register) {
  registering=register;
  nickname.hidden=!register; nickname.labels[0].hidden=!register; nickname.required=register;
  password.autocomplete=register?'new-password':'current-password';
  password.minLength=register?8:1;
  el('notice').hidden=!register;
  el('submit-account').textContent=register?'Crear cuenta':'Ingresar';
  el('switch-mode').textContent=register?'Ya tengo cuenta':'Crear cuenta';
  el('reset-pass').hidden=register;
  message.textContent=register?'Usa tu correo personal o institucional y una contraseña de al menos 8 caracteres.':'Ingresa con tu cuenta de Aula Nuclear.';
}
el('switch-mode').onclick=()=>mode(!registering);
function display(user) {
  const active=user?.emailVerified;
  trigger.textContent=active?(user.displayName||'Mi cuenta'):'Mi cuenta';
  fields.hidden=!!active; el('sign-out').hidden=!active;
  if(active)message.textContent='Sesión iniciada con '+user.email;
  window.aulaUser=active?user.uid:'visitante';
  window.dispatchEvent(new CustomEvent('aula-account',{detail:window.aulaUser}));
}
async function initialize(){
  let config={projectId,apiKey:webApiKey,authDomain:projectId+'.firebaseapp.com'};
  if(!config.apiKey){
    const r=await fetch('https://'+config.authDomain+'/__/firebase/init.json');
    if(!r.ok)throw Error();
    config=await r.json();
    if(config.projectId!==projectId||!config.apiKey)throw Error();
  }
  const [app,authSdk]=await Promise.all([import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js')]);
  sdk=authSdk;auth=sdk.getAuth(app.initializeApp(config,'aula-nuclear'));
  auth.languageCode='es';
  await sdk.setPersistence(auth,sdk.browserSessionPersistence);
  await auth.authStateReady();fields.disabled=false;
  mode(false); sdk.onAuthStateChanged(auth,display);
}
async function act(work){
  fields.disabled=true;
  try {await work()}catch(err) {
    message.textContent=err.code==='auth/too-many-requests'?'Demasiados intentos. Vuelve a probar más tarde.':'No se pudo completar la solicitud. Revisa tus datos o usa la recuperación de contraseña.';
  }finally{fields.disabled=false;password.value=''}
}
form.onsubmit=e=>{
  e.preventDefault();
  act(async()=>{
    const create=registering,alias=nickname.value.trim();
    if(create&&!alias){message.textContent='Escribe tu nombre de usuario.';return}
    const {user}=await (create?sdk.createUserWithEmailAndPassword:sdk.signInWithEmailAndPassword)(auth,email.value.trim(),password.value);
    if(!user.emailVerified){
      try {
        if(create)await sdk.updateProfile(user,{displayName:alias});
        await sdk.sendEmailVerification(user);
      }finally{await sdk.signOut(auth)}
      mode(false);message.textContent='Te enviamos un enlace. Confirma tu correo y vuelve a ingresar.';return;
    }
    display(user);dialog.close();
  });
};
el('reset-pass').onclick=()=>{
  if(!email.reportValidity())return;
  act(async()=>{await sdk.sendPasswordResetEmail(auth,email.value.trim());message.textContent='Si tienes una cuenta, revisa tu correo para recuperar el acceso.'});
};
el('sign-out').onclick=async()=>{await sdk.signOut(auth);mode(false);dialog.close()};
if(webApiKey)loading=initialize().catch(()=>{loading=null});
