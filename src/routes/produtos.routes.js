// Arquivo: produtos.routes.js
// Arquivo: backend/src/routes/produtos.routes.js
const express = require('express');
const produtosController = require('../controllers/produtos.controller');

// Nossos Porteiros
const { verificarToken } = require('../middlewares/auth.middleware');
const { identificarTenant } = require('../middlewares/tenant.middleware');
const { verificarAssinatura } = require('../middlewares/assinatura.middleware');

const router = express.Router();

// Aplica todos os porteiros de segurança a TODAS as rotas de produtos.
// Nenhum hacker acessa, ninguém sem loja acessa, e ninguém inadimplente acessa.
router.use(verificarToken, identificarTenant, verificarAssinatura);

// Definição das rotas
router.post('/', produtosController.adicionarProduto);
router.get('/', produtosController.listarProdutos);

// Rota específica para a carga pesada (A planilha)
router.post('/importar', produtosController.importarProdutosCSV);

module.exports = router;