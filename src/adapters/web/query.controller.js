const dbService = require('../../core/useCases/database.service');

/**
 * QueryController handles HTTP requests for querying the system.
 * It orchestrates the flow between the Frontend and n8n.
 */
class QueryController {
    constructor(ragAdapter, n8nAdapter) {
        this.ragAdapter = ragAdapter;
        this.n8nAdapter = n8nAdapter;
    }

    /**
     * ENTRY POINT: Frontend -> Backend -> n8n
     * Sequence: Receive Query -> Forward to n8n
     */
    async handleQuery(req, res) {
        try {
            const { naturalLanguageQuery, natural_query, database_connection, tables } = req.body;
            const query = naturalLanguageQuery || natural_query;

            if (!query) {
                return res.status(400).json({ error: 'Missing query in request body.' });
            }

            // payload estructurado para n8n (envuelto en "body" porque el workflow espera body.question, body.connection_string, etc.)
            const n8nPayload = {
                body: {
                    question: query,
                    connection_string: database_connection,
                    tables: tables || ['facturas', 'ventas'],
                    timestamp: new Date().toISOString()
                }
            };

            // LOG DE DIAGNÓSTICO: Ver qué estamos enviando antes de que falle
            console.log('[QueryController] Enviando payload a n8n:', JSON.stringify(n8nPayload));

            // Aquí ocurre el 404. Asegúrate de que el n8nAdapter tenga la URL de producción o test correcta.
            const agentResponse = await this.n8nAdapter.sendToAgent(n8nPayload);

            return res.status(200).json({
                success: true,
                data: agentResponse
            });

        } catch (error) {
            // LOG MEJORADO: Captura más detalles del error de la petición HTTP
            console.error('Error en QueryController.handleQuery:', error.message);
            if (error.response) {
                console.error('[n8n Response Error Data]:', error.response.data);
                console.error('[n8n Response Error Status]:', error.response.status);
            }
            
            return res.status(500).json({ 
                success: false, 
                error: `n8n Webhook call failed: ${error.message}` 
            });
        }
    }

    /**
     * n8n -> Backend: Get Raw Schema
     */
    async getRawSchema(req, res) {
        try {
            const { sql, connection_string } = req.body;
            const schema = await dbService.getSchema(sql, connection_string);
            return res.status(200).json({ data: schema });
        } catch (error) {
            console.error('Error en getRawSchema:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }

    /**
     * n8n -> Backend: Anonymize Schema
     */
    async anonymize(req, res) {
        try {
            const { schema, instructions, connection_string } = req.body;
            const anonymized = await dbService.anonymizeSchema(schema, instructions);
            return res.status(200).json({ data: anonymized });
        } catch (error) {
            console.error('Error en anonymize:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }

    /**
     * n8n -> Backend: Final Execution
     */
    async execute(req, res) {
        try {
            const { sql, connection_string, llm_template } = req.body;
            const results = await dbService.executeQuery(sql, connection_string);
            return res.status(200).json({ 
                results: results,
                template: llm_template 
            });
        } catch (error) {
            console.error('Error en execute:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }
}

module.exports = QueryController;