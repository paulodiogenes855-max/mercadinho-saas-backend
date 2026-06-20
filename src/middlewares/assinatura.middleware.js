// Ficheiro: backend/src/middlewares/assinatura.middleware.js
const db = require('../config/db');

const verificarAssinatura = async (req, res, next) => {
    try {
        // Pega no ID da loja que foi descoberto pelo tenant.middleware.js
        // Não importa se quem está a usar é o Dono ou o Caixa, a loja é a mesma!
        const { loja_id } = req.tenant;

        // Procura a saúde financeira da loja
        const query = `
            SELECT status_assinatura, vencimento_assinatura 
            FROM lojas 
            WHERE id = $1
        `;
        const result = await db.query(query, [loja_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ erro: 'Loja não encontrada no sistema.' });
        }

        const loja = result.rows[0];
        const dataAtual = new Date();
        const dataVencimento = new Date(loja.vencimento_assinatura);

        // BLOQUEIO GERAL DE INADIMPLÊNCIA
        // Se a assinatura venceu, ninguém (nem Dono, nem Caixas) consegue usar o sistema (ex: registar vendas).
        if (loja.status_assinatura === 'VENCIDA' || dataVencimento < dataAtual) {
            
            // Se já passou da data mas o banco ainda dizia "ATIVA" ou "TRIAL", forçamos a atualização para "VENCIDA"
            if (loja.status_assinatura !== 'VENCIDA') {
                await db.query(`UPDATE lojas SET status_assinatura = 'VENCIDA' WHERE id = $1`, [loja_id]);
            }

            return res.status(402).json({ 
                erro: 'Assinatura vencida.',
                mensagem: 'O período de teste ou assinatura expirou. Apenas o Dono pode regularizar o pagamento para reativar o sistema.',
                redirecionar_pagamento: true
            });
        }

        // Tudo pago! O sistema está livre para o Dono e para os Funcionários.
        next();
    } catch (error) {
        console.error('❌ [Assinatura] Erro ao verificar estado da assinatura:', error);
        return res.status(500).json({ erro: 'Erro interno ao validar estado da loja.' });
    }
};

module.exports = { verificarAssinatura };