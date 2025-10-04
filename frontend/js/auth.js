// frontend/js/auth.js
const API_BASE = ''; // same origin (served from Express static)

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

    // ✅ CORREGIDO: Guardar token con nombre consistente
    if (data.token) {
      localStorage.setItem('auth_token', data.token);
      if (data.user) {
        localStorage.setItem('user_info', JSON.stringify(data.user));
      }
    }

    mostrarAlertaLocal('Usuario registrado correctamente', 'success');
    // Redirigir al dashboard
    setTimeout(() => { window.location.href = '/index.html'; }, 800);
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
  
  // Normalizar y detectar email
  const normalized = usernameOrEmail.trim();
  const isEmail = /\S+@\S+\.\S+/.test(normalized);
  const body = {};
  if (isEmail) body.email = normalized.toLowerCase(); 
  else body.username = normalized;
  body.password = password;

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
    
    // ✅ CORREGIDO: Guardar con nombre consistente 'auth_token'
    if (remember) {
      localStorage.setItem('auth_token', token);
    } else {
      sessionStorage.setItem('auth_token', token);
    }
    
    // Guardar info del usuario
    if (data.user) {
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem('user_info', JSON.stringify(data.user));
    }

    console.log('✅ Token guardado correctamente');
    mostrarAlertaLocal('Inicio de sesión correcto', 'success');

    // Redirigir a dashboard después de 800ms
    setTimeout(() => { window.location.href = '/index.html'; }, 800);
  } catch (err) {
    console.error(err);
    mostrarAlertaLocal('Error de red', 'danger');
  }
}

// ✅ NUEVO: Función auxiliar para peticiones autenticadas
window.fetchAutenticado = async function(url, options = {}) {
  // Buscar token en localStorage o sessionStorage
  const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  
  if (!token) {
    console.warn('No hay token disponible');
    window.location.href = '/login.html';
    return null;
  }
  
  // Agregar Authorization header
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  const config = {
    ...options,
    headers,
    credentials: 'include'
  };
  
  try {
    const response = await fetch(url, config);
    
    // Si recibimos 401, token expiró o es inválido
    if (response.status === 401) {
      console.warn('⚠️ Token inválido o expirado, redirigiendo a login...');
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
      localStorage.removeItem('user_info');
      sessionStorage.removeItem('user_info');
      window.location.href = '/login.html';
      return null;
    }
    
    return response;
  } catch (error) {
    console.error('Error en petición autenticada:', error);
    throw error;
  }
};

// ✅ NUEVO: Función para cerrar sesión
window.cerrarSesion = async function() {
  const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  
  if (token) {
    try {
      await fetch('/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }
  
  // Limpiar almacenamiento
  localStorage.removeItem('auth_token');
  sessionStorage.removeItem('auth_token');
  localStorage.removeItem('user_info');
  sessionStorage.removeItem('user_info');
  
  // Redirigir a login
  window.location.href = '/login.html';
};

// Si ya hay token, verificar con el servidor antes de redirigir
(async function() {
  const t = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  if (t) {
    console.log('🔍 Token encontrado, verificando con servidor...');
    try {
      const res = await fetch('/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${t}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (res.ok) {
        console.log('✅ Token válido, redirigiendo a dashboard...');
        window.location.href = '/index.html';
      } else {
        console.warn('⚠️ Token inválido, limpiando...');
        localStorage.removeItem('auth_token');
        sessionStorage.removeItem('auth_token');
        localStorage.removeItem('user_info');
        sessionStorage.removeItem('user_info');
      }
    } catch (err) {
      console.error('Error verificando token:', err);
    }
  }
})();