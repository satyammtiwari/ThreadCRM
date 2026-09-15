/* AUTH - THREADCRM LOGIN */

let THREADCRM_APP_STARTED = false;

function showLoginScreen(){
  const loginScreen = document.getElementById('login-screen');
  const appShell = document.getElementById('app-shell');
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');

  if(loginScreen) loginScreen.style.display = 'flex';
  if(appShell) appShell.style.display = 'none';

  if(emailInput) emailInput.value = '';
  if(passwordInput) passwordInput.value = '';

  showLoginError('');
}

function showAppScreen(){
  const loginScreen = document.getElementById('login-screen');
  const appShell = document.getElementById('app-shell');

  if(loginScreen) loginScreen.style.display = 'none';
  if(appShell) appShell.style.display = 'block';
}

function showLoginError(message){
  const el = document.getElementById('login-error');
  if(el){
    el.textContent = message || '';
  }
}

async function loginThreadCRM(){
  const email = document.getElementById('login-email')?.value.trim();
  const password = document.getElementById('login-password')?.value;

  showLoginError('');

  if(!email || !password){
    showLoginError('Please enter email and password.');
    return;
  }

  const btn = document.getElementById('login-btn');

  try{
    if(btn){
      btn.disabled = true;
      btn.textContent = 'Logging in...';
    }

    await firebase.auth().signInWithEmailAndPassword(email,password);
  }catch(err){
    console.error('Login failed:',err);

    let message = 'Login failed. Please check email and password.';

    if(err.code === 'auth/user-not-found'){
      message = 'User not found. Please contact administrator.';
    }else if(err.code === 'auth/wrong-password'){
      message = 'Incorrect password.';
    }else if(err.code === 'auth/invalid-email'){
      message = 'Please enter a valid email address.';
    }else if(err.code === 'auth/too-many-requests'){
      message = 'Too many attempts. Please try again later.';
    }

    showLoginError(message);
  }finally{
    if(btn){
      btn.disabled = false;
      btn.textContent = 'Login';
    }
  }
}

async function logoutThreadCRM(){
  try{
    await firebase.auth().signOut();
  }catch(err){
    console.error('Logout failed:',err);
  }
}

function injectLogoutButton(){
  if(document.getElementById('threadcrm-logout-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'threadcrm-logout-btn';
  btn.className = 'threadcrm-logout-btn';
  btn.type = 'button';
  btn.textContent = 'Logout';
  btn.onclick = logoutThreadCRM;

  document.body.appendChild(btn);
}

function removeLogoutButton(){
  const btn = document.getElementById('threadcrm-logout-btn');
  if(btn) btn.remove();
}

function initAuthGate(){
  const loginBtn = document.getElementById('login-btn');
  const passwordInput = document.getElementById('login-password');

  if(loginBtn){
    loginBtn.addEventListener('click',loginThreadCRM);
  }

  if(passwordInput){
    passwordInput.addEventListener('keydown',function(e){
      if(e.key === 'Enter'){
        loginThreadCRM();
      }
    });
  }

  firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);

  firebase.auth().onAuthStateChanged(async function(user){
    if(user){
      showAppScreen();
      injectLogoutButton();

      if(!THREADCRM_APP_STARTED && typeof startThreadCRMApp === 'function'){
        THREADCRM_APP_STARTED = true;
        await startThreadCRMApp();
      }
    }else{
      removeLogoutButton();
      showLoginScreen();
    }
  });
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded',initAuthGate);
}else{
  initAuthGate();
}