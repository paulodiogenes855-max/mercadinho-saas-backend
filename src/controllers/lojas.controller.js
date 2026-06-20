// Arquivo: lojas.controller.js
// Ficheiro: backend/src/controllers/lojas.controller.js
const db = require('../config/db');

const criarLoja = async (req, res) => {
    try {
        const { nome_loja, tamanho_equipe, plano_escolhido, metodo_pagamento } = req.body;
        
        // Como o frontend já logou no Firebase e mandou o Token, 
        // o nosso middleware já colocou o UID do usuário aqui:
        const dono_uid = req.usuario.uid;

        // 1. Criar a Loja no banco de dados com status PENDENTE
        const lojaResult = await db.query(`
            INSERT INTO lojas (nome_loja, plano, status_assinatura)
            VALUES ($1, $2, 'PENDENTE')
            RETURNING id;
        `, [nome_loja, plano_escolhido]);
        
        const lojaId = lojaResult.rows[0].id;

        // 2. Opcional: Se você tiver uma tabela de 'usuarios', você pode vincular o dono à loja aqui
        // await db.query(`INSERT INTO usuarios (firebase_uid, loja_id, role) VALUES ($1, $2, 'DONO');`, [dono_uid, lojaId]);

        console.log(`✅ [Loja] Nova loja criada: ${nome_loja} (ID: ${lojaId})`);

        // Responde ao frontend dizendo que deu tudo certo!
        return res.status(201).json({ 
            mensagem: "Loja criada com sucesso!", 
            loja_id: lojaId 
        });

    } catch (error) {
        console.error("❌ [Erro] Falha ao criar loja:", error);
        return res.status(500).json({ erro: "Erro interno ao criar a loja." });
    }
};

module.exports = {
    criarLoja
};