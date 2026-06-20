// Arquivo: backend/src/config/db.js
const { Pool } = require('pg');

// O Pool gerencia múltiplas conexões simultâneas com o banco.
// Ele puxa as credenciais das variáveis de ambiente (process.env)
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'mercadinho',
    password: process.env.DB_PASSWORD || 'sua_senha_aqui',
    port: process.env.DB_PORT || 5432,
});

// Monitora erros críticos na conexão (ex: se o banco cair)
pool.on('error', (err, client) => {
    console.error('❌ [DB] Erro crítico no banco de dados:', err);
    process.exit(-1);
});

// Teste inicial de conexão ao iniciar o arquivo
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ [DB] Falha ao conectar no PostgreSQL. Verifique as credenciais.');
    } else {
        console.log('✅ [DB] Conectado com sucesso ao PostgreSQL local!');
    }
});

module.exports = {
    // Exportamos a função 'query' para usarmos diretamente nos nossos Controllers
    query: (text, params) => pool.query(text, params),
    pool // Exportamos o pool inteiro caso seja necessário
};
