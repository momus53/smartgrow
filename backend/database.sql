CREATE DATABASE iot_monitor;
USE iot_monitor;

CREATE TABLE datos_sensores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dispositivo VARCHAR(50),
    temperatura FLOAT,
    humedad FLOAT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);