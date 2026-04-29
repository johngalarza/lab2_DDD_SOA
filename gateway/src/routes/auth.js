const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Usuarios de demo — en produccion usar base de datos
const USUARIOS = [
    { id: 1, usuario: 'admin', password: '1234', rol: 'admin' },
    { id: 2, usuario: 'rrhh', password: '1234', rol: 'rrhh' },
];

router.post('/', (req, res) => {
    const { usuario, password } = req.body;
    const user = USUARIOS.find(
        u => u.usuario === usuario && u.password === password
    );
    if (!user)
        return res.status(401).json({ error: 'Credenciales invalidas' });

    const token = jwt.sign(
        { id: user.id, usuario: user.usuario, rol: user.rol },
        process.env.JWT_SECRET || 'secreto_dev',
        { expiresIn: '8h' }
    );
    res.json({ token, usuario: user.usuario, rol: user.rol });
});

module.exports = router;
