const fs = require('fs');

async function modifyAndImportWorkflow() {
  const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYjE1YWRjYS0zNjc1LTQyMTAtOGVjNS00NGZkNWI5ZjAzNTgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMDcwNmQ3ZmMtZGZmYS00NjhjLWI5ZDAtNmE2MGRhOTY4MmVlIiwiaWF0IjoxNzgxOTk5NTQ2LCJleHAiOjE3ODQ1MjAwMDB9.GEfLCv0UMiNgV6xuVUPPIPEv3NMk4xEnvKpTz_LdO9U';
  const url = 'http://localhost:5678/api/v1/workflows';
  
  // Base structure reconstructed from the previous workflow but stripped of RAG
  const workflow = {
    name: "NL2SQL Architecture (3 Agents) - SIN RAG",
    nodes: [
      {
        "parameters": {
          "httpMethod": "POST",
          "path": "nl2sql-3-agents",
          "responseMode": "lastNode",
          "options": {}
        },
        "id": "f9a1f0a3-69ed-4158-8ebd-05728e0785d2",
        "name": "Webhook",
        "position": [-4496, 32],
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 1,
        "webhookId": "957352e1-32da-4f9e-a443-1f04c2a3db7a"
      },
      {
        "parameters": {
          "mode": "runOnceForEachItem",
          "jsCode": "const body = $input.item.json.body || {};\nconst conn = body.connection_string || '';\nlet engine = 'postgres';\nif (conn.startsWith('mysql')) engine = 'mysql';\nelse if (conn.startsWith('oracle')) engine = 'oracle';\nelse if (conn.startsWith('sqlserver')) engine = 'mssql';\nreturn { json: { ...body, engine } };"
        },
        "id": "77aabaa1-c7d2-42e6-8cbe-39c5e46bfd05",
        "name": "Detect Engine",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [-4304, 32]
      },
      {
        "parameters": {
          "promptType": "define",
          "text": "=Misión: Genera ÚNICAMENTE la consulta SQL para extraer los metadatos (tablas y columnas) del motor de base de datos especificado.\\n\\nMOTOR DE BASE DE DATOS DETECTADO: \\n{{ $('Detect Engine').first().json.engine }}\\n\\nLISTA DE TABLAS OBJETIVO:\\n{{ $('Webhook').first().json.body.tables ? (Array.isArray($('Webhook').first().json.body.tables) ? $('Webhook').first().json.body.tables.join(', ') : $('Webhook').first().json.body.tables) : 'facturas, ventas' }}\\n\\nINSTRUCCIONES TÉCNICAS REQUERIDAS:\\n1. Si el motor es 'postgresql', 'mysql', 'sqlserver' o 'mariadb':\\n   Usa el estándar INFORMATION_SCHEMA. Debes tomar los nombres de la \\\"LISTA DE TABLAS OBJETIVO\\\" provista arriba y colocarlos separados por comas y comillas simples dentro del IN ().\\n   Estructura: SELECT table_schema, table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN ('aqui_van_las_tablas') ORDER BY table_name, ordinal_position;\\n\\n2. Si el motor es 'sqlite':\\n   Usa la estructura: SELECT m.name AS table_name, p.name AS column_name, p.type AS data_type FROM sqlite_master AS m JOIN pragma_table_info(m.name) AS p WHERE m.type = 'table' AND m.name IN ('aqui_van_las_tablas') AND m.name NOT LIKE 'sqlite_%' ORDER BY m.name;\\n\\n3. Si el motor es 'oracle':\\n   Usa la estructura: SELECT owner AS table_schema, table_name, column_name, data_type FROM all_tab_columns WHERE owner NOT IN ('SYS', 'SYSTEM') AND table_name IN ('aqui_van_las_tablas') ORDER BY table_name, column_id;\\n\\nREGLAS DE ORO OBLIGATORIAS:\\n- Responde ÚNICAMENTE con la cadena de texto de la consulta SQL final armada.\\n- Reemplaza la cadena 'aqui_van_las_tablas' con los datos reales que están en la sección \\\"LISTA DE TABLAS OBJETIVO\\\".\\n- NO uses bloques de código Markdown (prohibido usar ```sql).\\n- NO incluyas explicaciones, saludos ni comentarios.\\n- Asegúrate de que la consulta termine en punto y coma (;).",
          "options": {}
        },
        "id": "17f42c7a-236a-4670-b505-85a518299afb",
        "name": "Context Agent",
        "position": [-3900, 32],
        "type": "@n8n/n8n-nodes-langchain.agent",
        "typeVersion": 3.1
      },
      {
        "parameters": {
          "modelName": "models/gemini-2.5-flash-lite",
          "options": {}
        },
        "id": "be68e017-4fe3-4154-86eb-16686d9e107f",
        "name": "Gemini Model (Context)",
        "position": [-3900, 224],
        "type": "@n8n/n8n-nodes-langchain.lmChatGoogleGemini",
        "typeVersion": 1,
        "credentials": {
          "googlePalmApi": {
            "id": "Zgb7mNLlIBDGrI0q",
            "name": "Google Gemini(PaLM) Api account"
          }
        }
      },
      {
        "parameters": {
          "jsCode": "// 1. Intentamos recuperar la lista de tablas directamente desde el Webhook de entrada\\nlet tables = \"\";\\n\\ntry {\\n  const rawTables = $('Webhook').first().json.body.tables;\\n  if (Array.isArray(rawTables)) {\\n    tables = rawTables.map(t => `'${t.trim()}'`).join(', ');\\n  } else if (typeof rawTables === 'string') {\\n    tables = rawTables.split(',').map(t => `'${t.trim()}'`).join(', ');\\n  }\\n} catch (e) {\\n  // Error fallback\\n}\\n\\n// 2. ¡EL SALVAVIDAS CRÍTICO!\\nif (!tables || tables.trim() === \"\" || tables === \"()\") {\\n  tables = \"'facturas', 'ventas'\"; \\n}\\n\\n// 3. Construimos la consulta limpia asignándola a la propiedad \"sql\"\\nconst queryFinal = `SELECT table_schema, table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN (${tables}) ORDER BY table_name, ordinal_position;`;\\n\\nreturn [{\\n  json: {\\n    sql: queryFinal\\n  }\\n}];"
        },
        "id": "4b5e29d4-d2ee-4f3d-aa8a-f5899b1f2463",
        "name": "Clear Schema Query",
        "position": [-3600, 32],
        "type": "n8n-nodes-base.code",
        "typeVersion": 2
      },
      {
        "parameters": {
          "method": "POST",
          "url": "={{ $node['Webhook'].json.body.backend_url || 'http://localhost:3000' }}/api/query",
          "sendBody": true,
          "bodyParameters": {
            "parameters": [
              {
                "name": "sql",
                "value": "={{ $node[\"Clear Schema Query\"].json.sql }}"
              },
              {
                "name": "connection_string",
                "value": "={{ $node[\"Webhook\"].json.body.connection_string }}"
              }
            ]
          },
          "options": {}
        },
        "id": "6563dc87-5f20-46ea-a2a7-25b6be1a55e0",
        "name": "Query DB Schema",
        "position": [-3400, 48],
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.1
      },
      {
        "parameters": {
          "modelId": {
            "__rl": true,
            "value": "models/gemini-3.1-flash-lite",
            "mode": "list",
            "cachedResultName": "models/gemini-3.1-flash-lite"
          },
          "messages": {
            "values": [
              {
                "content": "=Misión: Actúa como un experto en seguridad de datos (GDPR/Compliance). Tu objetivo es analizar el esquema de la base de datos y determinar qué tablas y columnas deben ser anonimizadas.\\n\\nENTRADA (ESQUEMA TÉCNICO):\\n{{ JSON.stringify($node[\"Query DB Schema\"].json.data) }}\\n\\nTAREA:\\n1. Analiza los nombres de tablas y columnas en el JSON de entrada.\\n2. Identifica PII (nombres, cédulas, emails, teléfonos, direcciones, salarios).\\n3. Si una columna se llama nombre, apellido, email, telefono o similar -> MARCAR PARA ANONIMIZAR.\\n4. Si una tabla se refiere a clientes, usuarios o empleados -> MARCAR PARA REVISIÓN.\\n\\nREGLAS DE SALIDA CRÍTICAS:\\n- Responde ÚNICAMENTE con un objeto JSON válido.\\n- NO incluyas introducciones como \\\"Aquí tienes el análisis...\\\".\\n- NO uses bloques de código Markdown (prohibido usar ```json).\\n- NO incluyas comentarios ni explicaciones fuera del campo \\\"reasoning\\\".\\n- Si no hay datos sensibles, devuelve las listas vacías [] pero mantén la estructura.\\n\\nESTRUCTURA DE SALIDA (JSON PURO):\\n{\\n  \\\"action\\\": \\\"anonymize\\\",\\n  \\\"tables_to_mask\\\": [\\\"lista_de_tablas\\\"],\\n  \\\"columns_to_mask\\\": [\\\"tabla.columna\\\"],\\n  \\\"reasoning\\\": \\\"Breve explicación técnica\\\"\\n}"
              }
            ]
          },
          "builtInTools": {},
          "options": {}
        },
        "id": "6ea27395-6938-4fc5-9619-258e22d956b5",
        "name": "Compliance Analyst (PII)",
        "position": [-2336, 32],
        "type": "@n8n/n8n-nodes-langchain.googleGemini",
        "typeVersion": 1.1,
        "credentials": {
          "googlePalmApi": {
            "id": "Zgb7mNLlIBDGrI0q",
            "name": "Google Gemini(PaLM) Api account"
          }
        }
      },
      {
        "parameters": {
          "mode": "runOnceForEachItem",
          "jsCode": "let dirtyText = \"\";\\nif ($json.content && $json.content.parts && $json.content.parts[0]) {\\n    dirtyText = $json.content.parts[0].text;\\n} else {\\n    dirtyText = $json.text || $json.output || $json.message?.content || \"\";\\n}\\nif (!dirtyText || dirtyText.trim() === \"\") {\\n    return { error: \"El texto de la IA llegó vacío.\", raw: \"VACÍO\" };\\n}\\nconst start = dirtyText.indexOf('{');\\nconst end = dirtyText.lastIndexOf('}');\\nif (start !== -1 && end !== -1) {\\n    const cleanJsonString = dirtyText.substring(start, end + 1);\\n    try {\\n        return JSON.parse(cleanJsonString);\\n    } catch (e) {\\n        return { error: \"JSON mal formado\", raw: dirtyText };\\n    }\\n}\\nreturn { error: \"No se encontró el símbolo '{' en la respuesta\", raw: dirtyText };"
        },
        "id": "ca5d7cbd-8af8-44fe-ab50-6f3411b14bf5",
        "name": "Clear PII JSON",
        "position": [-2048, 32],
        "type": "n8n-nodes-base.code",
        "typeVersion": 2
      },
      {
        "parameters": {
          "method": "POST",
          "url": "={{ $node['Webhook'].json.body.backend_url || 'http://localhost:3000' }}/api/anonymize",
          "sendBody": true,
          "bodyParameters": {
            "parameters": [
              {
                "name": "schema",
                "value": "={{ $node[\"Query DB Schema\"].json.data }}"
              },
              {
                "name": "connection_string",
                "value": "={{ $node['Webhook'].json.body.connection_string }}"
              },
              {
                "name": "instructions",
                "value": "={{ $json }}"
              }
            ]
          },
          "options": {}
        },
        "id": "0dea81f5-aeae-4d9e-9ac8-42f2c2ad0846",
        "name": "Backend Anonymizer",
        "position": [-1840, 32],
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.1
      },
      {
        "parameters": {
          "promptType": "define",
          "text": "=Misión: Eres un Agente Razonador y Generador de SQL de élite. Tu objetivo es procesar la solicitud en lenguaje natural del usuario utilizando el esquema de base de datos provisto (el cual ha sido anonimizado/encriptado bajo el estándar Zero-Trust).\\n\\nDATOS DE ENTRADA:\\n- Pregunta del usuario: \\\"{{ $('Webhook').first().json.body.question }}\\\"\\n- Motor de Base de Datos: \\\"{{ $('Detect Engine').first().json.engine }}\\\"\\n\\nESQUEMA DE BASE de DATOS ANONIMIZADO:\\n{{ $('Query DB Schema').first().json.data ? $('Query DB Schema').first().json.data.map(item => `Tabla:${item.table_name}|Columna:${item.column_name}|Tipo:${item.data_type}`).join('\\n') : 'Error: No se pudieron cargar los metadatos del nodo Query DB Schema.' }}\\n\\nPASOS DE RAZONAMIENTO REQUERIDOS:\\n1. Analiza semánticamente la pregunta del usuario.\\n2. Mapea las entidades solicitadas con las tablas y atributos anonimizados del esquema provisto en la sección de arriba.\\n3. Resuelve uniones (joins), filtros y agregaciones basadas en la intención semántica.\\n4. Genera una consulta SQL real y ejecutable utilizando ÚNICAMENTE los nombres anonimizados (como Atributo_1, Atributo_2, etc.) que aparecen en el esquema de arriba. No dejes marcadores de posición ni textos de ejemplo.\\n5. Diseña una plantilla de texto profesional de 2 líneas que describa qué datos se consultan de manera que el usuario entienda. DEBES colocar exactamente el tag [TABLA_RESULTADOS] en el lugar donde el backend inyectará la tabla markdown de resultados. No inventes datos reales.\\n\\nREGLAS DE SALIDA CRÍTICAS:\\n- Tu respuesta DEBE ser obligatoriamente un objeto JSON puro y válido.\\n- NO incluyas etiquetas Markdown como ```json o ```.\\n- NO incluyas razonamiento externo en tu texto final (todo razonamiento debe ir en el campo \\\"reasoning\\\").\\n- La consulta SQL debe incorporar siempre una cláusula LIMIT 100 de seguridad al final.\\n- REGLA DE TIPOS Y FECHAS UNIVERSAL: La columna 'fecha' en la tabla 'facturas' es de tipo DATE (sin hora). Siempre que calcules rangos de tiempo basados en la fecha actual (usando CURRENT_DATE, NOW(), INTERVALS, etc.), asegúrate de aplicar la función de truncamiento o conversión de manera que PostgreSQL compare DATE con DATE de forma simétrica utilizando el casteo explícito (por ejemplo, usando f.fecha >= (date_trunc('month', current_date) - interval '1 month')::date o f.fecha < date_trunc('month', current_date)::date). Esto evitará que las comparaciones implícitas contra TIMESTAMP dejen registros fuera debido a desfases de hora o zonas horarias del servidor.\\n\\nESTRUCTURA JSON DE SALIDA EXIGIDA:\\n{\\n  \\\"reasoning\\\": \\\"Explicación interna paso a paso de tu análisis y decisiones de relaciones.\\\",\\n  \\\"sql\\\": \\\"SELECT Atributo_3 FROM Atributo_2 WHERE Atributo_5 = 'valor' LIMIT 100;\\\",\\n  \\\"template\\\": \\\"Aquí tienes el reporte solicitado:\\n[TABLA_RESULTADOS]\\\"\\n}",
          "options": {}
        },
        "id": "a108c7ef-857f-4cdd-8bf8-850f5f0e7d1c",
        "name": "Agente Razonador y Generador SQL",
        "position": [-1552, 48],
        "type": "@n8n/n8n-nodes-langchain.agent",
        "typeVersion": 3.1
      },
      {
        "parameters": {
          "model": "qwen/qwen3-32b",
          "options": {}
        },
        "id": "c7fa8409-7d71-4c88-9a4d-69cc820d8fbb",
        "name": "Groq Chat Model (Qwen)",
        "position": [-1584, 224],
        "type": "@n8n/n8n-nodes-langchain.lmChatGroq",
        "typeVersion": 1,
        "credentials": {
          "groqApi": {
            "id": "sIrLyDe0zrmoTxRH",
            "name": "Groq account"
          }
        }
      },
      {
        "parameters": {
          "mode": "runOnceForEachItem",
          "jsCode": "let dirtyText = $json.output || $json.text || \"\";\\nconst start = dirtyText.indexOf('{');\\nconst end = dirtyText.lastIndexOf('}');\\nlet parsed = {};\\nif (start !== -1 && end !== -1) {\\n    try {\\n        parsed = JSON.parse(dirtyText.substring(start, end + 1));\\n    } catch (e) {\\n        let sqlMatch = dirtyText.match(/\"sql\"\\s*:\\s*\"([^\"]+)\"/);\\n        let templateMatch = dirtyText.match(/\"template\"\\s*:\\s*\"([^\"]+)\"/);\\n        parsed.sql = sqlMatch ? sqlMatch[1] : dirtyText;\\n        parsed.template = templateMatch ? templateMatch[1] : \"Aquí tienes los datos: \" + \"{\" + \"{DATOS}\" + \"}\";\\n    }\\n} else {\\n    parsed.sql = dirtyText;\\n    parsed.template = \"Aquí tienes los datos: \" + \"{\" + \"{DATOS}\" + \"}\";\\n}\\n\\nlet sql = parsed.sql || \"\";\\nsql = sql.replace(/```sql|```/gi, '').trim();\\nconst selectIndex = sql.toUpperCase().indexOf(\"SELECT\");\\nif (selectIndex !== -1) {\\n    sql = sql.substring(selectIndex);\\n}\\nsql = sql.replace(/\\s+/g, ' ').trim();\\n\\nreturn {\\n    json: {\\n        sql: sql,\\n        template: parsed.template || \"Aquí tienes los datos: \" + \"{\" + \"{DATOS}\" + \"}\"\\n    }\\n};"
        },
        "id": "f4572790-0210-418a-8690-4a84a294d773",
        "name": "Parser Agente 2",
        "position": [-1232, 80],
        "type": "n8n-nodes-base.code",
        "typeVersion": 2
      },
      {
        "parameters": {
          "promptType": "define",
          "text": "=Misión: Eres un Agente Razonador y Generador de SQL de élite. Tu objetivo es procesar la solicitud en lenguaje natural del usuario utilizando el esquema de base de datos provisto (el cual ha sido anonimizado/encriptado bajo el estándar Zero-Trust).\\n\\nDATOS DE ENTRADA:\\n- Pregunta del usuario: \"{{ $('Webhook').first().json.body.question }}\"\\n- Motor de Base de Datos: \"{{ $('Detect Engine').first().json.engine }}\"\\n\\nESQUEMA DE BASE DE DATOS ANONIMIZADO:\\n{{ $('Query DB Schema').first().json.data.map(item => `Tabla: ${item.table_name} | Columna: ${item.column_name} | Tipo: ${item.data_type}`).join('\\n') }}\\n\\nPASOS DE RAZONAMIENTO REQUERIDOS:\\n1. Analiza semánticamente la pregunta del usuario.\\n2. Mapea las entidades de la pregunta con las tablas y columnas anonimizadas del ESQUEMA provisto arriba.\\n3. Genera una consulta SQL válida sintácticamente utilizando ÚNICAMENTE los nombres anonimizados.\\n4. Diseña una plantilla de texto profesional que use el tag [DATOS] donde irá el reporte.\\n\\nREGLAS DE SALIDA CRÍTICAS:\\n- Tu respuesta DEBE ser obligatoriamente un objeto JSON puro y válido.\\n- NO incluyas etiquetas Markdown como ```json o ```.\\n- La consulta SQL debe incorporar siempre una cláusula LIMIT 100 de seguridad al final.\\n\\nESTRUCTURA JSON DE SALIDA EXIGIDA:\\n{\\n  \\\"reasoning\\\": \\\"Tu análisis de mapeo paso a paso aquí.\\\",\\n  \\\"sql\\\": \\\"SELECT ... LIMIT 100;\\\",\\n  \\\"template\\\": \\\"Aquí tienes el reporte solicitado: [DATOS]\\\"\\n}",
          "options": {}
        },
        "id": "b76eb4c3-e1ed-4234-b829-6c71c5e1c47c",
        "name": "Agente de Seguridad y Validación",
        "position": [-704, 32],
        "type": "@n8n/n8n-nodes-langchain.agent",
        "typeVersion": 3.1
      },
      {
        "parameters": {
          "model": "openai/gpt-oss-120b",
          "options": {}
        },
        "id": "755ddb1c-f8d7-4aef-b84a-e676a836c45f",
        "name": "Groq Chat Model (Defog)",
        "position": [-672, 224],
        "type": "@n8n/n8n-nodes-langchain.lmChatGroq",
        "typeVersion": 1,
        "credentials": {
          "groqApi": {
            "id": "sIrLyDe0zrmoTxRH",
            "name": "Groq account"
          }
        }
      },
      {
        "parameters": {
          "jsCode": "// 1. Capturamos el string en bruto que viene del agente\\nconst rawOutput = $('Agente de Seguridad y Validación').first().json.output;\\n\\nif (!rawOutput) {\\n  throw new Error(\"El nodo anterior no entregó la propiedad 'output'.\");\\n}\\n\\n// 2. Parseamos el string de texto para convertirlo en un objeto JSON real de JavaScript\\nconst parsedJSON = JSON.parse(rawOutput);\\n\\n// 3. Extraemos las variables ya limpias y procesadas\\nconst sqlQuery = parsedJSON.sql;\\nconst template = parsedJSON.template;\\nconst reasoning = parsedJSON.reasoning;\\n\\n// 4. Validación de seguridad final en el código\\nif (!sqlQuery || !sqlQuery.toUpperCase().trim().startsWith(\"SELECT\")) {\\n  throw new Error(\"Violación de Seguridad: La consulta generada no es un SELECT válido.\");\\n}\\n\\n// 5. Devolvemos los datos estructurados a los canales nativos de n8n\\nreturn [{\\n  json: {\\n    reasoning: reasoning,\\n    sql: sqlQuery,\\n    template: template\\n  }\\n}];"
        },
        "id": "a6c1f77c-0580-432c-a553-b650b13afee6",
        "name": "Security Parser",
        "position": [-288, 64],
        "type": "n8n-nodes-base.code",
        "typeVersion": 2
      },
      {
        "parameters": {
          "method": "POST",
          "url": "={{ $node['Webhook'].json.body.backend_url || 'http://localhost:3000' }}/api/execute",
          "sendBody": true,
          "bodyParameters": {
            "parameters": [
              {
                "name": "connection_string",
                "value": "={{ $node['Webhook'].json.body.connection_string }}"
              },
              {
                "name": "llm_template",
                "value": "={{ $node['Security Parser'].json.template }}"
              },
              {
                "name": "sql",
                "value": "={{ $json.sql }}"
              }
            ]
          },
          "options": {}
        },
        "id": "b1b7ca9a-ddb8-45fb-a2b6-641f6d96b694",
        "name": "Backend Execute",
        "position": [0, 0],
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.1
      },
      {
        "parameters": {
          "jsCode": "// 1. Extraemos el SQL que viene del paso anterior\\nconst sqlQuery = $('Parser Agente 2').first().json.sql;\\nconst template = $('Parser Agente 2').first().json.template;\\nconst reasoning = $('Parser Agente 2').first().json.reasoning;\\n\\nif (!sqlQuery) {\\n  throw new Error(\"Violación de Seguridad: No se detectó ninguna consulta SQL.\");\\n}\\n\\n// 2. Forzamos la regla de oro: Solo consultas SELECT por seguridad Zero-Trust\\nconst cleanQuery = sqlQuery.trim().toUpperCase();\\nif (!cleanQuery.startsWith(\"SELECT\")) {\\n  throw new Error(\"Violación de Seguridad: Únicamente se permiten consultas estructuradas de tipo SELECT.\");\\n}\\n\\n// 3. Si pasa las auditorías, devolvemos los datos limpios para el backend\\nreturn [{\\n  json: {\\n    reasoning: reasoning,\\n    sql: sqlQuery,\\n    template: template\\n  }\\n}];"
        },
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [-976, 64],
        "id": "9d3e5fe4-c552-438f-9d33-449e0731b23b",
        "name": "Code in JavaScript"
      }
    ],
    "connections": {
      "Webhook": {
        "main": [[{ "node": "Detect Engine", "type": "main", "index": 0 }]]
      },
      "Detect Engine": {
        "main": [[{ "node": "Context Agent", "type": "main", "index": 0 }]]
      },
      "Context Agent": {
        "main": [[{ "node": "Clear Schema Query", "type": "main", "index": 0 }]]
      },
      "Gemini Model (Context)": {
        "ai_languageModel": [[{ "node": "Context Agent", "type": "ai_languageModel", "index": 0 }]]
      },
      "Clear Schema Query": {
        "main": [[{ "node": "Query DB Schema", "type": "main", "index": 0 }]]
      },
      "Query DB Schema": {
        "main": [[{ "node": "Compliance Analyst (PII)", "type": "main", "index": 0 }]]
      },
      "Compliance Analyst (PII)": {
        "main": [[{ "node": "Clear PII JSON", "type": "main", "index": 0 }]]
      },
      "Clear PII JSON": {
        "main": [[{ "node": "Backend Anonymizer", "type": "main", "index": 0 }]]
      },
      "Backend Anonymizer": {
        "main": [[{ "node": "Agente Razonador y Generador SQL", "type": "main", "index": 0 }]]
      },
      "Agente Razonador y Generador SQL": {
        "main": [[{ "node": "Parser Agente 2", "type": "main", "index": 0 }]]
      },
      "Groq Chat Model (Qwen)": {
        "ai_languageModel": [[{ "node": "Agente Razonador y Generador SQL", "type": "ai_languageModel", "index": 0 }]]
      },
      "Parser Agente 2": {
        "main": [[{ "node": "Code in JavaScript", "type": "main", "index": 0 }]]
      },
      "Code in JavaScript": {
        "main": [[{ "node": "Agente de Seguridad y Validación", "type": "main", "index": 0 }]]
      },
      "Agente de Seguridad y Validación": {
        "main": [[{ "node": "Security Parser", "type": "main", "index": 0 }]]
      },
      "Groq Chat Model (Defog)": {
        "ai_languageModel": [[{ "node": "Agente de Seguridad y Validación", "type": "ai_languageModel", "index": 0 }]]
      },
      "Security Parser": {
        "main": [[{ "node": "Backend Execute", "type": "main", "index": 0 }]]
      }
    },
    "settings": {}
  };

  try {
    fs.writeFileSync('workflow_sin_rag.json', JSON.stringify(workflow, null, 2));
    console.log('workflow_sin_rag.json created.');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(workflow)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('Workflow SIN RAG imported successfully!');
      console.log(JSON.stringify(result, null, 2));
    } else {
      const errorText = await response.text();
      console.error(`Failed to import workflow: ${response.status} ${response.statusText}`);
      console.error('Response:', errorText);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

modifyAndImportWorkflow();
