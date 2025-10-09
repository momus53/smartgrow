-- Migración: Agregar campos de humedad y temperatura a dispositivos
-- Fecha: 2025-10-09

USE iot_monitor;

-- Agregar columnas para sensores de humedad y temperatura
ALTER TABLE dispositivos 
ADD COLUMN humedad_actual DECIMAL(5,2) DEFAULT NULL COMMENT 'Humedad actual en porcentaje (0-100%)',
ADD COLUMN temperatura_actual DECIMAL(5,2) DEFAULT NULL COMMENT 'Temperatura actual en grados Celsius',
ADD COLUMN fecha_ultima_lectura TIMESTAMP NULL DEFAULT NULL COMMENT 'Fecha de la última lectura de sensores';

-- Opcional: Agregar índices para mejorar rendimiento en consultas
ALTER TABLE dispositivos 
ADD INDEX idx_fecha_ultima_lectura (fecha_ultima_lectura),
ADD INDEX idx_estado_activo (estado, activo);

-- Verificar la estructura actualizada
DESCRIBE dispositivos;

-- Mostrar dispositivos existentes
SELECT id, nombre, tipo, estado, humedad_actual, temperatura_actual, fecha_ultima_lectura 
FROM dispositivos 
ORDER BY usuario_id, fecha_registro DESC;