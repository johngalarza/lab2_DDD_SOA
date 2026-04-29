require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

// Modelo Vacante
const Vacante = mongoose.model('Vacante', new mongoose.Schema({
    titulo: { type: String, required: true },
    descripcion: String,
    requisitos: [String],
    salario: Number,
    estado: { type: String, enum: ['abierta', 'cerrada', 'pausada'], default: 'abierta' },
}, { timestamps: true }));

// Modelo Candidato
const Candidato = mongoose.model('Candidato', new mongoose.Schema({
    nombre: { type: String, required: true },
    apellido: { type: String, required: true },
    email: { type: String, required: true },
    vacante_id: { type: mongoose.Types.ObjectId, ref: 'Vacante', required: true },
    estado: {
        type: String,
        enum: ['recibido', 'en_revision', 'entrevista', 'aprobado', 'rechazado'],
        default: 'recibido'
    },
    cv_url: String,
    notas: String,
}, { timestamps: true }));

// ---- VACANTES ----
app.get('/reclutamiento/vacantes', async (req, res) => {
    const filter = {};
    if (req.query.estado) filter.estado = req.query.estado;
    res.json(await Vacante.find(filter).sort({ createdAt: -1 }));
});

app.get('/reclutamiento/vacantes/:id', async (req, res) => {
    try {
        const v = await Vacante.findById(req.params.id);
        v ? res.json(v) : res.status(404).json({ error: 'Vacante no encontrada' });
    } catch { res.status(400).json({ error: 'ID invalido' }); }
});

app.post('/reclutamiento/vacantes', async (req, res) => {
    if (!req.body.titulo)
        return res.status(400).json({ error: 'El campo titulo es requerido' });
    try { res.status(201).json(await Vacante.create(req.body)); }
    catch (err) { res.status(400).json({ error: err.message }); }
});

app.put('/reclutamiento/vacantes/:id', async (req, res) => {
    try {
        const v = await Vacante.findByIdAndUpdate(
            req.params.id, req.body, { new: true, runValidators: true }
        );
        v ? res.json(v) : res.status(404).json({ error: 'Vacante no encontrada' });
    } catch (err) { res.status(400).json({ error: err.message }); }
});

// ---- CANDIDATOS ----
app.get('/reclutamiento/candidatos', async (req, res) => {
    const filter = {};
    if (req.query.vacante_id) filter.vacante_id = req.query.vacante_id;
    if (req.query.estado) filter.estado = req.query.estado;
    res.json(await Candidato.find(filter)
        .populate('vacante_id', 'titulo').sort({ createdAt: -1 }));
});

app.post('/reclutamiento/candidatos', async (req, res) => {
    const { nombre, apellido, email, vacante_id } = req.body;
    if (!nombre || !apellido || !email || !vacante_id)
        return res.status(400).json({
            error: 'Requeridos: nombre, apellido, email, vacante_id'
        });
    try { res.status(201).json(await Candidato.create(req.body)); }
    catch (err) { res.status(400).json({ error: err.message }); }
});

app.put('/reclutamiento/candidatos/:id/estado', async (req, res) => {
    const validos = ['recibido', 'en_revision', 'entrevista', 'aprobado', 'rechazado'];
    if (!validos.includes(req.body.estado))
        return res.status(400).json({ error: `Estado invalido. Opciones: ${validos.join(', ')}` });
    try {
        const c = await Candidato.findByIdAndUpdate(
            req.params.id,
            { estado: req.body.estado, notas: req.body.notas },
            { new: true }
        );
        c ? res.json(c) : res.status(404).json({ error: 'Candidato no encontrado' });
    } catch { res.status(400).json({ error: 'ID invalido' }); }
});

app.get('/health', (_, res) => res.json({ servicio: 'reclutamiento', status: 'ok' }));

const PORT = process.env.PORT || 3003;
const MONGO = process.env.MONGO_URL || 'mongodb://localhost:27017/reclutamiento_db';

mongoose.connect(MONGO)
    .then(() => app.listen(PORT, () =>
        console.log(`Servicio Reclutamiento en http://localhost:${PORT}`)))
    .catch(err => { console.error('Error MongoDB:', err.message); process.exit(1); });
