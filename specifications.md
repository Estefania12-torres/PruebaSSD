# Especificaciones Técnicas: Backend NL2SQL sin Anonimización

Este documento describe la arquitectura y especificaciones del backend diseñado para la traducción de Lenguaje Natural a SQL (NL2SQL), utilizando **Arquitectura Hexagonal (Puertos y Adaptadores)** y Node.js. 

En esta versión del diseño, **se elimina por completo la capa de anonimización** para simplificar la interacción directa entre el agente de IA (n8n) y las bases de datos del cliente a través del backend.

---

## 1. Arquitectura General

El backend se organiza bajo los principios de la Arquitectura Hexagonal para asegurar que la lógica de negocio esté completamente desacoplada de los detalles tecnológicos (como el framework web Express, el ORM/Query Builder Knex, o el cliente HTTP Axios).

```mermaid
graph TD
    subgraph Adaptadores de Entrada (Inbound Adapters)
        HTTP[Express Router & Controllers]
    end

    subgraph Núcleo de la Aplicación (Core)
        UseCases[Casos de Uso]
        Models[Modelos de Dominio]
        Services[Servicios de Dominio]
        PortsOut[Puertos de Salida - Interfaces]
    end

    subgraph Adaptadores de Salida (Outbound Adapters)
        Knex[KnexDatabaseAdapter]
        N8n[N8nHttpAdapter]
    end

    %% Relaciones
    HTTP --> UseCases
    UseCases --> Models
    UseCases --> Services
    UseCases --> PortsOut
    Knex -.-> PortsOut
    N8n -.-> PortsOut
```

---

## 2. Estructura de Directorios Propuesta

```text
backend-n8n-sql/
├── config/
│   └── constants.js             # Variables de entorno y constantes globales
├── src/
│   ├── core/
│   │   ├── domain/              # Lógica pura de negocio (Entidades, Modelos, Servicios)
│   │   │   ├── AskModel.js      # Modelo de validación de preguntas
│   │   │   └── services/
│   │   │       └── FormatterService.js # Formateo de resultados (Markdown/Templates)
│   │   ├── ports/
│   │   │   └── out/             # Interfaces (contratos) hacia el exterior
│   │   │       ├── DatabasePort.js
│   │   │       └── OrchestratorPort.js
│   │   └── useCases/            # Casos de uso (Orquestación del dominio)
│   │       ├── AskUseCase.js
│   │       ├── ExecuteSqlUseCase.js
│   │       └── RunRawQueryUseCase.js
│   ├── adapters/
│   │   ├── in/                  # Adaptadores de entrada (Controladores HTTP)
│   │   │   └── http/
│   │   │       ├── controllers/
│   │   │       │   ├── AskController.js
│   │   │       │   └── DbController.js
│   │   │       └── routes.js    # Definición de rutas e Inyección de dependencias
│   │   └── out/                 # Adaptadores de salida (Tecnología exterior)
│   │       ├── database/
│   │       │   └── KnexDatabaseAdapter.js # Conectividad dinámica multibase de datos
│   │       └── orchestrator/
│   │           └── N8nHttpAdapter.js      # Comunicación HTTP con n8n
│   └── infrastructure/          # Servidor Express, Middlewares y Utilidades
│       ├── server.js
│       └── utils/
│           ├── errorHandler.js
│           └── responseFormatter.js
├── bin/
│   └── www                      # Script de inicio del servidor
├── package.json
└── .env
```

---

## 3. Especificación de Componentes

### 3.1. Núcleo (Core)

#### `AskModel.js` (Modelo de Dominio)
Representa la estructura y reglas de validación básicas para una consulta de usuario.
* **Atributos:**
  * `connection_string` (String, requerido)
  * `question` (String, requerido)
* **Métodos:**
  * `validate()`: Verifica que los campos requeridos estén presentes y sean válidos.

#### `FormatterService.js` (Servicio de Dominio - *Reemplazo de AnonymizerService*)
Contiene la lógica utilitaria para transformar datos de base de datos a formatos legibles para LLMs.
* **Responsabilidades:**
  * `formatResultsToMarkdown(results)`: Toma un arreglo de objetos JSON (filas de BD) y genera una tabla Markdown válida.
  * `populateTemplate(templateString, results)`: Toma una plantilla de respuesta generada por la IA que contenga la palabra clave `{{DATOS}}` (o similar) y la reemplaza por la tabla Markdown de resultados. Si no hay plantilla, concatena la tabla al final de un texto por defecto.

#### `DatabasePort.js` & `OrchestratorPort.js` (Puertos de Salida)
Clases base (interfaces abstractas) que definen el contrato que deben cumplir los adaptadores exteriores:
* `DatabasePort`: `executeQuery(connectionString, sqlQuery)`
* `OrchestratorPort`: `triggerWorkflow(connectionString, question)`

#### `AskUseCase.js` (Caso de Uso)
Orquesta el envío de una nueva pregunta hacia el motor del flujo de IA (n8n).
1. Valida los datos utilizando `AskModel`.
2. Llama a `OrchestratorPort.triggerWorkflow(connectionString, question)` para iniciar el flujo de n8n.
3. Devuelve la respuesta generada por n8n.

#### `ExecuteSqlUseCase.js` (Caso de Uso)
*Simplificado al eliminar la anonimización.*
1. Recibe la consulta SQL directa, la cadena de conexión y la plantilla de respuesta (`llm_template`).
2. Ejecuta la consulta SQL directamente en la base de datos a través de `DatabasePort.executeQuery`.
3. Utiliza `FormatterService.populateTemplate` para inyectar los resultados en la plantilla.
4. Devuelve la respuesta redactada con los datos integrados y los datos puros.

#### `RunRawQueryUseCase.js` (Caso de Uso)
1. Recibe la consulta SQL y la cadena de conexión.
2. Limpia marcas markdown adicionales (ej. ```sql ... ```).
3. Ejecuta la consulta directa mediante `DatabasePort.executeQuery`.
4. Retorna el set de datos en formato JSON nativo.

### 3.3. Componentes del Flujo de Agentes (n8n)

El flujo de n8n opera con un diseño multi-agente para asegurar que la generación y validación de la consulta SQL se realice dinámicamente y con validaciones de seguridad:

1. **Detect Engine**: Nodo de código JavaScript que detecta automáticamente el motor de la base de datos (PostgreSQL, MySQL, SQLite, Oracle) a partir del prefijo de la cadena de conexión.
2. **Agente de Contexto (Context Agent)**: Agente de IA (Gemini 3.1 Flash Lite) que genera dinámicamente la consulta SQL de extracción de metadatos (tablas y columnas) basada en el motor detectado.
3. **Clear Schema Query**: Nodo de código JavaScript que limpia y normaliza la salida del Agente de Contexto para asegurar que contenga únicamente el SQL de metadatos listo para ser ejecutado.
4. **Agente Razonador y Generador SQL**: Agente de IA (Qwen 3 32B vía Groq) que analiza la pregunta en lenguaje natural y genera la consulta SQL final (SELECT) y la plantilla de respuesta utilizando el esquema completo devuelto por el backend.
5. **Agente de Seguridad y Validación**: Agente de IA (Defog vía Groq) que audita la consulta SQL generada para evitar cualquier tipo de inyección, modificaciones destructivas (como DROP, UPDATE, DELETE) o anomalías de formato.

---

## 4. Rutas y Endpoints HTTP

El backend expone una API REST para intercomunicar el Front-End (interfaz de usuario), el backend del cliente y el flujo del agente de IA en n8n.

### 4.1. `POST /api/v1/ask`
Inicia el flujo de procesamiento de una pregunta en lenguaje natural.
* **Cuerpo de la Petición (Request Body):**
  ```json
  {
    "connection_string": "postgres://usuario:password@host:port/database",
    "question": "¿Cuáles son los 5 clientes con mayores compras este mes?"
  }
  ```
* **Respuesta Exitosa (Response):**
  ```json
  {
    "status": "cod_ok",
    "data": {
      "answer": "Los 5 clientes con mayores compras este mes son:\n\n| Cliente | Total Compras |\n| --- | --- |\n| Juan Pérez | $5,430.00 |\n| María López | $4,890.00 |"
    },
    "message": "Flujo NL2SQL ejecutado correctamente"
  }
  ```

### 4.2. `POST /api/execute`
*Endpoint utilizado por el Agente de IA en n8n.* Ejecuta una consulta SQL y formatea los resultados en una plantilla textual para el LLM.
* **Cuerpo de la Petición:**
  ```json
  {
    "connection_string": "postgres://...",
    "sql": "SELECT name, total FROM clients ORDER BY total DESC LIMIT 2",
    "llm_template": "De acuerdo con el análisis, aquí tienes los mejores clientes: {{DATOS}}"
  }
  ```
* **Respuesta Exitosa:**
  ```json
  {
    "status": "cod_ok",
    "data": {
      "answer": "De acuerdo con el análisis, aquí tienes los mejores clientes: \n\n| name | total |\n| --- | --- |\n| Juan Pérez | 5430.00 |\n| María López | 4890.00 |",
      "raw_data": [
        { "name": "Juan Pérez", "total": 5430.00 },
        { "name": "María López", "total": 4890.00 }
      ]
    },
    "message": "Consulta ejecutada y ensamblada con éxito"
  }
  ```

### 4.3. `POST /api/query`
*Endpoint de utilidad.* Ejecuta una consulta SQL directa y retorna los datos crudos en formato JSON.
* **Cuerpo de la Petición:**
  ```json
  {
    "connection_string": "postgres://...",
    "sql": "SELECT COUNT(*) FROM logs"
  }
  ```
* **Respuesta Exitosa:**
  ```json
  {
    "status": "cod_ok",
    "data": [
      { "count": "15340" }
    ],
    "message": "Consulta en crudo ejecutada con éxito"
  }
  ```

---

## 5. Respuestas Estándar y Manejo de Errores

### Formato de Respuestas Exitosas
```json
{
  "status": "cod_ok",
  "data": {},
  "message": "Mensaje descriptivo"
}
```

### Formato de Errores
```json
{
  "status": "cod_error",
  "error_code": "DB_QUERY_FAILED",
  "detail": "Detalle técnico del error (ej. Syntax error near WHERE)",
  "message": "Mensaje amigable para el usuario final"
}
```

---

## 6. Flujo de Información (Paso a Paso)

```mermaid
sequenceDiagram
    autonumber
    actor Usuario
    participant Backend as Backend Express
    participant n8n as n8n AI Agent Workflow
    participant DB as Base de Datos Cliente

    Usuario->>Backend: POST /api/v1/ask (pregunta + conexión)
    Backend->>n8n: POST (Webhook de Entrada)
    
    Note over n8n: Detecta el motor de BD<br/>(Detect Engine)
    Note over n8n: El Agente de Contexto (Context Agent)<br/>genera consulta del esquema
    n8n->>Backend: POST /api/query (SQL esquema + conexión)
    Backend->>DB: Ejecuta consulta de metadatos del esquema
    DB-->>Backend: Retorna metadatos crudos
    Backend-->>n8n: Retorna esquema en JSON
    
    Note over n8n: El Agente Razonador genera<br/>consulta SQL final + plantilla
    Note over n8n: El Agente de Seguridad<br/>audita la consulta SQL
    
    n8n->>Backend: POST /api/execute (SQL final + plantilla)
    Backend->>DB: Ejecuta la consulta SQL directamente
    DB-->>Backend: Retorna datos crudos de negocio (JSON)
    Note over Backend: Formatea datos a Markdown<br/>y rellena la plantilla (FormatterService)
    Backend-->>n8n: Retorna respuesta formateada + datos crudos
    Note over n8n: El flujo consolida y finaliza la respuesta
    n8n-->>Backend: Retorna respuesta final estructurada
    Backend-->>Usuario: Retorna JSON con la respuesta final (Markdown)
```

### Descripción del Proceso:

1. **Petición del Usuario**: El usuario envía la pregunta en lenguaje natural y la cadena de conexión cifrada a `/api/v1/ask`.
2. **Orquestación en n8n**: El backend redirige la petición al webhook de n8n.
3. **Detección del Entorno**: El paso de código `Detect Engine` en n8n parsea el tipo de base de datos del cliente (PostgreSQL, MySQL, SQLite, Oracle).
4. **Generación de Consulta del Esquema**: El **Agente de Contexto (Context Agent)** escribe dinámicamente la consulta para extraer la metadata (tablas y columnas) en base al motor detectado.
5. **Extracción del Esquema**: n8n invoca la ruta de utilidad `/api/query` del backend para ejecutar la consulta del esquema. El backend realiza la consulta y le devuelve el esquema de la BD en formato JSON.
6. **Razonamiento y Escritura de SQL**: El **Agente Razonador y Generador SQL** evalúa la pregunta del usuario junto al esquema completo y genera la consulta SQL final (con cláusula de límite de seguridad) y una plantilla que contiene el tag `{{DATOS}}`.
7. **Auditoría de Seguridad**: El **Agente de Seguridad y Validación** y validaciones duras en JS verifican que la consulta sea únicamente de tipo `SELECT` y no contenga inyecciones de código.
8. **Ejecución de Consulta y Formateo**: n8n envía el SQL validado y la plantilla a `/api/execute`. El backend ejecuta la query final en la base de datos del cliente, convierte los resultados JSON a una tabla Markdown y rellena la plantilla del agente usando el servicio `FormatterService`.
9. **Entrega del Reporte**: Los resultados formateados se regresan a n8n, el cual los consolida y responde de manera sincrónica al backend. Finalmente, el backend devuelve el reporte completo en Markdown al usuario.
