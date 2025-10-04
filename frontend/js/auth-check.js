// frontend/js/auth-check.js
// Este archivo debe cargarse al inicio de index.html para proteger la página

(async function verificarAutenticacion() {
  console.log('🔒 Verificando autenticación...');
  
  // Buscar token en localStorage o sessionStorage
  const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  
  // Si no hay token, redirigir inmediatamente
  if (!token) {
    console.warn('⚠️ No se encontró token, redirigiendo a login...');
    window.location.href = '/login.html';
    return;
  }
  
  try {
    console.log('🔍 Validando token con el servidor...');
    
    // Verificar token con el servidor
    const response = await fetch('/auth/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      console.warn('⚠️ Token inválido o expirado (status:', response.status, ')');
      
      // Limpiar tokens inválidos
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
      localStorage.removeItem('user_info');
      sessionStorage.removeItem('user_info');
      
      // Redirigir a login
      window.location.href = '/login.html';
      return;
    }
    
    const data = await response.json();
    console.log('✅ Usuario autenticado:', data.user?.username || 'desconocido');
    
    // Actualizar información del usuario en storage
    if (data.user) {
      const storage = localStorage.getItem('auth_token') ? localStorage : sessionStorage;
      storage.setItem('user_info', JSON.stringify(data.user));
      
      // Actualizar UI con datos del usuario
      actualizarUIUsuario(data.user);
    }
    
  } catch (error) {
    console.error('❌ Error verificando autenticación:', error);
    
    // En caso de error de red, limpiar y redirigir por seguridad
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
    sessionStorage.removeItem('user_info');
    
    window.location.href = '/login.html';
  }
})();

// Función para actualizar elementos de la UI con info del usuario
function actualizarUIUsuario(user) {
  // Actualizar nombre de usuario en el header/navbar
  const userNameElement = document.getElementById('user-name');
  if (userNameElement) {
    userNameElement.textContent = user.nombre_completo || user.username;
  }
  
  // Actualizar email
  const userEmailElement = document.getElementById('user-email');
  if (userEmailElement) {
    userEmailElement.textContent = user.email;
  }
  
  // Actualizar rol si existe
  const userRoleElement = document.getElementById('user-role');
  if (userRoleElement) {
    userRoleElement.textContent = user.rol || 'usuario';
  }
  
  // Mostrar/ocultar elementos según el rol
  if (user.rol === 'admin') {
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = '';
    });
  }
}