// Ficheiro: backend/src/routes/auth.routes.js
const express = require('express');
const authController = require('../controllers/auth.controller');

// Importamos os nossos "porteiros"
const { verificarToken } = require('../middlewares/auth.middleware');
const { identificarTenant } = require('../middlewares/tenant.middleware');
const { verificarAssinatura } = require('../middlewares/assinatura.middleware');

const router = express.Router();

// ==========================================
// ROTA 1: Registo (Onboarding)
// ==========================================
// Protegida APENAS pelo verificarToken.
// Não podemos usar o identificarTenant aqui porque a loja ainda não existe!
router.post('/registar', verificarToken, authController.registarLojaEDono);

// ==========================================
// ROTA 2: Login
// ==========================================
// Aqui o utilizador já existe. Passa pelo Firebase, identifica o Tenant (loja_id) 
// e verifica se a mensalidade está paga.
router.post('/login', verificarToken, identificarTenant, verificarAssinatura, authController.login);

module.exports = router;