// Arquivo: backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./src/routes');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// Middlewares Globais
// ==========================================

// Permite que o frontend React faça requisições ao backend (essencial para o modelo Single-Server)
app.use(cors()); 

// Configura o Express para interpretar corpos de requisições em formato JSON
app.use(express.json());

// ==========================================
// Rotas Globais e Infraestrutura
// ==========================================

// Rota de Health Check (Verificação de Saúde do Servidor)
// Essencial para monitorização na Google Cloud Compute Engine (GCE)
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        mensagem: 'Servidor do Meu Mercadinho SaaS a correr perfeitamente.',
        timestamp: new Date().toISOString()
    });
});

// ==========================================
// Integração do Fluxo de Rotas (API)
// ==========================================

// Vincula todas as rotas internas (auth, produtos, vendas) sob o prefixo /api
app.use('/api', routes);

// ==========================================
// Inicialização do Servidor
// ==========================================

app.listen(PORT, () => {
    console.log(`🚀 [Backend] Servidor ativo e a ouvir na porta ${PORT}`);
    console.log(`🔧 [Backend] Ambiente atual: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 [Backend] URL local: http://localhost:${PORT}`);
});