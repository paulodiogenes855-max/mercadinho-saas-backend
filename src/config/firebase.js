// Ficheiro: backend/src/config/firebase.js
const admin = require('firebase-admin');

try {
    // Para o ambiente local, o Node vai procurar este ficheiro JSON com as chaves do seu projeto Firebase.
    // IMPORTANTE: Este ficheiro contém chaves secretas. Nunca o envie para o GitHub!
    const serviceAccount = require('../../firebase-credentials.json');

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    console.log('✅ [Firebase] Firebase Admin inicializado com sucesso!');
} catch (error) {
    console.warn('⚠️ [Firebase] Ficheiro firebase-credentials.json não encontrado ou inválido.');
    console.warn('⚠️ [Firebase] Certifique-se de descarregar a chave da Consola do Firebase e colocá-la na pasta backend.');
}

module.exports = admin;