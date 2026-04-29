require('dotenv').config();
const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();
app.use(express.json());

const sequelize = new Sequelize(
    process.env.DATABASE_URL ||
    'postgres://postgres:1234@localhost:5432/nomina_db',
    { dialect: 'postgres', logging: false }
);

const Nomina = sequelize.define('Nomina', {
    empleado_id: { type: DataTypes.INTEGER, allowNull: false },
    periodo: { type: DataTypes.STRING(7), allowNull: false }, // YYYY-MM
    salario_base: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    horas_extra: { type: DataTypes.INTEGER, defaultValue: 0 },
    valor_hora_extra: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    bono: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    descuentos: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    neto: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
}, {
    tableName: 'nominas',
    indexes: [{ unique: true, fields: ['empleado_id', 'periodo'] }]
});

// POST /nomina/calcular — calcula y guarda el rol de pago
app.post('/nomina/calcular', async (req, res) => {
    const {
        empleado_id, periodo, salario_base,
        horas_extra = 0, bono = 0, descuentos = 0
    } = req.body;

    if (!empleado_id || !periodo || !salario_base)
        return res.status(400).json({
            error: 'Requeridos: empleado_id, periodo (YYYY-MM), salario_base'
        });

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo))
        return res.status(400).json({ error: 'Formato de periodo invalido. Use YYYY-MM' });

    // Calculo: hora extra = (salario / 240) * 1.5
    const valor_hora_extra = parseFloat((salario_base / 240 * 1.5).toFixed(2));
    const neto = parseFloat((
        parseFloat(salario_base) +
        (horas_extra * valor_hora_extra) +
        parseFloat(bono) -
        parseFloat(descuentos)
    ).toFixed(2));

    try {
        const registro = await Nomina.create({
            empleado_id, periodo, salario_base,
            horas_extra, valor_hora_extra, bono, descuentos, neto
        });
        res.status(201).json({
            ...registro.toJSON(),
            resumen: {
                salario_base: parseFloat(salario_base),
                extras: parseFloat((horas_extra * valor_hora_extra).toFixed(2)),
                bono: parseFloat(bono),
                descuentos: parseFloat(descuentos),
                neto_a_pagar: neto
            }
        });
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError')
            return res.status(409).json({
                error: `Ya existe nomina para empleado ${empleado_id} en ${periodo}`
            });
        res.status(400).json({ error: err.message });
    }
});

// GET /nomina/:empleado_id — historial de un empleado
app.get('/nomina/:empleado_id', async (req, res) => {
    const registros = await Nomina.findAll({
        where: { empleado_id: req.params.empleado_id },
        order: [['periodo', 'DESC']]
    });
    res.json(registros);
});

// GET /nomina/:empleado_id/:periodo — rol de pago especifico
app.get('/nomina/:empleado_id/:periodo', async (req, res) => {
    const n = await Nomina.findOne({
        where: { empleado_id: req.params.empleado_id, periodo: req.params.periodo }
    });
    n ? res.json(n) : res.status(404).json({ error: 'Registro no encontrado' });
});

app.get('/health', (_, res) => res.json({ servicio: 'nomina', status: 'ok' }));

const PORT = process.env.PORT || 3002;
sequelize.sync({ alter: true })
    .then(() => app.listen(PORT, () =>
        console.log(`Servicio Nomina en http://localhost:${PORT}`)))
    .catch(err => { console.error('Error PostgreSQL:', err.message); process.exit(1); });
