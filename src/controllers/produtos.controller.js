// Arquivo: produtos.controller.js
// Arquivo: backend/src/controllers/produtos.controller.js
const db = require('../config/db');

// ==========================================================
// 1. ADICIONAR PRODUTO AVULSO
// ==========================================================
const adicionarProduto = async (req, res) => {
    const { loja_id } = req.tenant;
    const { codigo_barras, descricao, preco_custo, preco_venda, estoque_atual, estoque_minimo } = req.body;

    try {
        const query = `
            INSERT INTO produtos (loja_id, codigo_barras, descricao, preco_custo, preco_venda, estoque_atual, estoque_minimo)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        const result = await db.query(query, [
            loja_id, codigo_barras, descricao, preco_custo, preco_venda, estoque_atual || 0, estoque_minimo || 0
        ]);

        return res.status(201).json(result.rows[0]);
    } catch (error) {
        // Se o código de barras já existir nesta loja, o banco recusa a inserção (Unique Constraint)
        if (error.constraint === 'produtos_loja_id_codigo_barras_key') {
            return res.status(400).json({ erro: 'Este código de barras já está cadastrado.' });
        }
        console.error('❌ [Produtos] Erro ao adicionar:', error);
        return res.status(500).json({ erro: 'Erro interno ao salvar o produto.' });
    }
};

// ==========================================================
// 2. LISTAR PRODUTOS (Com busca opcional)
// ==========================================================
const listarProdutos = async (req, res) => {
    const { loja_id } = req.tenant;
    const { busca } = req.query; // Ex: /api/produtos?busca=arroz

    try {
        let query = `SELECT * FROM produtos WHERE loja_id = $1 AND ativo = TRUE`;
        let params = [loja_id];

        // Se o usuário digitou algo na barra de pesquisa (PDV)
        if (busca) {
            query += ` AND (descricao ILIKE $2 OR codigo_barras = $2)`;
            params.push(`%${busca}%`);
        }

        query += ` ORDER BY descricao ASC LIMIT 100`; // Limite para o PDV não travar

        const result = await db.query(query, params);
        return res.status(200).json(result.rows);
    } catch (error) {
        console.error('❌ [Produtos] Erro ao listar:', error);
        return res.status(500).json({ erro: 'Erro interno ao buscar produtos.' });
    }
};

// ==========================================================
// 3. IMPORTAÇÃO EM LOTE (Planilha CSV do Frontend)
// ==========================================================
const importarProdutosCSV = async (req, res) => {
    const { loja_id } = req.tenant;
    const { produtos } = req.body; // O React vai enviar um Array de produtos

    if (!produtos || produtos.length === 0) {
        return res.status(400).json({ erro: 'Nenhum produto enviado para importação.' });
    }

    const client = await db.pool.connect();

    try {
        await client.query('BEGIN'); // Inicia a transação da importação

        let inseridos = 0;
        let atualizados = 0;

        for (let prod of produtos) {
            // A MÁGICA DO "ON CONFLICT":
            // Se o código de barras não existir, ele cria.
            // Se já existir, ele ATUALIZA o estoque e os preços, sem dar erro!
            const query = `
                INSERT INTO produtos (loja_id, codigo_barras, descricao, preco_custo, preco_venda, estoque_atual)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (loja_id, codigo_barras) 
                DO UPDATE SET 
                    descricao = EXCLUDED.descricao,
                    preco_custo = EXCLUDED.preco_custo,
                    preco_venda = EXCLUDED.preco_venda,
                    estoque_atual = produtos.estoque_atual + EXCLUDED.estoque_atual,
                    atualizado_em = CURRENT_TIMESTAMP
                RETURNING (xmax = 0) AS is_insert;
            `;
            
            const result = await client.query(query, [
                loja_id, 
                prod.codigo_barras, 
                prod.descricao, 
                prod.preco_custo || 0, 
                prod.preco_venda || 0, 
                prod.estoque_atual || 0
            ]);

            // Conta se foi uma criação nova ou apenas uma atualização de um produto existente
            if (result.rows[0].is_insert) inseridos++;
            else atualizados++;
        }

        await client.query('COMMIT'); // Confirma tudo no banco

        return res.status(200).json({ 
            mensagem: 'Importação concluída com sucesso!',
            resumo: { inseridos, atualizados, total: produtos.length }
        });

    } catch (error) {
        await client.query('ROLLBACK'); // Se der erro no meio dos 5000 produtos, desfaz tudo para não corromper o banco
        console.error('❌ [Produtos] Erro na importação:', error);
        return res.status(500).json({ erro: 'Erro crítico durante a importação da planilha. Nenhum produto foi salvo.' });
    } finally {
        client.release();
    }
};

module.exports = {
    adicionarProduto,
    listarProdutos,
    importarProdutosCSV
};