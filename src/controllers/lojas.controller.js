// Ficheiro: backend/src/controllers/lojas.controller.js
const db = require('../config/db');
const { MercadoPagoConfig, Preference } = require('mercadopago');

// Puxa a chave real que você acabou de colocar lá no Render!
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || 'TEST-token-provisorio' });

const criarLoja = async (req, res) => {
    try {
        const { nome_loja, tamanho_equipe, plano_escolhido, metodo_pagamento } = req.body;
        const dono_uid = req.usuario.uid;

        // 1. Criar a Loja no banco de dados com status PENDENTE
        const lojaResult = await db.query(`
            INSERT INTO lojas (nome_loja, plano, status_assinatura)
            VALUES ($1, $2, 'PENDENTE')
            RETURNING id;
        `, [nome_loja, plano_escolhido]);
        
        const lojaId = lojaResult.rows[0].id;

        // 2. Define o preço com base no plano escolhido
        const valorPlano = plano_escolhido === 'ANUAL' ? 479.00 : 49.90;

        // 3. Criar o pedido de pagamento no Mercado Pago
        const preference = new Preference(client);
        
        const respostaMP = await preference.create({
            body: {
                items: [
                    {
                        id: 'assinatura_' + plano_escolhido.toLowerCase(),
                        title: `Meu Mercadinho - Plano ${plano_escolhido}`,
                        quantity: 1,
                        unit_price: valorPlano
                    }
                ],
                // O SEGREDO: Enviamos o ID da loja para o Mercado Pago saber quem pagou!
                external_reference: lojaId.toString(),
                
                // Para onde o cliente volta depois de pagar
                back_urls: {
                    success: "https://seusite.vercel.app/dashboard", // Depois você troca pelo link real da sua Vercel
                    failure: "https://seusite.vercel.app/cadastro",
                    pending: "https://seusite.vercel.app/dashboard"
                },
                auto_return: "approved",
            }
        });

        console.log(`✅ [Loja] Nova loja: ${nome_loja}. Link gerado!`);

        // 4. Devolve o link do Checkout Pro para o Frontend
        return res.status(201).json({ 
            mensagem: "Loja criada! Redirecionando para o pagamento...", 
            url_pagamento: respostaMP.init_point 
        });

    } catch (error) {
        console.error("❌ [Erro] Falha ao criar loja ou gerar pagamento:", error);
        return res.status(500).json({ erro: "Erro interno ao gerar o pagamento." });
    }
};

module.exports = {
    criarLoja
};