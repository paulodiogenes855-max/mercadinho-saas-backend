// Arquivo: pagamento.service.js
// Ficheiro: backend/src/services/pagamento.service.js
const { mpPayment } = require('../config/mercadopago');
const db = require('../config/db');

const processarWebhookMercadoPago = async (req, res) => {
    const { type, data } = req.body;

    // Interessa-nos apenas eventos do tipo "payment" (pagamentos efetuados)
    if (type === 'payment' && data && data.id) {
        try {
            // Consultamos o Mercado Pago para validar se o pagamento foi realmente aprovado
            const pagamento = await mpPayment.get({ id: data.id });

            if (pagamento.status === 'approved') {
                // Buscamos o ID da loja que guardámos nos metadados da transação durante o checkout
                const loja_id = pagamento.metadata.loja_id;

                if (loja_id) {
                    // Renova a assinatura por mais 30 dias a contar de hoje e altera o status para ATIVA
                    const query = `
                        UPDATE lojas 
                        SET status_assinatura = 'ATIVA', 
                            vencimento_assinatura = CURRENT_DATE + INTERVAL '30 days',
                            atualizado_em = CURRENT_TIMESTAMP
                        WHERE id = $1
                    `;
                    await db.query(query, [loja_id]);
                    console.log(`✅ [Financeiro] Loja ${loja_id} renovada com sucesso via Webhook.`);
                }
            }
        } catch (error) {
            console.error('❌ [Financeiro] Erro ao processar notificação do Mercado Pago:', error);
            // Retornamos 500 para o Mercado Pago tentar reenviar o aviso mais tarde
            return res.status(500).send('Erro interno'); 
        }
    }

    // O Mercado Pago exige sempre um status 200/200 OK para confirmar o recebimento do webhook
    return res.status(200).send('OK');
};

module.exports = {
    processarWebhookMercadoPago
};