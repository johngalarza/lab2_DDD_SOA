require('dotenv').config();
const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();
app.use(express.json());

// Conexion a PostgreSQL
const sequelize = new Sequelize(
    process.env.DATABASE_URL ||
    'postgres://postgres:1234@localhost:5432/empleados_db',
    { dialect: 'postgres', logging: false }
);

// Modelo de Empleado
const Empleado = sequelize.define('Empleado', {
    cedula: { type: DataTypes.STRING(10), unique: true, allowNull: false },
    nombre: { type: DataTypes.STRING, allowNull: false },
    apellido: { type: DataTypes.STRING, allowNull: false },
    cargo: { type: DataTypes.STRING, allowNull: false },
    departamento: { type: DataTypes.STRING, allowNull: false },
    fecha_ingreso: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
    salario_base: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    activo: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'empleados' });

// GET /empleados — listar todos (filtro por departamento opcional)
app.get('/empleados', async (req, res) => {
    const where = {};
    if (req.query.departamento) where.departamento = req.query.departamento;
    res.json(await Empleado.findAll({ where }));
});

// GET /empleados/:id — obtener por ID
app.get('/empleados/:id', async (req, res) => {
    const e = await Empleado.findByPk(req.params.id);
    e ? res.json(e) : res.status(404).json({ error: 'Empleado no encontrado' });
});

// POST /empleados — crear empleado
app.post('/empleados', async (req, res) => {
    const { cedula, nombre, apellido, cargo, departamento, salario_base } = req.body;
    if (!cedula || !nombre || !apellido || !cargo || !departamento || !salario_base)
        return res.status(400).json({
            error: 'Campos requeridos: cedula, nombre, apellido, cargo, departamento, salario_base'
        });
    try {
        const emp = await Empleado.create(req.body);
        res.status(201).json(emp);
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError')
            return res.status(409).json({ error: `Cedula ${cedula} ya registrada` });
        res.status(400).json({ error: err.message });
    }
});

// PUT /empleados/:id — actualizar
app.put('/empleados/:id', async (req, res) => {
    const e = await Empleado.findByPk(req.params.id);
    if (!e) return res.status(404).json({ error: 'Empleado no encontrado' });
    await e.update(req.body);
    res.json(e);
});

// DELETE /empleados/:id — soft delete (marca inactivo)
app.delete('/empleados/:id', async (req, res) => {
    const e = await Empleado.findByPk(req.params.id);
    if (!e) return res.status(404).json({ error: 'Empleado no encontrado' });
    await e.update({ activo: false });
    res.json({ mensaje: `Empleado ${e.nombre} ${e.apellido} desactivado` });
});

app.get('/health', (_, res) => res.json({ servicio: 'empleados', status: 'ok' }));

// Sincronizar modelo y arrancar
const PORT = process.env.PORT || 3001;
sequelize.sync({ alter: true })
    .then(() => app.listen(PORT, () =>
        console.log(`Servicio Empleados en http://localhost:${PORT}`)))
    .catch(err => {
        console.error('Error PostgreSQL:', err.message);
        process.exit(1);
    });
