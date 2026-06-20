// Ficheiro: backend/src/controllers/lojas.controller.js
const db = require('../config/db');
// Importa o Mercado Pago
const { MercadoPagoConfig, Preference } = require('mercadopago');

// Configura o Mercado Pago com o seu Token (que colocou no Render)
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || 'TEST-token-provisorio' });

const criarLoja = async (req, res) => {
    try {
        const { nome_loja, tamanho_equipe, plano_escolhido, metodo_pagamento } = req.body;
        const dono_uid = req.usuario.uid;

        // 1. Criar a Loja PENDENTE no banco de dados
        const lojaResult = await db.query(`
            INSERT INTO lojas (nome_loja, plano, status_assinatura)
            VALUES ($1, $2, 'PENDENTE')
            RETURNING id;
        `, [nome_loja, plano_escolhido]);
        
        const lojaId = lojaResult.rows[0].id;

        // 2. Definir o preço com base no plano escolhido
        const valorPlano = plano_escolhido === 'ANUAL' ? 479.00 : 49.90;

        // 3. Criar a Preferência (O pedido de pagamento) no Mercado Pago
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
                // O SEGREDO: Mandamos o ID da loja escondido para o Mercado Pago nos devolver no Webhook!
                external_reference: lojaId.toString(),
                
                // Para onde o cliente volta depois de pagar (Pode colocar a URL real da sua Vercel aqui depois)
                back_urls: {
                    success: "https://seusite.vercel.app/dashboard",
                    failure: "https://seusite.vercel.app/cadastro",
                    pending: "https://seusite.vercel.app/dashboard"
                },
                auto_return: "approved",
            }
        });

        console.log(`✅ [Loja] Nova loja: ${nome_loja}. Link de pagamento gerado!`);

        // 4. Devolve o link do Mercado Pago para o Frontend
        return res.status(201).json({ 
            mensagem: "Loja criada! Redirecionando para o pagamento...", 
            url_pagamento: respostaMP.init_point // ESTE É O LINK MÁGICO DO CHECKOUT PRO!
        });

    } catch (error) {
        console.error("❌ [Erro] Falha ao criar loja ou gerar pagamento:", error);
        return res.status(500).json({ erro: "Erro interno ao gerar o pagamento." });
    }
};

module.exports = {
    criarLoja
};