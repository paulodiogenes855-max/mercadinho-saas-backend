// Ficheiro: backend/src/middlewares/auth.middleware.js
const admin = require('../config/firebase');

async function verificarToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
            error: 'Acesso negado. Token não fornecido ou formato inválido.' 
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        // Valida o token com o Firebase
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        // Injeta os dados básicos do utilizador na requisição
        // IMPORTANTE: Aqui ainda não sabemos se é Dono ou Caixa, apenas que é alguém válido.
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            nome: decodedToken.name || '',
            foto: decodedToken.picture || ''
        };

        return next();
    } catch (error) {
        console.error('❌ [Auth Middleware] Erro ao verificar token do Firebase:', error);
        return res.status(403).json({ 
            error: 'Acesso proibido. Token inválido, expirado ou revogado.' 
        });
    }
}

module.exports = { verificarToken };