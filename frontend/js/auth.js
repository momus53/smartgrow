// frontend/js/auth.js
const API_BASE = '';// same origin (served from Express static)

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.form-section').forEach(s => s.classList.remove('active'));
  document.querySelector(`.tab[onclick="switchTab('${tab}')"]`).classList.add('active');
  document.getElementById(`${tab}-form`).classList.add('active');
}

function togglePassword(inputId, toggleId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(toggleId);
  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.remove('bi-eye');
    icon.classList.add('bi-eye-slash');
  } else {
    input.type = 'password';
    icon.classList.remove('bi-eye-slash');
    icon.classList.add('bi-eye');
  }
}

function checkPasswordStrength(pw) {
  const bar = document.getElementById('strength-bar');
  if (pw.length < 6) {
    bar.className = 'password-strength-bar strength-weak';
  } else if (pw.match(/[A-Z]/) && pw.match(/[0-9]/) && pw.length >= 8) {
    bar.className = 'password-strength-bar strength-strong';
  } else {
    bar.className = 'password-strength-bar strength-medium';
  }
}

function mostrarAlertaLocal(mensaje, tipo='info', duracion=3000) {
  const container = document.getElementById('alert-container');
  container.innerHTML = `<div class="alert alert-${tipo}">${mensaje}</div>`;
  if (duracion) setTimeout(() => container.innerHTML = '', duracion);
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('register-username').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const nombre = document.getElementById('register-fullname').value.trim();
  const password = document.getElementById('register-password').value;
  const confirm = document.getElementById('register-password-confirm').value;

  if (password !== confirm) return mostrarAlertaLocal('Las contraseñas no coinciden', 'danger');

  try {
    const res = await fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, nombre_completo: nombre })
    });

    const data = await res.json();
    if (!res.ok) return mostrarAlertaLocal(data.error || 'Error registrando', 'danger');

    // guardar token
    if (data.token) {
      sessionStorage.setItem('token', data.token);
    }

    mostrarAlertaLocal('Usuario registrado correctamente', 'success');
    // cambiar a login
    switchTab('login');
    document.getElementById('login-username').value = email || username;
  } catch (err) {
    console.error(err);
    mostrarAlertaLocal('Error de red', 'danger');
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const usernameOrEmail = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const remember = document.getElementById('remember-me').checked;
  // normalize and detect email more robustly
  const normalized = usernameOrEmail.trim();
  const isEmail = /\S+@\S+\.\S+/.test(normalized);
  const body = {};
  if (isEmail) body.email = normalized.toLowerCase(); else body.username = normalized;
  body.password = password;

  // Debug output to help trace why backend may receive username instead of email
  console.log('[auth][debug] login payload', { normalized, isEmail, body });

  try {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    if (!res.ok) return mostrarAlertaLocal(data.error || 'Credenciales inválidas', 'danger');

    const token = data.token;
    // Clear any previous tokens before setting new one
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    // Set new token
    if (remember) localStorage.setItem('token', token); else sessionStorage.setItem('token', token);

    mostrarAlertaLocal('Inicio de sesión correcto', 'success');

    // redirigir a dashboard (index.html) después de 800ms
    setTimeout(() => { window.location.href = '/index.html'; }, 800);
  } catch (err) {
    console.error(err);
    mostrarAlertaLocal('Error de red', 'danger');
  }
}

// Si ya hay token, redirigir al dashboard
(function() {
  const t = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (t) {
    // opcional: podríamos verificar token con /auth/me
    // por ahora, redirigir al dashboard
    // window.location.href = '/index.html';
  }
})();
