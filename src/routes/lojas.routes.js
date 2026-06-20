// Ficheiro: backend/src/routes/lojas.routes.js
const express = require('express');
const router = express.Router();
const { criarLoja } = require('../controllers/lojas.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

// Quando alguém fizer um POST para /api/lojas, ele primeiro verifica o token do Firebase, e depois cria a loja
router.post('/', verificarToken, criarLoja);

module.exports = router;