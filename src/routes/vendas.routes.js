// Arquivo: vendas.routes.js
// Ficheiro: backend/src/routes/vendas.routes.js
const express = require('express');
const vendasController = require('../controllers/vendas.controller');

// Importamos os Porteiros de Segurança
const { verificarToken } = require('../middlewares/auth.middleware');
const { identificarTenant } = require('../middlewares/tenant.middleware');
const { verificarAssinatura } = require('../middlewares/assinatura.middleware');

const router = express.Router();

// Aplica a segurança máxima a todas as rotas de vendas
router.use(verificarToken, identificarTenant, verificarAssinatura);

// Rota para o momento do checkout (PDV)
router.post('/', vendasController.registarVenda);

// Rota para o Dono ver as vendas recentes no Dashboard
router.get('/', vendasController.listarVendas);

module.exports = router;