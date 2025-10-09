const express = require('express');

module.exports = function (db, autenticarToken) {
    const router = express.Router();

    // Obtener todos los dispositivos del usuario autenticado
    router.get('/', autenticarToken, (req, res) => {
        const userId = req.user.id;

        const query = `
            SELECT 
                id, 
                nombre, 
                tipo, 
                identificador_unico, 
                descripcion, 
                ubicacion, 
                estado, 
                fecha_registro, 
                ultima_conexion,
                configuracion,
                activo
            FROM dispositivos 
            WHERE usuario_id = ? AND activo = TRUE 
            ORDER BY fecha_registro DESC
        `;

        db.query(query, [userId], (err, rows) => {
            if (err) {
                console.error('[dispositivos] Error obteniendo dispositivos:', err);
                return res.status(500).json({ error: 'Error del servidor' });
            }

            // Parsear configuracion JSON si existe
            const dispositivos = rows.map(device => ({
                ...device,
                configuracion: device.configuracion ? JSON.parse(device.configuracion) : null
            }));
            res.json(dispositivos);
        });
    });

    // Obtener un dispositivo específico del usuario
    router.get('/:id', autenticarToken, (req, res) => {
        const userId = req.user.id;
        const deviceId = req.params.id;

        const query = `
            SELECT 
                id, 
                nombre, 
                tipo, 
                identificador_unico, 
                descripcion, 
                ubicacion, 
                estado, 
                fecha_registro, 
                ultima_conexion,
                configuracion,
                activo
            FROM dispositivos 
            WHERE id = ? AND usuario_id = ? AND activo = TRUE
        `;

        db.query(query, [deviceId, userId], (err, rows) => {
            if (err) {
                console.error('[dispositivos] Error obteniendo dispositivo:', err);
                return res.status(500).json({ error: 'Error del servidor' });
            }

            if (!rows || rows.length === 0) {
                return res.status(404).json({ error: 'Dispositivo no encontrado' });
            }

            const device = rows[0];
            device.configuracion = device.configuracion ? JSON.parse(device.configuracion) : null;

            res.json(device);
        });
    });

    // Crear nuevo dispositivo
    router.post('/', autenticarToken, (req, res) => {
        const userId = req.user.id;
        const {
            nombre,
            tipo = 'ESP32',
            identificador_unico,
            descripcion,
            ubicacion,
            configuracion
        } = req.body;

        console.log('[dispositivos] POST / - creando dispositivo para usuario:', userId);

        if (!nombre) {
            return res.status(400).json({ error: 'El nombre del dispositivo es requerido' });
        }

        // Verificar que el identificador único no exista (si se proporciona)
        if (identificador_unico) {
            const checkQuery = 'SELECT id FROM dispositivos WHERE identificador_unico = ?';
            db.query(checkQuery, [identificador_unico], (err, existing) => {
                if (err) {
                    console.error('[dispositivos] Error verificando identificador único:', err);
                    return res.status(500).json({ error: 'Error del servidor' });
                }

                if (existing && existing.length > 0) {
                    return res.status(409).json({ error: 'Ya existe un dispositivo con ese identificador' });
                }

                // Continuar con la inserción
                insertDevice();
            });
        } else {
            insertDevice();
        }

        function insertDevice() {
            const insertQuery = `
                INSERT INTO dispositivos 
                (usuario_id, nombre, tipo, identificador_unico, descripcion, ubicacion, configuracion, estado)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'inactivo')
            `;

            const configJson = configuracion ? JSON.stringify(configuracion) : null;

            db.query(insertQuery, [
                userId,
                nombre,
                tipo,
                identificador_unico || null,
                descripcion || null,
                ubicacion || null,
                configJson
            ], (err, result) => {
                if (err) {
                    console.error('[dispositivos] Error creando dispositivo:', err);
                    return res.status(500).json({ error: 'Error creando dispositivo' });
                }

                console.log('[dispositivos] Dispositivo creado con ID:', result.insertId);

                // Devolver el dispositivo creado
                res.status(201).json({
                    success: true,
                    id: result.insertId,
                    nombre,
                    tipo,
                    identificador_unico,
                    descripcion,
                    ubicacion,
                    estado: 'inactivo',
                    fecha_registro: new Date().toISOString(),
                    configuracion
                });
            });
        }
    });

    // Actualizar dispositivo
    router.put('/:id', autenticarToken, (req, res) => {
        const userId = req.user.id;
        const deviceId = req.params.id;
        const {
            nombre,
            tipo,
            identificador_unico,
            descripcion,
            ubicacion,
            estado,
            configuracion
        } = req.body;

        console.log('[dispositivos] PUT /:id - actualizando dispositivo', deviceId, 'para usuario:', userId);

        // Verificar que el dispositivo pertenece al usuario
        const checkOwnerQuery = 'SELECT id FROM dispositivos WHERE id = ? AND usuario_id = ? AND activo = TRUE';
        
        db.query(checkOwnerQuery, [deviceId, userId], (err, rows) => {
            if (err) {
                console.error('[dispositivos] Error verificando propiedad:', err);
                return res.status(500).json({ error: 'Error del servidor' });
            }

            if (!rows || rows.length === 0) {
                return res.status(404).json({ error: 'Dispositivo no encontrado' });
            }

            // Construir query de actualización dinámicamente
            const updates = [];
            const values = [];

            if (nombre !== undefined) {
                updates.push('nombre = ?');
                values.push(nombre);
            }
            if (tipo !== undefined) {
                updates.push('tipo = ?');
                values.push(tipo);
            }
            if (identificador_unico !== undefined) {
                updates.push('identificador_unico = ?');
                values.push(identificador_unico);
            }
            if (descripcion !== undefined) {
                updates.push('descripcion = ?');
                values.push(descripcion);
            }
            if (ubicacion !== undefined) {
                updates.push('ubicacion = ?');
                values.push(ubicacion);
            }
            if (estado !== undefined) {
                updates.push('estado = ?');
                values.push(estado);
            }
            if (configuracion !== undefined) {
                updates.push('configuracion = ?');
                values.push(JSON.stringify(configuracion));
            }

            if (updates.length === 0) {
                return res.status(400).json({ error: 'No hay campos para actualizar' });
            }

            values.push(deviceId);
            const updateQuery = `UPDATE dispositivos SET ${updates.join(', ')} WHERE id = ?`;

            db.query(updateQuery, values, (err, result) => {
                if (err) {
                    console.error('[dispositivos] Error actualizando dispositivo:', err);
                    return res.status(500).json({ error: 'Error actualizando dispositivo' });
                }

                if (result.affectedRows === 0) {
                    return res.status(404).json({ error: 'Dispositivo no encontrado' });
                }

                console.log('[dispositivos] Dispositivo actualizado exitosamente');
                res.json({ success: true, message: 'Dispositivo actualizado correctamente' });
            });
        });
    });

    // Eliminar dispositivo (soft delete)
    router.delete('/:id', autenticarToken, (req, res) => {
        const userId = req.user.id;
        const deviceId = req.params.id;

        console.log('[dispositivos] DELETE /:id - eliminando dispositivo', deviceId, 'para usuario:', userId);

        const deleteQuery = `
            UPDATE dispositivos 
            SET activo = FALSE 
            WHERE id = ? AND usuario_id = ?
        `;

        db.query(deleteQuery, [deviceId, userId], (err, result) => {
            if (err) {
                console.error('[dispositivos] Error eliminando dispositivo:', err);
                return res.status(500).json({ error: 'Error del servidor' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Dispositivo no encontrado' });
            }

            console.log('[dispositivos] Dispositivo eliminado exitosamente');
            res.json({ success: true, message: 'Dispositivo eliminado correctamente' });
        });
    });

    // Actualizar estado de conexión del dispositivo (para uso por dispositivos IoT)
    router.patch('/:id/estado', autenticarToken, (req, res) => {
        const userId = req.user.id;
        const deviceId = req.params.id;
        const { estado } = req.body;

        if (!estado || !['activo', 'inactivo', 'error'].includes(estado)) {
            return res.status(400).json({ error: 'Estado inválido' });
        }

        const updateQuery = `
            UPDATE dispositivos 
            SET estado = ?, ultima_conexion = CURRENT_TIMESTAMP 
            WHERE id = ? AND usuario_id = ?
        `;

        db.query(updateQuery, [estado, deviceId, userId], (err, result) => {
            if (err) {
                console.error('[dispositivos] Error actualizando estado:', err);
                return res.status(500).json({ error: 'Error del servidor' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Dispositivo no encontrado' });
            }

            res.json({ success: true, message: 'Estado actualizado correctamente' });
        });
    });

    return router;
};