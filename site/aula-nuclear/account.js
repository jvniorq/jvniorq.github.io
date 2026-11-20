// Client ID for the Aula Nuclear web application registered in Google Cloud.
const CLIENT_ID = '';
const dialog = document.querySelector('#cuenta');
const signIn = document.querySelector('#google');
const message = document.querySelector('#auth-message');
const accountButton = document.querySelector('#account-button');
const signOut = document.querySelector('#sign-out');
let client;

accountButton.onclick = () => dialog.showModal();
document.querySelector('#close-account').onclick = () => dialog.close();

async function receiveAccess(response) {
  if (!response.access_token) {
    message.textContent = 'Puedes volver a intentarlo o seguir como visitante.';
    return;
  }
  try {
    const result = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: {Authorization: 'Bearer ' + response.access_token},
      cache: 'no-store'
    });
    if (!result.ok) throw Error();
    const profile = await result.json();
    if (!profile.sub) throw Error();
    accountButton.textContent = profile.given_name || 'Mi cuenta';
    message.textContent = 'Sesión iniciada en esta pestaña.';
    signIn.hidden = true;
    signOut.hidden = false;
    window.dispatchEvent(new CustomEvent('aula-account', {detail: profile.sub}));
    dialog.close();
  } catch {
    message.textContent = 'Google no pudo confirmar tu sesión. Vuelve a intentarlo.';
  }
}
signOut.onclick = () => {
  window.dispatchEvent(new CustomEvent('aula-account', {detail: 'visitante'}));
  accountButton.textContent = 'Mi cuenta';
  message.textContent = 'Sesión cerrada.';
  signOut.hidden = true;
  signIn.hidden = false;
  dialog.close();
};
if (CLIENT_ID) {
  const sdk = document.createElement('script');
  sdk.src = 'https://accounts.google.com/gsi/client';
  sdk.onload = () => {
    client = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID, scope: 'openid profile', callback: receiveAccess,
      error_callback: () => { message.textContent = 'La ventana de Google se cerró o fue bloqueada. Puedes intentarlo otra vez.'; }
    });
    signIn.disabled = false;
    signIn.onclick = () => client.requestAccessToken();
    message.textContent = 'Usa tu cuenta para tener tu propia lista de cursos guardados en este dispositivo.';
  };
  sdk.onerror = () => { message.textContent = 'Google no está disponible en este momento.'; };
  document.head.append(sdk);
}
