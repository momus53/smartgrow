// frontend/js/dashboard.js

const API_URL = 'http://localhost:3000/api';
let chart = null;
let updateInterval = null;

// ============================================
// INICIALIZACIÓN
// ============================================

let currentUserFullName = null;

async function ensureAuthenticated() {
    // look for token in localStorage (remember) or sessionStorage
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    console.log('[dashboard] checking auth - token found:', !!token);
    
    if (!token) {
        // no token -> redirect to login
        console.log('[dashboard] no token, redirecting to login');
        window.location.href = '/login.html';
        return false;
    }

    try {
        console.log('[dashboard] calling /auth/me with token');
        const res = await fetch('/auth/me', {
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        console.log('[dashboard] /auth/me response status:', res.status);
        
        if (!res.ok) {
            // token invalid/expired or no active session
            const errorText = await res.text();
            console.log('[dashboard] auth failed, status:', res.status, 'response:', errorText);
            console.log('[dashboard] clearing expired/invalid tokens');
            // Clear invalid tokens
            localStorage.removeItem('token');
            sessionStorage.removeItem('token');
            window.location.href = '/login.html';
            return false;
        }
        const data = await res.json();
        console.log('[dashboard] auth successful, user:', data.user);
        // prefer nombre_completo if available, otherwise username
        currentUserFullName = (data && data.user && (data.user.nombre_completo || data.user.username)) || null;
        return true;
    } catch (e) {
        console.error('[dashboard] auth check failed:', e);
        window.location.href = '/login.html';
        return false;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // verify session before initializing dashboard
    const ok = await ensureAuthenticated();
    if (!ok) return;
    console.log('🚀 Dashboard iniciado');
    // Manual refresh shows alert
    await cargarDatos({ showSuccess: true });
    iniciarActualizacionAutomatica();
});

// ============================================
// FUNCIONES DE CARGA DE DATOS
// ============================================

async function cargarDatos(opts = {}) {
    const showSuccess = opts && opts.showSuccess;
    try {
        actualizarEstadoConexion(true);
        
        // Cargar datos principales en paralelo
        await Promise.all([
            cargarDatosActuales(),
            cargarEstadisticas(),
            cargarDatosHistoricos(),
            cargarTablaRegistros(),
            cargarDispositivos()
        ]);
        
        // Cargar datos de luces después para evitar conflictos
        await cargarDatosLuces();
        
        actualizarHoraActualizacion();
        if (showSuccess) {
            mostrarAlerta('Datos actualizados correctamente', 'success', 2000);
        }
    } catch (error) {
        console.error('Error cargando datos:', error);
        actualizarEstadoConexion(false);
        mostrarAlerta('Error conectando con el servidor', 'danger');
    }
}

// Cargar datos actuales
async function cargarDatosActuales() {
    try {
        const response = await fetch(`${API_URL}/datos/ultimo`);
        
        if (!response.ok) throw new Error('Error en la respuesta');
        
        const dato = await response.json();
        
        if (dato && dato.temperatura !== undefined) {
            const tempActual = document.getElementById('temp-actual');
            const humedadActual = document.getElementById('humedad-actual');
            const tempTime = document.getElementById('temp-time');
            const humedadTime = document.getElementById('humedad-time');
            
            if (tempActual) tempActual.textContent = dato.temperatura.toFixed(1);
            if (humedadActual) humedadActual.textContent = dato.humedad.toFixed(1);
            
            const fecha = new Date(dato.timestamp);
            const tiempo = fecha.toLocaleString('es-AR');
            
            if (tempTime) tempTime.textContent = `Actualizado: ${tiempo}`;
            if (humedadTime) humedadTime.textContent = `Actualizado: ${tiempo}`;
        } else {
            const tempActual = document.getElementById('temp-actual');
            const humedadActual = document.getElementById('humedad-actual');
            const tempTime = document.getElementById('temp-time');
            const humedadTime = document.getElementById('humedad-time');
            
            if (tempActual) tempActual.textContent = '--';
            if (humedadActual) humedadActual.textContent = '--';
            if (tempTime) tempTime.textContent = 'Sin datos';
            if (humedadTime) humedadTime.textContent = 'Sin datos';
        }
    } catch (error) {
        console.error('Error cargando datos actuales:', error);
        throw error;
    }
}

// Cargar estadísticas
async function cargarEstadisticas() {
    try {
        const response = await fetch(`${API_URL}/datos/estadisticas`);
        
        if (!response.ok) throw new Error('Error en la respuesta');
        
        const stats = await response.json();
        
        // Actualizar estadísticas (verificar que los elementos existan)
        const tempPromedio = document.getElementById('temp-promedio');
        if (tempPromedio) tempPromedio.textContent = 
            stats.temp_promedio ? `${stats.temp_promedio.toFixed(1)}°C` : '--';
        
        const tempMaxima = document.getElementById('temp-maxima');
        if (tempMaxima) tempMaxima.textContent = 
            stats.temp_maxima ? `${stats.temp_maxima.toFixed(1)}°C` : '--';
        
        const tempMinima = document.getElementById('temp-minima');
        if (tempMinima) tempMinima.textContent = 
            stats.temp_minima ? `${stats.temp_minima.toFixed(1)}°C` : '--';
        
        const humedadPromedio = document.getElementById('humedad-promedio');
        if (humedadPromedio) humedadPromedio.textContent = 
            stats.humedad_promedio ? `${stats.humedad_promedio.toFixed(1)}%` : '--';
        
        const humedadMaxima = document.getElementById('humedad-maxima');
        if (humedadMaxima) humedadMaxima.textContent = 
            stats.humedad_maxima ? `${stats.humedad_maxima.toFixed(1)}%` : '--';
        
        const humedadMinima = document.getElementById('humedad-minima');
        if (humedadMinima) humedadMinima.textContent = 
            stats.humedad_minima ? `${stats.humedad_minima.toFixed(1)}%` : '--';
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
        throw error;
    }
}

// Cargar datos históricos y crear gráfico
async function cargarDatosHistoricos() {
    try {
        const response = await fetch(`${API_URL}/datos/recientes?limit=50`);
        
        if (!response.ok) throw new Error('Error en la respuesta');
        
        const datos = await response.json();
        
        if (datos.length > 0) {
            crearGrafico(datos);
        } else {
            console.warn('No hay datos históricos disponibles');
        }
    } catch (error) {
        console.error('Error cargando datos históricos:', error);
        throw error;
    }
}

// Cargar tabla de registros
async function cargarTablaRegistros() {
    try {
        const response = await fetch(`${API_URL}/datos/recientes?limit=10`);
        
        if (!response.ok) throw new Error('Error en la respuesta');
        
        const datos = await response.json();
        const tbody = document.getElementById('tabla-body');
        
        if (!tbody) {
            console.warn('Tabla de registros no encontrada en el DOM');
            return;
        }
        
        if (datos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted">
                        <i class="bi bi-inbox"></i> No hay registros disponibles
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = datos.map(dato => {
            const fecha = new Date(dato.timestamp);
            const fechaFormateada = fecha.toLocaleString('es-AR');
            
            return `
                <tr>
                    <td><span class="badge bg-secondary">#${dato.id}</span></td>
                    <td><i class="bi bi-cpu text-primary"></i> ${dato.dispositivo}</td>
                    <td>
                        <span class="badge" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                            ${dato.temperatura.toFixed(1)}°C
                        </span>
                    </td>
                    <td>
                        <span class="badge" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                            ${dato.humedad.toFixed(1)}%
                        </span>
                    </td>
                    <td><small class="text-muted">${fechaFormateada}</small></td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error cargando tabla:', error);
        const tbody = document.getElementById('tabla-body');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-danger">
                        <i class="bi bi-exclamation-triangle"></i> Error cargando datos
                    </td>
                </tr>
            `;
        }
    }
}

// Cargar dispositivos
async function cargarDispositivos() {
    try {
        const response = await fetch(`${API_URL}/dispositivos`);
        
        if (!response.ok) throw new Error('Error en la respuesta');
        
        const dispositivos = await response.json();
        const totalDispositivosEl = document.getElementById('total-dispositivos');
        if (totalDispositivosEl) {
            totalDispositivosEl.textContent = dispositivos.length;
        }
        
    } catch (error) {
        console.error('Error cargando dispositivos:', error);
        const totalDispositivosEl = document.getElementById('total-dispositivos');
        if (totalDispositivosEl) {
            totalDispositivosEl.textContent = '--';
        }
    }
}

// Cargar datos de luces
async function cargarDatosLuces() {
    try {
        console.log('[dashboard] cargarDatosLuces iniciado');
        
        // Simular datos de luces dinámicos (puedes conectar con tu API real)
        const hora = new Date().getHours();
        // Simular más luces encendidas durante el día (6AM - 10PM)
        const encendidas = (hora >= 6 && hora <= 22) ? Math.floor(Math.random() * 3) + 3 : Math.floor(Math.random() * 2) + 1;
        const apagadas = 8 - encendidas; // Supongamos 8 luces totales
        
        const lucesData = {
            encendidas: encendidas,
            apagadas: apagadas
        };
        
        console.log('[dashboard] datos de luces:', lucesData);
        
        const lucesEncendidas = document.getElementById('luces-encendidas');
        const lucesApagadas = document.getElementById('luces-apagadas');
        
        console.log('[dashboard] elementos encontrados - encendidas:', !!lucesEncendidas, 'apagadas:', !!lucesApagadas);
        
        if (lucesEncendidas) {
            lucesEncendidas.textContent = lucesData.encendidas;
            console.log('[dashboard] actualizado luces encendidas:', lucesData.encendidas);
        }
        if (lucesApagadas) {
            lucesApagadas.textContent = `${lucesData.apagadas} apagadas`;
            console.log('[dashboard] actualizado luces apagadas:', lucesData.apagadas);
        }
        
    } catch (error) {
        console.error('Error cargando datos de luces:', error);
        const lucesEncendidas = document.getElementById('luces-encendidas');
        const lucesApagadas = document.getElementById('luces-apagadas');
        
        if (lucesEncendidas) lucesEncendidas.textContent = '--';
        if (lucesApagadas) lucesApagadas.textContent = '-- apagadas';
    }
}

// ============================================
// GRÁFICO CON CHART.JS
// ============================================

function crearGrafico(datos) {
    const ctx = document.getElementById('sensorChart');
    
    if (!ctx) {
        console.error('Canvas no encontrado');
        return;
    }
    
    // Invertir datos para mostrar del más antiguo al más reciente
    const datosOrdenados = [...datos].reverse();
    
    const labels = datosOrdenados.map(d => {
        const fecha = new Date(d.timestamp);
        return fecha.toLocaleTimeString('es-AR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    });
    
    const temperaturas = datosOrdenados.map(d => d.temperatura);
    const humedades = datosOrdenados.map(d => d.humedad);
    
    // Destruir gráfico anterior si existe
    if (chart) {
        chart.destroy();
    }
    
    // Crear nuevo gráfico
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Temperatura (°C)',
                    data: temperaturas,
                    borderColor: '#f5576c',
                    backgroundColor: 'rgba(245, 87, 108, 0.1)',
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#f5576c',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    yAxisID: 'y'
                },
                {
                    label: 'Humedad (%)',
                    data: humedades,
                    borderColor: '#00f2fe',
                    backgroundColor: 'rgba(0, 242, 254, 0.1)',
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#00f2fe',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    cornerRadius: 8,
                    titleFont: {
                        size: 14,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            label += context.parsed.y.toFixed(1);
                            label += context.dataset.label.includes('Temperatura') ? '°C' : '%';
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                        font: {
                            size: 10
                        }
                    }
                },
                y: {
                    type: 'linear',
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Temperatura (°C)',
                        font: {
                            weight: 'bold'
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Humedad (%)',
                        font: {
                            weight: 'bold'
                        }
                    },
                    grid: {
                        drawOnChartArea: false
                    },
                    min: 0,
                    max: 100
                }
            }
        }
    });
}

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

function mostrarAlerta(mensaje, tipo = 'info', duracion = 0) {
    const alertContainer = document.getElementById('alert-container');
    
    const alertId = 'alert-' + Date.now();
    const iconos = {
        success: 'bi-check-circle-fill',
        danger: 'bi-exclamation-triangle-fill',
        warning: 'bi-exclamation-circle-fill',
        info: 'bi-info-circle-fill'
    };
    
    const alerta = document.createElement('div');
    alerta.id = alertId;
    alerta.className = `alert alert-${tipo} alert-dismissible fade show alert-custom`;
    alerta.innerHTML = `
        <i class="bi ${iconos[tipo]} me-2"></i>
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    alertContainer.appendChild(alerta);
    
    // Auto-cerrar si se especifica duración
    if (duracion > 0) {
        setTimeout(() => {
            const alertElement = document.getElementById(alertId);
            if (alertElement) {
                // Remover la clase 'show' para que Bootstrap aplique la transición de fade
                alertElement.classList.remove('show');
                // Eliminar del DOM tras una breve espera para permitir la animación
                setTimeout(() => {
                    if (alertElement.parentNode) alertElement.parentNode.removeChild(alertElement);
                }, 200);
            }
        }, duracion);
    }
}

function actualizarEstadoConexion(conectado) {
    const badge = document.getElementById('status-badge');
    
    if (conectado) {
        badge.className = 'badge bg-success badge-pulse';
        const namePart = currentUserFullName ? ` - ${currentUserFullName}` : '';
        badge.innerHTML = `<i class="bi bi-circle-fill"></i> Sistema Activo${namePart}`;
    } else {
        badge.className = 'badge bg-danger';
        badge.innerHTML = '<i class="bi bi-circle-fill"></i> Sin Conexión';
    }
}

function actualizarHoraActualizacion() {
    const ahora = new Date();
    // show 24-hour time without seconds
    const horaFormateada = ahora.toLocaleTimeString('es-AR', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
    });
    document.getElementById('last-update').innerHTML = 
        `<i class="bi bi-clock"></i> ${horaFormateada}`;
}

function iniciarActualizacionAutomatica() {
    // Actualizar cada 10 segundos
    updateInterval = setInterval(() => {
        console.log('🔄 Actualizando datos automáticamente...');
        cargarDatos({ showSuccess: false });
    }, 10000);
    console.log('✅ Actualización automática activada (cada 10 segundos)');
}

function detenerActualizacionAutomatica() {
    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
        console.log('⏸️ Actualización automática detenida');
    }
}

// ============================================
// FUNCIÓN DE LOGOUT
// ============================================

async function cerrarSesion() {
    try {
        console.log('[dashboard] iniciando logout');
        
        // Obtener el token
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        
        if (token) {
            // Llamar al endpoint de logout
            try {
                const response = await fetch('/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + token,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    console.log('[dashboard] logout exitoso');
                } else {
                    console.warn('[dashboard] error en logout del servidor, pero continuando');
                }
            } catch (e) {
                console.warn('[dashboard] error de red en logout, pero continuando:', e);
            }
        }
        
        // Limpiar tokens del storage local
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        
        // Detener actualizaciones automáticas
        detenerActualizacionAutomatica();
        
        // Mostrar mensaje y redirigir
        mostrarAlerta('Sesión cerrada correctamente', 'success', 1500);
        
        // Redirigir después de un breve delay
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 1000);
        
    } catch (error) {
        console.error('[dashboard] error durante logout:', error);
        // Aún así limpiar y redirigir
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        window.location.href = '/login.html';
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

// Detectar cuando la página se vuelve visible/oculta
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        detenerActualizacionAutomatica();
    } else {
        iniciarActualizacionAutomatica();
        cargarDatos();
    }
});

// Limpiar al cerrar la página
window.addEventListener('beforeunload', () => {
    detenerActualizacionAutomatica();
    if (chart) {
        chart.destroy();
    }
});

// ============================================
// FUNCIONALIDAD: AGREGAR DISPOSITIVO (UI)
// ============================================

// Inicializar botón y modal de agregar dispositivo
function initAddDeviceUI() {
    console.log('[add-device] Iniciando initAddDeviceUI');
    const btn = document.getElementById('btn-add-device');
    const modalEl = document.getElementById('modalAddDevice');
    const submitBtn = document.getElementById('submit-add-device');

    console.log('[add-device] Elementos encontrados:', { btn: !!btn, modal: !!modalEl, submit: !!submitBtn });

    if (!btn || !modalEl || !submitBtn) {
        console.debug('[add-device] elementos UI no encontrados, saltando inicialización');
        return;
    }

    // Crear o reutilizar instancia de Bootstrap Modal
    if (!addDeviceModalInstance) {
        addDeviceModalInstance = new bootstrap.Modal(modalEl, { backdrop: 'static' });
        
        // Agregar listeners para limpiar cuando el modal se cierre
        modalEl.addEventListener('hidden.bs.modal', () => {
            // Limpiar cualquier backdrop residual
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach(backdrop => backdrop.remove());
            
            // Restaurar scroll del body
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        });
    }

    btn.addEventListener('click', (e) => {
        console.log('[add-device] Click event handler ejecutado!', e);
        e.preventDefault();
        e.stopPropagation();
        // limpiar formulario
        const form = document.getElementById('form-add-device');
        if (form) form.reset();
        addDeviceModalInstance.show();
    });

    submitBtn.addEventListener('click', async () => {
        const name = document.getElementById('device-name').value.trim();
        const type = document.getElementById('device-type').value.trim();
        const desc = document.getElementById('device-desc').value.trim();

        if (!name) {
            mostrarAlerta('El nombre del dispositivo es obligatorio', 'warning', 2500);
            return;
        }

        // Aquí puedes llamar a tu API real para crear el dispositivo.
        // Por ahora simulamos la creación y actualizamos el contador.
        try {
            // ejemplo de POST real:
            // const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            // const res = await fetch(`${API_URL}/dispositivos`, {
            //     method: 'POST',
            //     headers: {
            //         'Content-Type': 'application/json',
            //         'Authorization': 'Bearer ' + token
            //     },
            //     body: JSON.stringify({ nombre: name, tipo: type, descripcion: desc })
            // });

            // if (!res.ok) throw new Error('Error creando dispositivo');

            // Simulación: esperar 500ms
            await new Promise(r => setTimeout(r, 500));

            mostrarAlerta('Dispositivo agregado correctamente', 'success', 2000);
            // cerrar modal
            addDeviceModalInstance.hide();

            // refrescar conteo de dispositivos
            await cargarDispositivos();
        } catch (e) {
            console.error('[add-device] error agregando dispositivo:', e);
            mostrarAlerta('No se pudo agregar el dispositivo', 'danger');
        }
    });
}

// Variable global para almacenar la instancia del modal
let addDeviceModalInstance = null;

// Función global para abrir modal (respaldo para onclick inline)
function openAddDeviceModal() {
    const modalEl = document.getElementById('modalAddDevice');
    if (modalEl && window.bootstrap) {
        // Si ya existe una instancia, la reutilizamos
        if (!addDeviceModalInstance) {
            addDeviceModalInstance = new bootstrap.Modal(modalEl, { backdrop: 'static' });
        }
        // limpiar formulario
        const form = document.getElementById('form-add-device');
        if (form) form.reset();
        addDeviceModalInstance.show();
    } else {
        console.error('[add-device] Modal o Bootstrap no encontrado');
    }
}

// Inicializar UI adicional después de cargar
document.addEventListener('DOMContentLoaded', () => {
    initAddDeviceUI();
});