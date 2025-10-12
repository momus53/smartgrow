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

// Cargar dispositivos del usuario actual
async function cargarDispositivos() {
    try {
        console.log('[dashboard] cargarDispositivos iniciado');
        
        // Obtener token para autenticación
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
            console.warn('[dashboard] No hay token disponible para cargar dispositivos');
            // Usar datos de prueba si no hay token
            cargarDispositivosPrueba();
            return;
        }
        
        console.log('[dashboard] haciendo petición a:', `${API_URL}/dispositivos`);
        console.log('[dashboard] token disponible:', token ? `${token.substring(0, 20)}...` : 'null');
        
        const response = await fetch(`${API_URL}/dispositivos`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('[dashboard] respuesta recibida - status:', response.status);
        
        if (!response.ok) {
            if (response.status === 401) {
                console.warn('[dashboard] Token inválido al cargar dispositivos');
                // Usar datos de prueba como fallback
                cargarDispositivosPrueba();
                return;
            }
            const errorText = await response.text();
            console.error('[dashboard] Error en respuesta:', response.status, errorText);
            throw new Error(`Error en la respuesta: ${response.status}`);
        }
        
        const dispositivos = await response.json();
        console.log('[dashboard] dispositivos cargados:', dispositivos.length);
        console.log('[dashboard] dispositivos recibidos:', dispositivos);
        
        // Los contadores se actualizan en la lógica de tarjetas más abajo
        
        // Actualizar la tarjeta con información detallada
        const dispositivosActivos = dispositivos.filter(d => d.estado === 'activo');
        console.log('[dashboard] dispositivos activos encontrados:', dispositivosActivos.length);
        console.log('[dashboard] todos los dispositivos:', dispositivos.map(d => ({ nombre: d.nombre, estado: d.estado })));
        
        // Actualizar tarjeta de dispositivos
        const dispositivoNombre = document.getElementById('dispositivo-nombre');
        const dispositivosCount = document.getElementById('dispositivos-activos-count');
        const dispositivosStatus = document.getElementById('dispositivos-status');
        
        if (dispositivoNombre && dispositivosCount && dispositivosStatus) {
            if (dispositivosActivos.length > 0) {
                // Mostrar el nombre del primer dispositivo activo
                const primerActivo = dispositivosActivos[0];
                const nombreCompleto = primerActivo.nombre.length > 25 
                    ? primerActivo.nombre.substring(0, 25) + '...' 
                    : primerActivo.nombre;
                
                dispositivoNombre.innerHTML = `<i class="bi bi-circle-fill text-success me-2"></i>${nombreCompleto}`;
                dispositivosCount.textContent = `${dispositivosActivos.length} activos`;
                dispositivosStatus.innerHTML = 'Conectados';
                
                // Actualizar tarjetas de temperatura y humedad
                actualizarTarjetasSensores(primerActivo);
                
            } else if (dispositivos.length > 0) {
                // Hay dispositivos pero ninguno activo
                const primerDispositivo = dispositivos[0];
                const nombreCompleto = primerDispositivo.nombre.length > 25 
                    ? primerDispositivo.nombre.substring(0, 25) + '...' 
                    : primerDispositivo.nombre;
                
                dispositivoNombre.innerHTML = `<i class="bi bi-circle text-warning me-2"></i>${nombreCompleto}`;
                dispositivosCount.textContent = `${dispositivos.length} inactivos`;
                dispositivosStatus.innerHTML = 'Desconectados';
                
                // Limpiar tarjetas de sensores
                limpiarTarjetasSensores();
                
            } else {
                // No hay dispositivos
                dispositivoNombre.innerHTML = '<i class="bi bi-plus-circle me-2"></i>Agregar dispositivo';
                dispositivosCount.textContent = '0 dispositivos';
                dispositivosStatus.innerHTML = 'Ninguno';
                
                // Limpiar tarjetas de sensores
                limpiarTarjetasSensores();
            }
        }
        
        // Guardar dispositivos en variable global para uso en otras funciones
        window.userDevices = dispositivos;
        
    } catch (error) {
        console.error('Error cargando dispositivos:', error);
        
        // Mostrar estado de error
        const dispositivoNombre = document.getElementById('dispositivo-nombre');
        const dispositivosCount = document.getElementById('dispositivos-activos-count');
        const dispositivosStatus = document.getElementById('dispositivos-status');
        
        if (dispositivoNombre && dispositivosCount && dispositivosStatus) {
            dispositivoNombre.innerHTML = '<i class="bi bi-exclamation-triangle text-warning me-2"></i>Error';
            dispositivosCount.textContent = 'Error cargando';
            dispositivosStatus.innerHTML = 'Sin conexión';
        }
        
        // Limpiar tarjetas de sensores
        limpiarTarjetasSensores();
    }
}

// Función de prueba para cargar dispositivos de ejemplo
function cargarDispositivosPrueba() {
    console.log('[dashboard] usando datos de prueba para dispositivos');
    
    // Datos de prueba
    const dispositivos = [
        { id: 1, nombre: 'ESP32 Principal', estado: 'activo', tipo: 'ESP32', ubicacion: 'Invernadero A' },
        { id: 2, nombre: 'Arduino Sensor Exterior', estado: 'inactivo', tipo: 'Arduino', ubicacion: 'Jardín' },
        { id: 3, nombre: 'Raspberry Pi Monitor', estado: 'activo', tipo: 'Raspberry Pi', ubicacion: 'Laboratorio' }
    ];
    
    // Actualizar la tarjeta con información detallada
    const dispositivosActivos = dispositivos.filter(d => d.estado === 'activo');
    console.log('[dashboard] dispositivos activos encontrados (prueba):', dispositivosActivos.length);
    console.log('[dashboard] todos los dispositivos (prueba):', dispositivos.map(d => ({ nombre: d.nombre, estado: d.estado })));
    
    // Actualizar tarjeta de dispositivos con datos de prueba
    const dispositivoNombre = document.getElementById('dispositivo-nombre');
    const dispositivosCount = document.getElementById('dispositivos-activos-count');
    const dispositivosStatus = document.getElementById('dispositivos-status');
    
    if (dispositivoNombre && dispositivosCount && dispositivosStatus) {
        if (dispositivosActivos.length > 0) {
            // Mostrar el nombre del primer dispositivo activo
            const primerActivo = dispositivosActivos[0];
            const nombreCompleto = primerActivo.nombre.length > 25 
                ? primerActivo.nombre.substring(0, 25) + '...' 
                : primerActivo.nombre;
            
            dispositivoNombre.innerHTML = `<i class="bi bi-circle-fill text-success me-2"></i>${nombreCompleto}`;
            dispositivosCount.textContent = `${dispositivosActivos.length} activos`;
            dispositivosStatus.innerHTML = 'Conectados (prueba)';
            
        } else if (dispositivos.length > 0) {
            // Hay dispositivos pero ninguno activo
            const primerDispositivo = dispositivos[0];
            const nombreCompleto = primerDispositivo.nombre.length > 25 
                ? primerDispositivo.nombre.substring(0, 25) + '...' 
                : primerDispositivo.nombre;
            
            dispositivoNombre.innerHTML = `<i class="bi bi-circle text-warning me-2"></i>${nombreCompleto}`;
            dispositivosCount.textContent = `${dispositivos.length} inactivos`;
            dispositivosStatus.innerHTML = 'Desconectados (prueba)';
            
        } else {
            // No hay dispositivos
            dispositivoNombre.innerHTML = '<i class="bi bi-plus-circle me-2"></i>Agregar dispositivo';
            dispositivosCount.textContent = '0 dispositivos';
            dispositivosStatus.innerHTML = 'Ninguno (prueba)';
        }
    }
    
    // Guardar dispositivos en variable global
    window.userDevices = dispositivos;
}

// Cargar datos de luces con bombillas individuales
async function cargarDatosLuces() {
    try {
        console.log('[dashboard] cargarDatosLuces iniciado');
        
        // Definir configuración de luces (puedes conectar con tu API real)
        const totalLuces = 6; // Número total de luces en el sistema
        const estadoLuces = [];
        
        // Definir estados fijos de luces (puedes conectar con tu API real)
        for (let i = 0; i < totalLuces; i++) {
            estadoLuces.push({
                id: i + 1,
                nombre: `Luz ${i + 1}`,
                encendida: false, // Estado inicial apagado - se mantendrá hasta que el usuario lo cambie
                ubicacion: ['Invernadero A', 'Invernadero B', 'Jardín Principal', 'Área de Semillas', 'Zona de Trabajo', 'Entrada'][i]
            });
        }
        
        console.log('[dashboard] estados de luces:', estadoLuces);
        
        // Actualizar la UI con bombillas
        actualizarBombillas(estadoLuces);
        
    } catch (error) {
        console.error('Error cargando datos de luces:', error);
        mostrarErrorLuces();
    }
}

// Actualizar la interfaz con bombillas toggle
function actualizarBombillas(estadoLuces) {
    const container = document.getElementById('luces-container');
    const statusElement = document.getElementById('luces-status');
    
    if (!container || !statusElement) {
        console.error('No se encontraron los elementos de luces');
        return;
    }
    
    // Limpiar contenedor
    container.innerHTML = '';
    
    // Generar bombillas
    estadoLuces.forEach(luz => {
        const bulbButton = document.createElement('button');
        bulbButton.className = `bulb-toggle ${luz.encendida ? 'on' : 'off'}`;
        bulbButton.setAttribute('data-light-id', luz.id);
        bulbButton.setAttribute('title', `${luz.nombre} - ${luz.ubicacion}`);
        
        const icon = document.createElement('i');
        icon.className = `bi ${luz.encendida ? 'bi-lightbulb-fill' : 'bi-lightbulb'} bulb-icon`;
        
        bulbButton.appendChild(icon);
        
        // Agregar evento click para toggle
        bulbButton.addEventListener('click', () => toggleLuz(luz.id, bulbButton));
        
        container.appendChild(bulbButton);
    });
    
    // Actualizar estado
    const encendidas = estadoLuces.filter(l => l.encendida).length;
    const apagadas = estadoLuces.length - encendidas;
    statusElement.textContent = `${encendidas} encendidas, ${apagadas} apagadas`;
}

// Función para alternar el estado de una luz
async function toggleLuz(lightId, buttonElement) {
    try {
        // Mostrar estado de carga
        buttonElement.classList.add('loading');
        
        // Simular llamada a API (reemplaza con tu endpoint real)
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Alternar estado visual
        const isCurrentlyOn = buttonElement.classList.contains('on');
        const icon = buttonElement.querySelector('.bulb-icon');
        
        if (isCurrentlyOn) {
            // Apagar luz
            buttonElement.classList.remove('on');
            buttonElement.classList.add('off');
            icon.className = 'bi bi-lightbulb bulb-icon';
        } else {
            // Encender luz
            buttonElement.classList.remove('off');
            buttonElement.classList.add('on');
            icon.className = 'bi bi-lightbulb-fill bulb-icon';
        }
        
        // Actualizar contador
        actualizarContadorLuces();
        
        console.log(`[luces] Luz ${lightId} ${isCurrentlyOn ? 'apagada' : 'encendida'}`);
        
    } catch (error) {
        console.error('Error al cambiar estado de luz:', error);
    } finally {
        buttonElement.classList.remove('loading');
    }
}

// Actualizar contador de luces
function actualizarContadorLuces() {
    const container = document.getElementById('luces-container');
    const statusElement = document.getElementById('luces-status');
    
    if (!container || !statusElement) return;
    
    const bombillas = container.querySelectorAll('.bulb-toggle');
    const encendidas = container.querySelectorAll('.bulb-toggle.on').length;
    const apagadas = bombillas.length - encendidas;
    
    statusElement.textContent = `${encendidas} encendidas, ${apagadas} apagadas`;
}

// Mostrar error en las luces
function mostrarErrorLuces() {
    const container = document.getElementById('luces-container');
    const statusElement = document.getElementById('luces-status');
    
    if (container) {
        container.innerHTML = '<div class="text-white-50"><i class="bi bi-exclamation-triangle"></i> Error cargando</div>';
    }
    
    if (statusElement) {
        statusElement.textContent = 'Error de conexión';
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
// FUNCIONES DE DEBUG
// ============================================

// Función para probar la actualización de dispositivos manualmente
window.debugDispositivos = function() {
    console.log('=== DEBUG DISPOSITIVOS ===');
    const dispositivoNombre = document.getElementById('dispositivo-nombre');
    const dispositivosCount = document.getElementById('dispositivos-activos-count');
    const dispositivosStatus = document.getElementById('dispositivos-status');
    
    console.log('Elementos encontrados:');
    console.log('- dispositivo-nombre:', !!dispositivoNombre);
    console.log('- dispositivos-activos-count:', !!dispositivosCount);
    console.log('- dispositivos-status:', !!dispositivosStatus);
    
    if (dispositivoNombre && dispositivosCount && dispositivosStatus) {
        console.log('- contenido nombre:', dispositivoNombre.innerHTML);
        console.log('- contenido count:', dispositivosCount.textContent);
        console.log('- contenido status:', dispositivosStatus.innerHTML);
        
        // Probar actualización manual
        dispositivoNombre.innerHTML = '<i class="bi bi-circle-fill text-success me-2"></i>ESP32 Test (DEBUG)';
        dispositivosCount.textContent = '1 activos';
        dispositivosStatus.innerHTML = 'Debug mode';
        
        console.log('- actualización completada');
    }
    
    return { dispositivoNombre, dispositivosCount, dispositivosStatus };
};

// Función para forzar datos de prueba
window.testDispositivos = function() {
    cargarDispositivosPrueba();
};

// Función para decodificar el token JWT
window.debugToken = function() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
        console.error('No hay token disponible');
        return null;
    }
    
    try {
        // Decodificar el JWT sin verificar la firma (solo para debug)
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('=== TOKEN JWT DECODIFICADO ===');
        console.log('Payload completo:', payload);
        console.log('User ID (id):', payload.id);
        console.log('User ID (userId):', payload.userId);
        console.log('Username:', payload.username);
        console.log('Expira en:', new Date(payload.exp * 1000));
        return payload;
    } catch (error) {
        console.error('Error decodificando token:', error);
        return null;
    }
};

// Función para probar la API directamente
window.testAPI = async function() {
    console.log('=== TEST API DISPOSITIVOS ===');
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    console.log('Token disponible:', !!token);
    
    // Debug del token
    const tokenData = debugToken();
    if (tokenData) {
        console.log('User ID del token (id):', tokenData.id);
        console.log('User ID del token (userId):', tokenData.userId);
    }
    
    if (!token) {
        console.error('No hay token de autenticación');
        return;
    }
    
    try {
        const response = await fetch('http://localhost:3000/api/dispositivos', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Status:', response.status);
        console.log('Headers:', response.headers);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            return;
        }
        
        const data = await response.json();
        console.log('Dispositivos desde API:', data);
        return data;
    } catch (error) {
        console.error('Error en petición:', error);
    }
};

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
        // Obtener valores de todos los campos
        const name = document.getElementById('device-name').value.trim();
        const type = document.getElementById('device-type').value.trim();
        const location = document.getElementById('device-location').value.trim();
        const identifier = document.getElementById('device-identifier').value.trim();
        const desc = document.getElementById('device-desc').value.trim();
        const humidity = document.getElementById('device-humidity').value.trim();
        const temperature = document.getElementById('device-temperature').value.trim();

        // Validaciones
        if (!name) {
            mostrarAlerta('El nombre del dispositivo es obligatorio', 'warning', 2500);
            document.getElementById('device-name').focus();
            return;
        }

        if (!type) {
            mostrarAlerta('El tipo de dispositivo es obligatorio', 'warning', 2500);
            document.getElementById('device-type').focus();
            return;
        }

        if (!location) {
            mostrarAlerta('La ubicación del dispositivo es obligatoria', 'warning', 2500);
            document.getElementById('device-location').focus();
            return;
        }

        // Llamar a la API para crear el dispositivo
        try {
            console.log('[add-device] Creando dispositivo:', { name, type, location, identifier, desc });
            
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            if (!token) {
                mostrarAlerta('Error de autenticación. Inicia sesión nuevamente.', 'danger', 3000);
                return;
            }
            
            // Construir payload con todos los campos
            const payload = {
                nombre: name,
                tipo: type,
                ubicacion: location,
                descripcion: desc || null
            };
            
            // Solo agregar campos opcionales si se proporcionaron
            if (identifier) {
                payload.identificador_unico = identifier;
            }
            
            if (humidity) {
                payload.humedad_actual = parseFloat(humidity);
            }
            
            if (temperature) {
                payload.temperatura_actual = parseFloat(temperature);
            }
            
            const res = await fetch(`${API_URL}/dispositivos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Error creando dispositivo');
            }
            
            const newDevice = await res.json();
            console.log('[add-device] Dispositivo creado exitosamente:', newDevice);

            mostrarAlerta('Dispositivo agregado correctamente', 'success', 2000);
            
            // Cerrar modal
            addDeviceModalInstance.hide();

            // Refrescar datos de dispositivos
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

// Funciones para actualizar tarjetas de sensores
function actualizarTarjetasSensores(dispositivo) {
    // Actualizar tarjeta de temperatura
    const tempActual = document.getElementById('temp-actual');
    const tempTime = document.getElementById('temp-time');
    
    if (tempActual && tempTime) {
        if (dispositivo.temperatura_actual !== null && dispositivo.temperatura_actual !== undefined) {
            tempActual.textContent = dispositivo.temperatura_actual;
            const fechaLectura = dispositivo.fecha_ultima_lectura 
                ? new Date(dispositivo.fecha_ultima_lectura).toLocaleString('es-ES', { 
                    month: 'short', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                })
                : 'Ahora';
            tempTime.innerHTML = `📡 ${dispositivo.nombre} - ${fechaLectura}`;
        } else {
            tempActual.textContent = '--';
            tempTime.innerHTML = `📡 ${dispositivo.nombre} - Sin datos`;
        }
    }
    
    // Actualizar tarjeta de humedad
    const humedadActual = document.getElementById('humedad-actual');
    const humedadTime = document.getElementById('humedad-time');
    
    if (humedadActual && humedadTime) {
        if (dispositivo.humedad_actual !== null && dispositivo.humedad_actual !== undefined) {
            humedadActual.textContent = dispositivo.humedad_actual;
            const fechaLectura = dispositivo.fecha_ultima_lectura 
                ? new Date(dispositivo.fecha_ultima_lectura).toLocaleString('es-ES', { 
                    month: 'short', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                })
                : 'Ahora';
            humedadTime.innerHTML = `📡 ${dispositivo.nombre} - ${fechaLectura}`;
        } else {
            humedadActual.textContent = '--';
            humedadTime.innerHTML = `📡 ${dispositivo.nombre} - Sin datos`;
        }
    }
}

function limpiarTarjetasSensores() {
    // Limpiar tarjeta de temperatura
    const tempActual = document.getElementById('temp-actual');
    const tempTime = document.getElementById('temp-time');
    
    if (tempActual && tempTime) {
        tempActual.textContent = '--';
        tempTime.innerHTML = 'Esperando datos...';
    }
    
    // Limpiar tarjeta de humedad
    const humedadActual = document.getElementById('humedad-actual');
    const humedadTime = document.getElementById('humedad-time');
    
    if (humedadActual && humedadTime) {
        humedadActual.textContent = '--';
        humedadTime.innerHTML = 'Esperando datos...';
    }
}

// Inicializar UI adicional después de cargar
document.addEventListener('DOMContentLoaded', () => {
    initAddDeviceUI();
});