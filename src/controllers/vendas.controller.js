// Arquivo: vendas.controller.js
// Ficheiro: backend/src/controllers/vendas.controller.js
const db = require('../config/db');

// ==========================================================
// 1. REGISTAR NOVA VENDA (Frente de Caixa / PDV)
// ==========================================================
const registarVenda = async (req, res) => {
    // Extraímos os dados do Tenant e do Utilizador logado (o Caixa que está a operar)
    const { loja_id, usuario_id } = req.tenant;
    
    // O frontend (React) enviará estes dados no momento do "Checkout"
    const { metodo_pagamento, valor_pago, troco, itens } = req.body;

    if (!itens || itens.length === 0) {
        return res.status(400).json({ erro: 'A venda não possui itens.' });
    }

    const client = await db.pool.connect();

    try {
        await client.query('BEGIN'); // Inicia a transação de segurança

        let totalBruto = 0;
        let totalCusto = 0;

        // 1. Validação e cálculo do Custo/Venda em tempo real para evitar fraudes no frontend
        // Guardamos os itens processados para inserir no passo 3
        const itensProcessados = [];

        for (let item of itens) {
            // Vamos buscar o preço de custo atual do produto diretamente à base de dados
            const resProduto = await client.query(
                `SELECT preco_custo, preco_venda FROM produtos WHERE id = $1 AND loja_id = $2`,
                [item.produto_id, loja_id]
            );

            if (resProduto.rows.length === 0) {
                throw new Error(`Produto com ID ${item.produto_id} não encontrado na loja.`);
            }

            const produtoDb = resProduto.rows[0];
            
            // Calculamos os totais usando os preços do frontend (que o caixa viu no ecrã) 
            // e o custo real da base de dados
            totalBruto += (item.preco_unitario_vendido * item.quantidade);
            totalCusto += (produtoDb.preco_custo * item.quantidade);

            itensProcessados.push({
                produto_id: item.produto_id,
                quantidade: item.quantidade,
                preco_unitario_vendido: item.preco_unitario_vendido,
                custo_unitario_epoca: produtoDb.preco_custo // Congela o custo da época aqui!
            });
        }

        // 2. Criar o Cabeçalho da Venda
        const insertVendaQuery = `
            INSERT INTO vendas (loja_id, usuario_id, total_bruto, total_custo, metodo_pagamento, valor_pago, troco)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, data_venda
        `;
        const resVenda = await client.query(insertVendaQuery, [
            loja_id, usuario_id, totalBruto, totalCusto, metodo_pagamento, valor_pago, troco || 0
        ]);
        const novaVendaId = resVenda.rows[0].id;

        // 3. Inserir os Itens e Abater o Stock
        for (let item of itensProcessados) {
            // Insere a fotografia exata do item vendido
            await client.query(`
                INSERT INTO itens_venda (venda_id, produto_id, quantidade, custo_unitario_epoca, preco_unitario_vendido)
                VALUES ($1, $2, $3, $4, $5)
            `, [novaVendaId, item.produto_id, item.quantidade, item.custo_unitario_epoca, item.preco_unitario_vendido]);

            // Abate a quantidade no stock atual do produto
            await client.query(`
                UPDATE produtos 
                SET estoque_atual = estoque_atual - $1, atualizado_em = CURRENT_TIMESTAMP
                WHERE id = $2 AND loja_id = $3
            `, [item.quantidade, item.produto_id, loja_id]);
        }

        await client.query('COMMIT'); // Se chegou aqui, grava TUDO na base de dados em definitivo!

        return res.status(201).json({
            mensagem: 'Venda finalizada com sucesso!',
            venda_id: novaVendaId,
            total: totalBruto
        });

    } catch (error) {
        await client.query('ROLLBACK'); // Se algo falhar, cancela a venda e não mexe no stock
        console.error('❌ [Vendas] Erro ao registar venda:', error);
        return res.status(500).json({ erro: 'Erro crítico ao processar a venda.' });
    } finally {
        client.release();
    }
};

// ==========================================================
// 2. LISTAR HISTÓRICO DE VENDAS (Para o Dashboard)
// ==========================================================
const listarVendas = async (req, res) => {
    const { loja_id } = req.tenant;

    try {
        // Traz as últimas 50 vendas daquela loja específica
        const query = `
            SELECT id, total_bruto, metodo_pagamento, data_venda 
            FROM vendas 
            WHERE loja_id = $1 
            ORDER BY data_venda DESC 
            LIMIT 50
        `;
        const result = await db.query(query, [loja_id]);
        
        return res.status(200).json(result.rows);
    } catch (error) {
        console.error('❌ [Vendas] Erro ao listar vendas:', error);
        return res.status(500).json({ erro: 'Erro interno ao buscar histórico de vendas.' });
    }
};

module.exports = {
    registarVenda,
    listarVendas
};