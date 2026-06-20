// Ficheiro: backend/src/routes/index.js
const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Importamos a ligação ao banco de dados

const authRoutes = require('./auth.routes');
const produtosRoutes = require('./produtos.routes');
const vendasRoutes = require('./vendas.routes');
const lojasRoutes = require('./lojas.routes');

// ROTA MÁGICA PARA CRIAR AS TABELAS NO BANCO DE DADOS
router.get('/setup-banco', async (req, res) => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS lojas (
                id SERIAL PRIMARY KEY,
                nome_loja VARCHAR(255) NOT NULL,
                plano VARCHAR(50),
                status_assinatura VARCHAR(50) DEFAULT 'PENDENTE',
                vencimento_assinatura DATE,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                firebase_uid VARCHAR(255) UNIQUE NOT NULL,
                loja_id INTEGER REFERENCES lojas(id),
                role VARCHAR(50) DEFAULT 'DONO',
                nome VARCHAR(255),
                email VARCHAR(255),
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        res.status(200).send("<h1>✅ Tabelas 'lojas' e 'usuarios' criadas com sucesso!</h1><p>Já pode testar o pagamento.</p>");
    } catch (error) {
        console.error("Erro no setup:", error);
        res.status(500).send("<h1>❌ Erro ao criar tabelas:</h1><p>" + error.message + "</p>");
    }
});

// Define o prefixo das rotas normais
router.use('/auth', authRoutes);
router.use('/produtos', produtosRoutes);
router.use('/vendas', vendasRoutes);
router.use('/lojas', lojasRoutes); 

module.exports = router;