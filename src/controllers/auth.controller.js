// Ficheiro: backend/src/controllers/auth.controller.js
const db = require('../config/db');

// ==========================================
// LOGIN: Verifica se quem logou no Google já tem loja
// ==========================================
async function login(req, res) {
    try {
        // req.user foi injetado pelo nosso middleware (auth.middleware.js)
        const { uid, email, nome } = req.user;

        // Vamos à base de dados PostgreSQL verificar se o utilizador e a loja existem
        const query = `
            SELECT u.id as usuario_id, u.nome, u.email, u.funcao, 
                   l.id as loja_id, l.nome_fantasia, l.status_assinatura
            FROM usuarios u
            JOIN lojas l ON u.loja_id = l.id
            WHERE u.firebase_uid = $1
        `;
        
        const { rows } = await db.query(query, [uid]);

        // Se não encontrar nada, significa que é o primeiro acesso (Onboarding)
        if (rows.length === 0) {
            return res.status(404).json({ 
                registado: false,
                mensagem: 'Conta validada com sucesso, mas ainda não tem um mercadinho registado. Por favor, crie a sua loja.' 
            });
        }

        const dadosUsuario = rows[0];

        // Se encontrar, devolvemos os dados completos para o Frontend montar o Dashboard
        return res.status(200).json({
            registado: true,
            usuario: {
                id: dadosUsuario.usuario_id,
                nome: dadosUsuario.nome,
                email: dadosUsuario.email,
                funcao: dadosUsuario.funcao
            },
            loja: {
                id: dadosUsuario.loja_id,
                nome: dadosUsuario.nome_fantasia,
                status_assinatura: dadosUsuario.status_assinatura
            }
        });

    } catch (error) {
        console.error('❌ [Auth Controller] Erro no login:', error);
        return res.status(500).json({ error: 'Erro interno ao processar o login.' });
    }
}

// ==========================================
// REGISTO: Cria a loja e o dono no primeiro acesso
// ==========================================
async function registarLojaEDono(req, res) {
    const clienteDB = await db.pool.connect();
    
    try {
        const { uid, email, nome } = req.user; // Dados do Google
        const { nome_fantasia, cnpj, telefone } = req.body; // Dados do formulário do frontend

        // Inicia uma transação (se algo falhar, cancela tudo para não criar dados pela metade)
        await clienteDB.query('BEGIN');

        // 1. Cria a loja
        const queryLoja = `
            INSERT INTO lojas (nome_fantasia, cnpj, telefone, status_assinatura)
            VALUES ($1, $2, $3, 'TRIAL')
            RETURNING id;
        `;
        const resLoja = await clienteDB.query(queryLoja, [nome_fantasia, cnpj, telefone]);
        const lojaId = resLoja.rows[0].id;

        // 2. Cria o utilizador como DONO associado a essa loja
        const queryUsuario = `
            INSERT INTO usuarios (firebase_uid, loja_id, nome, email, funcao)
            VALUES ($1, $2, $3, $4, 'DONO')
            RETURNING id;
        `;
        await clienteDB.query(queryUsuario, [uid, lojaId, nome, email]);

        // Confirma a gravação na base de dados
        await clienteDB.query('COMMIT');

        return res.status(201).json({ 
            mensagem: 'Loja e conta criadas com sucesso!',
            loja_id: lojaId
        });

    } catch (error) {
        // Em caso de erro (ex: CNPJ duplicado), reverte tudo
        await clienteDB.query('ROLLBACK');
        console.error('❌ [Auth Controller] Erro ao registar loja:', error);
        return res.status(500).json({ error: 'Erro ao criar a sua conta e loja.' });
    } finally {
        // Liberta a ligação para o próximo utilizador
        clienteDB.release();
    }
}

module.exports = {
    login,
    registarLojaEDono
};