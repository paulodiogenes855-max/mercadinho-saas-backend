// Arquivo: mercadopago.js
// Ficheiro: backend/src/config/mercadopago.js
const { MercadoPagoConfig, Payment } = require('mercadopago');

// O token secreto de produção ou testes é lido do ficheiro .env
const mpConfig = new MercadoPagoConfig({ 
    accessToken: process.env.MP_ACCESS_TOKEN || 'TEST-SEU-ACCESS-TOKEN' 
});

const mpPayment = new Payment(mpConfig);

module.exports = {
    mpPayment
};