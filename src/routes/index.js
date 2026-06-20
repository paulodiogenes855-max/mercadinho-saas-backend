// Ficheiro: backend/src/routes/index.js
const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const produtosRoutes = require('./produtos.routes');
const vendasRoutes = require('./vendas.routes');

// Define o prefixo das rotas
router.use('/auth', authRoutes);
router.use('/produtos', produtosRoutes);
router.use('/vendas', vendasRoutes);

module.exports = router;
