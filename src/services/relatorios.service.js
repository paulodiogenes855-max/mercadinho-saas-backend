// Arquivo: relatorios.service.js
// Ficheiro: backend/src/services/relatorios.service.js
const db = require('../config/db');

// ==========================================================
// 1. FATURAMENTO BRUTO VS LUCRO LÍQUIDO (ÚLTIMOS 30 DIAS)
// ==========================================================
const obterFaturamentoELucro = async (loja_id) => {
    const query = `
        SELECT 
            DATE(data_venda) as data,
            SUM(total_bruto) as faturamento_bruto,
            SUM(total_bruto - total_custo) as lucro_liquido
        FROM vendas
        WHERE loja_id = $1 AND data_venda >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(data_venda)
        ORDER BY DATE(data_venda) ASC;
    `;
    const result = await db.query(query, [loja_id]);
    return result.rows;
};

// ==========================================================
// 2. ALERTAS DE PRODUTOS NO ESTOQUE MÍNIMO
// ==========================================================
const obterProdutosEstoqueMinimo = async (loja_id) => {
    const query = `
        SELECT id, codigo_barras, descricao, estoque_atual, estoque_minimo
        FROM produtos
        WHERE loja_id = $1 AND ativo = TRUE AND estoque_atual <= estoque_minimo
        ORDER BY estoque_atual ASC;
    `;
    const result = await db.query(query, [loja_id]);
    return result.rows;
};

// ==========================================================
// 3. CURVA ABC (ITENS MAIS VENDIDOS E LUCRATIVOS)
// ==========================================================
const obterCurvaABC = async (loja_id) => {
    const query = `
        SELECT 
            p.codigo_barras,
            p.descricao,
            SUM(iv.quantidade) as quantidade_vendida,
            SUM(iv.subtotal) as total_faturado,
            SUM(iv.subtotal - (iv.custo_unitario_epoca * iv.quantidade)) as lucro_gerado
        FROM itens_venda iv
        JOIN vendas v ON iv.venda_id = v.id
        JOIN produtos p ON iv.produto_id = p.id
        WHERE v.loja_id = $1
        GROUP BY p.id, p.codigo_barras, p.descricao
        ORDER BY lucro_gerado DESC
        LIMIT 15;
    `;
    const result = await db.query(query, [loja_id]);
    return result.rows;
};

// ==========================================================
// 4. DESEMPENHO DE VENDAS POR FUNCIONÁRIO
// ==========================================================
const obterDesempenhoFuncionarios = async (loja_id) => {
    const query = `
        SELECT 
            u.nome as funcionario,
            COUNT(v.id) as total_vendas,
            SUM(v.total_bruto) as volume_faturado
        FROM vendas v
        JOIN usuarios u ON v.usuario_id = u.id
        WHERE v.loja_id = $1
        GROUP BY u.id, u.nome
        ORDER BY volume_faturado DESC;
    `;
    const result = await db.query(query, [loja_id]);
    return result.rows;
};

// Agrupador do Dashboard para enviar tudo numa única requisição ao carregar a página
const obterDadosDashboard = async (req, res) => {
    const { loja_id, perfil } = req.tenant;

    // Segurança extra: Apenas o DONO pode ver os relatórios financeiros do negócio
    if (perfil !== 'DONO') {
        return res.status(403).json({ erro: 'Acesso negado. Apenas o administrador pode ver os relatórios.' });
    }

    try {
        const [financeiro, alertas, curvaABC, funcionarios] = await Promise.all([
            obterFaturamentoELucro(loja_id),
            obterProdutosEstoqueMinimo(loja_id),
            obterCurvaABC(loja_id),
            obterDesempenhoFuncionarios(loja_id)
        ]);

        return res.status(200).json({
            financeiro,
            alertas,
            curvaABC,
            funcionarios
        });
    } catch (error) {
        console.error('❌ [Dashboard] Erro ao consolidar métricas:', error);
        return res.status(500).json({ erro: 'Erro interno ao processar os dados do painel.' });
    }
};

module.exports = {
    obterDadosDashboard
};