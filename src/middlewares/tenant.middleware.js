// Ficheiro: backend/src/middlewares/tenant.middleware.js
const db = require('../config/db');

const identificarTenant = async (req, res, next) => {
    try {
        // O uid que veio do auth.middleware.js
        const firebaseUid = req.user.uid;

        // Vamos à base de dados ver quem é este utilizador e a qual loja pertence.
        // A coluna "perfil" vai dizer se ele é 'DONO', 'CAIXA' ou 'ESTOQUISTA'.
        const query = `
            SELECT id, loja_id, perfil, ativo 
            FROM usuarios 
            WHERE firebase_uid = $1
        `;
        const result = await db.query(query, [firebaseUid]);

        if (result.rows.length === 0) {
            return res.status(403).json({ erro: 'Utilizador não encontrado no sistema do mercado.' });
        }

        const utilizadorDb = result.rows[0];

        // Se o Dono tiver demitido ou bloqueado este Caixa, ele não entra!
        if (!utilizadorDb.ativo) {
            return res.status(403).json({ erro: 'Acesso bloqueado. Conta de utilizador inativa ou suspensa pelo administrador.' });
        }

        // 🌟 A MÁGICA DA HIERARQUIA ACONTECE AQUI 🌟
        // Injetamos o "tenant" (loja) e o "perfil" na requisição.
        // Assim, quando o Caixa fizer uma venda, o sistema regista automaticamente na loja do Dono (loja_id).
        req.tenant = {
            usuario_id: utilizadorDb.id,     // ID único deste utilizador (Filho ou Pai)
            loja_id: utilizadorDb.loja_id,   // ID da Loja (Agrupa o Pai e todos os Filhos)
            perfil: utilizadorDb.perfil      // 'DONO', 'CAIXA', 'ESTOQUISTA' (Pode ser usado depois para bloquear ações)
        };

        next();
    } catch (error) {
        console.error('❌ [Tenant] Erro ao identificar a loja do utilizador:', error);
        return res.status(500).json({ erro: 'Erro interno ao identificar permissões do utilizador.' });
    }
};

module.exports = { identificarTenant };