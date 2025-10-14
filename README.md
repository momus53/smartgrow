# 🌱 SmartGrow - IoT Monitoring System

<div align="center">

![SmartGrow Logo](https://img.shields.io/badge/🌱-SmartGrow-green?style=for-the-badge)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v14+-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-4479A1?style=flat&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![ESP32](https://img.shields.io/badge/ESP32-Compatible-red?style=flat&logo=espressif&logoColor=white)](https://www.espressif.com/)

**Sistema de monitoreo IoT inteligente para agricultura y ambientes controlados**

[🚀 Demo](https://smartgrow-demo.com) · [📖 Documentación](#documentación) · [🐛 Reportar Bug](https://github.com/momus53/smartgrow/issues) · [💡 Solicitar Feature](https://github.com/momus53/smartgrow/issues)

</div>

---

## 📋 Tabla de Contenidos

- [🎯 Descripción](#-descripción)
- [✨ Características](#-características)
- [🛠️ Tecnologías](#️-tecnologías)
- [📸 Capturas de Pantalla](#-capturas-de-pantalla)
- [🚀 Instalación](#-instalación)
- [⚙️ Configuración](#️-configuración)
- [🎮 Uso](#-uso)
- [📊 API Reference](#-api-reference)
- [🤝 Contribuir](#-contribuir)
- [📄 Licencia](#-licencia)

---

## 🎯 Descripción

**SmartGrow** es un sistema de monitoreo IoT completo diseñado para la agricultura inteligente y el control de ambientes. Permite la recolección, visualización y análisis de datos ambientales en tiempo real mediante sensores conectados a dispositivos ESP32 y otros microcontroladores.

### ¿Para qué sirve?

- 🌿 **Agricultura de precisión**: Monitoreo de cultivos en invernaderos y campos
- 🏠 **Hogares inteligentes**: Control ambiental de espacios domésticos
- 🏭 **Industria**: Supervisión de condiciones en almacenes y fábricas
- 🔬 **Investigación**: Recolección de datos ambientales para estudios científicos

---

## ✨ Características

### 🔄 Monitoreo en Tiempo Real
- Visualización de temperatura y humedad en tiempo real
- Gráficos interactivos con historial de datos
- Alertas automáticas por condiciones críticas
- Dashboard responsivo y moderno

### 📊 Análisis de Datos
- Estadísticas detalladas (promedio, máximo, mínimo)
- Exportación de datos a CSV/JSON
- Tendencias y patrones de comportamiento
- Reportes automáticos

### 🔐 Gestión Segura
- Sistema de autenticación JWT
- Gestión multi-usuario
- Roles y permisos granulares
- Sesiones seguras con cookies

### 🌐 Conectividad IoT
- Soporte para ESP32, Arduino, Raspberry Pi
- API RESTful para integración
- Múltiples dispositivos por usuario
- Auto-registro y detección de dispositivos

### 💡 Control Inteligente
- Control remoto de dispositivos
- Automatización basada en condiciones
- Programación de horarios
- Integración con actuadores

---

## 🛠️ Tecnologías

### Backend
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=flat&logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=flat&logo=mysql&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=flat&logo=jsonwebtokens&logoColor=white)

- **Node.js** v14+ - Runtime de JavaScript
- **Express.js** - Framework web minimalista
- **MySQL** - Base de datos relacional
- **JWT** - Autenticación segura
- **bcrypt** - Encriptación de contraseñas
- **CORS** - Manejo de peticiones cross-origin

### Frontend
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Bootstrap](https://img.shields.io/badge/Bootstrap-7952B3?style=flat&logo=bootstrap&logoColor=white)
![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=flat&logo=chart.js&logoColor=white)

- **HTML5/CSS3** - Estructura y diseño moderno
- **JavaScript ES6+** - Funcionalidad del cliente
- **Bootstrap 5** - Framework CSS responsivo
- **Chart.js** - Gráficos interactivos
- **Bootstrap Icons** - Iconografía

### IoT & Hardware
![ESP32](https://img.shields.io/badge/ESP32-E7352C?style=flat&logo=espressif&logoColor=white)
![Arduino](https://img.shields.io/badge/Arduino-00979D?style=flat&logo=arduino&logoColor=white)

- **ESP32** - Microcontrolador principal
- **DHT22** - Sensor de temperatura y humedad
- **WiFi** - Conectividad inalámbrica
- **HTTP/REST** - Protocolo de comunicación

---

## 📸 Capturas de Pantalla

<div align="center">

### 🏠 Dashboard Principal
![Dashboard](https://via.placeholder.com/800x400/667eea/ffffff?text=Dashboard+Principal)

### 📊 Gráficos en Tiempo Real  
![Gráficos](https://via.placeholder.com/800x400/4facfe/ffffff?text=Gráficos+Interactivos)

### 📱 Diseño Responsivo
![Mobile](https://via.placeholder.com/400x600/f093fb/ffffff?text=Vista+Mobile)

</div>

---

## 🚀 Instalación

### Prerrequisitos

- [Node.js](https://nodejs.org/) v14 o superior
- [MySQL](https://www.mysql.com/) v8.0 o superior
- [Git](https://git-scm.com/)

### 1. Clonar el Repositorio

```bash
git clone https://github.com/momus53/smartgrow.git
cd smartgrow
```

### 2. Configurar Backend

```bash
cd backend
npm install
```

### 3. Configurar Base de Datos

```bash
# Crear base de datos
mysql -u root -p -e "CREATE DATABASE iot_monitor;"

# Importar esquema
mysql -u root -p iot_monitor < database.sql
```

### 4. Variables de Entorno

Crear archivo `.env` en `/backend`:

```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=iot_monitor

# JWT
JWT_SECRET=tu_clave_secreta_muy_segura
JWT_EXPIRES_IN=7d

# Server
PORT=3000
NODE_ENV=development
```

### 5. Ejecutar el Proyecto

```bash
# Desarrollo
npm run dev

# Producción
npm start
```

El servidor estará disponible en `http://localhost:3000`

---

## ⚙️ Configuración

### Configuración de ESP32

```cpp
// Ejemplo básico para ESP32
#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>

const char* ssid = "TU_WIFI";
const char* password = "TU_PASSWORD";
const char* serverURL = "http://tu-servidor.com/api/datos";

DHT dht(2, DHT22);

void setup() {
    Serial.begin(115200);
    dht.begin();
    
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(1000);
        Serial.println("Conectando a WiFi...");
    }
}

void loop() {
    float temp = dht.readTemperature();
    float hum = dht.readHumidity();
    
    // Enviar datos cada 30 segundos
    sendData(temp, hum);
    delay(30000);
}
```

### Configuración de Usuario Admin

```bash
cd backend
node set_admin_password.js
```

---

## 🎮 Uso

### Acceso Web

1. Navega a `http://localhost:3000`
2. Inicia sesión con tus credenciales
3. ¡Comienza a monitorear tus dispositivos!

### Registro de Dispositivos

1. Ve al dashboard
2. Haz clic en el botón "+" en la tarjeta de Dispositivos
3. Completa la información del dispositivo
4. Configura tu ESP32 para enviar datos

### API para Dispositivos IoT

```bash
# Enviar datos de sensores
curl -X POST http://localhost:3000/api/datos \
  -H "Content-Type: application/json" \
  -d '{
    "dispositivo": "ESP32_001",
    "temperatura": 25.5,
    "humedad": 60.2
  }'
```

---

## 📊 API Reference

<details>
<summary><b>🔐 Autenticación</b></summary>

### POST `/auth/login`
Iniciar sesión
```json
{
  "username": "admin",
  "password": "password"
}
```

### POST `/auth/register`
Registrar usuario
```json
{
  "username": "usuario",
  "email": "email@ejemplo.com",
  "password": "password"
}
```

### POST `/auth/logout`
Cerrar sesión

</details>

<details>
<summary><b>📊 Datos</b></summary>

### GET `/api/datos/ultimo`
Obtener último registro

### GET `/api/datos/recientes?limit=50`
Obtener registros recientes

### POST `/api/datos`
Enviar nuevos datos
```json
{
  "dispositivo": "ESP32_001",
  "temperatura": 25.5,
  "humedad": 60.2
}
```

### GET `/api/datos/estadisticas`
Obtener estadísticas

</details>

<details>
<summary><b>🔧 Dispositivos</b></summary>

### GET `/api/dispositivos`
Listar dispositivos del usuario

### POST `/api/dispositivos`
Registrar nuevo dispositivo
```json
{
  "nombre": "Sensor Invernadero",
  "tipo": "ESP32",
  "descripcion": "Sensor principal"
}
```

</details>

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add: amazing feature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

### Guía de Contribución

- Sigue las convenciones de código existentes
- Añade tests para nuevas funcionalidades
- Actualiza la documentación según sea necesario
- Usa commits descriptivos

---

## 📋 Roadmap

- [x] Sistema de autenticación
- [x] Dashboard básico
- [x] API REST
- [x] Soporte ESP32
- [ ] Aplicación móvil
- [ ] Alertas por email/SMS
- [ ] Machine Learning para predicciones
- [ ] Integración con servicios cloud
- [ ] Soporte para más sensores

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

---

## 👨‍💻 Autor

**Molmius** - *Desarrollador Principal*

- GitHub: [@momus53](https://github.com/momus53)
- LinkedIn: [Tu LinkedIn](https://linkedin.com/in/tu-perfil)
- Email: tu-email@ejemplo.com

---

## 🙏 Agradecimientos

- Inspirado en proyectos de agricultura inteligente
- Comunidad de ESP32 y Arduino
- Bootstrap y Chart.js por las herramientas increíbles
- Todos los contribuidores del proyecto

---

<div align="center">

**⭐ ¡Si este proyecto te ha sido útil, considera darle una estrella! ⭐**

[![GitHub stars](https://img.shields.io/github/stars/momus53/smartgrow.svg?style=social&label=Star)](https://github.com/momus53/smartgrow)
[![GitHub forks](https://img.shields.io/github/forks/momus53/smartgrow.svg?style=social&label=Fork)](https://github.com/momus53/smartgrow/fork)

**Hecho con ❤️ para la comunidad IoT**

</div>