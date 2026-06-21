
# Especificaciones Técnicas del Backend

## 1. Arquitectura y Stack Tecnológico

-   **Lenguaje**: Node.js (v18.x o superior)
-   **Framework**: Express (para la exposición de endpoints HTTP)
-   **Patrón Arquitectónico**: Arquitectura Hexagonal (Puertos y Adaptadores) para el aislamiento de la lógica de negocio.
    -   `src/core/domain`: Entidades y modelos de datos.
    -   `src/core/useCases`: Lógica de negocio principal.
    -   `src/core/ports`: Interfaces para adaptadores (entrantes y salientes).
    -   `src/adapters`: Implementaciones concretas de los puertos (ej. Express para controladores, Knex.js para acceso a datos, Axios para llamadas a n8n).

## 2. Estructura de Directorios

```bash
.
├── adapters/
│   ├── data/             # Implementaciones de puertos de salida (ej. Knex.js)
│   │   ├── knex/
│   │   │   ├── migrations/
│   │   │   ├── seeds/
│   │   │   └── index.ts
│   ├── external/         # Implementaciones de puertos salientes a servicios externos (ej. n8n)
│   │   ├── n8n/
│   │   │   ├── webhook-client.ts
│   │   │   └── index.ts
│   ├── web/              # Implementaciones de puertos entrantes (ej. Express controllers)
│   │   ├── controllers/
│   │   ├── routes/
│   │   └── index.ts
├── core/
│   ├── domain/           # Entidades y modelos de datos
│   │   ├── entities/
│   │   └── value-objects/
│   ├── ports/            # Interfaces de puertos (entrantes y salientes)
│   │   ├── in/
│   │   └── out/
│   └── useCases/         # Lógica de negocio principal
├── config/               # Configuraciones (ej. dotenv)
├── index.ts              # Punto de entrada de la aplicación
├── package.json
└── tsconfig.json
```

## 3. Modelado de Datos y Entidades

*Nota: Este modelo se basa en la suposición de que el backend interactúa con metadatos de bases de datos y no con datos de usuario directo. La estructura exacta de las tablas de la base de datos del cliente será dinámica y definida por la consulta a la base de datos.*

**Entidad Principal: `DatabaseSchema`**

| Campo        | Tipo               | Relación         | Descripción                                                              |
| :----------- | :----------------- | :--------------- | :----------------------------------------------------------------------- |
| `tables`     | `TableSchema[]`    | `TableSchema`    | Lista de tablas en el esquema de la base de datos.                       |
| `metadata`   | `Record<string, any>` | N/A              | Información adicional sobre el esquema (ej. versión, nombre BD).        |

**Entidad: `TableSchema`**

| Campo        | Tipo               | Relación         | Descripción                                                              |
| :----------- | :----------------- | :--------------- | :----------------------------------------------------------------------- |
| `name`       | `string`           | N/A              | Nombre de la tabla.                                                      |
| `columns`    | `ColumnSchema[]`   | `ColumnSchema`   | Lista de columnas de la tabla.                                           |
| `primaryKey` | `string[]`         | N/A              | Nombres de las columnas que forman la clave primaria.                    |
| `foreignKeys`| `ForeignKey[]`     | `ForeignKey`     | Lista de claves foráneas.                                                |
| `isView`     | `boolean`          | N/A              | Indica si es una vista o una tabla.                                      |

**Entidad: `ColumnSchema`**

| Campo        | Tipo               | Relación         | Descripción                                                              |
| :----------- | :----------------- | :--------------- | :----------------------------------------------------------------------- |
| `name`       | `string`           | N/A              | Nombre de la columna.                                                    |
| `type`       | `string`           | N/A              | Tipo de dato de la columna (ej. `VARCHAR`, `INT`, `TIMESTAMP`, `BOOLEAN`). |
| `isNullable` | `boolean`          | N/A              | Indica si la columna permite valores nulos.                              |
| `isPII`      | `boolean`          | N/A              | Indicador de si la columna contiene Información Personal Identificable (PII). |

**Entidad: `ForeignKey`**

| Campo           | Tipo     | Relación | Descripción                                                              |
| :-------------- | :------- | :------- | :----------------------------------------------------------------------- |
| `columnName`    | `string` | N/A      | Nombre de la columna que es clave foránea.                               |
| `referencesTable` | `string` | N/A      | Nombre de la tabla referenciada.                                         |
| `referencesColumn`| `string` | N/A      | Nombre de la columna referenciada en la tabla ajena.                     |

## 4. Diseño de la API

| Endpoint                  | Método | Descripción                                                                                                    | Payload de Entrada (JSON)                                                                                                                                 | Payload de Salida (JSON)                                                                                                                                          |
| :------------------------ | :----- | :------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/v1/schema`          | `POST` | Extrae y analiza el esquema de la base de datos proporcionada. Requiere configuración de conexión en `.env`.      | `{ "dbConfig": { "client": "pg", "connection": { "host": "...", "user": "...", "password": "...", "database": "..." } } }` (Knex.js compatible)           | `{ "schema": DatabaseSchema }` (Ver sección 3 para estructura detallada)                                                                                            |
| `/api/v1/query`           | `POST` | Genera y ejecuta una consulta SQL segura basada en lenguaje natural y el esquema proporcionado.                 | `{ "naturalLanguageQuery": "Mostrar los últimos 10 usuarios registrados", "schema": DatabaseSchema }`                                                      | `{ "sqlQuery": "SELECT * FROM users ORDER BY created_at DESC LIMIT 10;", "results": [...] }` (Los resultados son un array de objetos JSON o un mensaje de error) |
| `/api/v1/query/execute`   | `POST` | Ejecuta una consulta SQL pre-generada (para doble auditoría o ejecución directa).                               | `{ "sqlQuery": "SELECT * FROM users WHERE id = 1;" }`                                                                                                    | `{ "results": [...] }` (Los resultados son un array de objetos JSON o un mensaje de error)                                                                        |
| `/api/v1/query/audit`     | `POST` | Realiza una doble auditoría de seguridad sobre una consulta SQL generada o proporcionada.                      | `{ "sqlQuery": "SELECT * FROM users;" }`                                                                                                                  | `{ "isSafe": true/false, "auditReport": "..." }`                                                                                                                  |
| `/api/v1/status/n8n`      | `GET`  | Verifica el estado del servidor n8n (disponible o no).                                                         | N/A                                                                                                                                                       | `{ "status": "operational" | "degraded" | "down" }`                                                                                                                                        |

## 5. Seguridad, Middlewares y Validaciones

-   **Autenticación**: No se implementa autenticación de usuario directo en el backend. La seguridad se basa en:
    -   Conexiones a bases de datos con credenciales de solo lectura y permisos restringidos.
    -   Validaciones y sanitización de entradas en la API.
    -   Inyección de cláusulas `LIMIT 100;` en todas las consultas generadas.
    -   Doble auditoría de seguridad automatizada (scripts y agentes LLM).
    -   Aislamiento de datos: Los LLM externos solo operan con metadatos filtrados/cifrados. La ejecución y manipulación de datos ocurre localmente.
-   **Middlewares**:
    -   `express.json()`: Para parsear cuerpos de solicitud JSON.
    -   `cors`: Para habilitar Cross-Origin Resource Sharing (configurar según necesidad).
    -   Middleware de validación de esquemas (ej. con `express-validator` o `joi`).
    -   Middleware de logging.
-   **Validaciones**:
    -   Validación de la configuración de conexión a la base de datos.
    -   Validación de la consulta en lenguaje natural.
    -   Validación de la estructura del esquema recibido.
    -   Validación estricta de las consultas SQL generadas antes de la ejecución.
-   **Variables de Entorno (`.env`)**:
    -   `NODE_ENV`: `development` | `production`
    -   `PORT`: Puerto de escucha del servidor Express.
    -   `CORS_ORIGIN`: Orígenes permitidos para CORS.
    -   `DATABASE_CLIENT`: Cliente de la base de datos principal para el backend (ej. `pg`, `mysql2`, `sqlite3`).
    -   `DATABASE_HOST`: Host de la base de datos principal.
    -   `DATABASE_PORT`: Puerto de la base de datos principal.
    -   `DATABASE_USER`: Usuario de la base de datos principal.
    -   `DATABASE_PASSWORD`: Contraseña de la base de datos principal.
    -   `DATABASE_NAME`: Nombre de la base de datos principal.
    -   `N8N_WEBHOOK_URL`: URL del webhook de n8n para la orquestación de IA.
    -   `N8N_API_KEY`: Clave API para autenticación con n8n (si aplica).
    -   `LLM_EMBEDDING_MODEL`: Modelo de embeddings (ej. `models/gemini-embedding-001`).
    -   `LLM_CONTEXT_MODEL`: Modelo para contexto y PII (ej. `models/gemini-2.5-flash-lite`).
    -   `LLM_SQL_GENERATOR_MODEL`: Modelo para generación SQL (ej. `models/qwen/qwen3-32b`).
    -   `LLM_SECURITY_AUDIT_MODEL`: Modelo para auditoría de seguridad (ej. `openai/gpt-oss-120b`).
    -   `LLM_GROQ_API_KEY`: Clave API para Groq.

## 6. Roadmap de Implementación Paso a Paso

1.  **Configuración Inicial del Proyecto**:
    *   Inicializar proyecto Node.js (`npm init -y`).
    *   Instalar dependencias: `express`, `knex`, `dotenv`, `axios`, `@types/node`, `typescript`, `ts-node`, `@types/express`, `@types/cors`.
    *   Configurar `tsconfig.json` y `.env.example`.
    *   Definir la estructura básica de directorios (`src/core`, `src/adapters`, etc.).
2.  **Implementación del Core (Arquitectura Hexagonal)**:
    *   Definir entidades y value objects (`core/domain`).
    *   Definir interfaces de puertos (`core/ports`).
    *   Implementar casos de uso básicos (`core/useCases`) que operen sobre las interfaces de puertos.
3.  **Implementación de Adaptadores**:
    *   **Web Adapter**:
        *   Configurar servidor Express (`adapters/web/index.ts`).
        *   Crear controladores para cada endpoint API (`adapters/web/controllers`).
        *   Definir rutas (`adapters/web/routes`).
        *   Implementar middlewares de validación y seguridad.
        *   Inyectar puertos de salida en los controladores.
    *   **Data Adapter (Knex.js)**:
        *   Configurar la conexión a la base de datos usando `knexfile.ts` y las variables de entorno (`adapters/data/knex`).
        *   Implementar el puerto de acceso a datos (`core/ports/out/data-access.port.ts`) para la introspección del esquema y ejecución de consultas.
        *   Asegurar que todas las consultas generadas incluyan `LIMIT 100;`.
    *   **n8n Webhook Client**:
        *   Implementar cliente para llamar al webhook de n8n (`adapters/external/n8n/webhook-client.ts`).
        *   Manejar la configuración y la autenticación (API Key) si es necesaria.
4.  **Integración y Lógica de Orquestación**:
    *   Conectar los controladores Express con los casos de uso del core.
    *   Conectar los casos de uso con los adaptadores de datos y el cliente de n8n.
    *   Implementar la lógica para:
        *   Recibir la configuración de BD y extraer el esquema.
        *   Recibir la consulta en lenguaje natural y el esquema, y enviarlos al webhook de n8n.
        *   Procesar la respuesta de n8n (consulta SQL generada y resultados).
        *   Ejecutar la doble auditoría de seguridad.
        *   Ejecutar la consulta SQL (si es segura) y devolver los resultados.
5.  **Seguridad y Validaciones**:
    *   Implementar validaciones robustas para todas las entradas de la API.
    *   Refinar la lógica de auditoría de seguridad en el backend.
    *   Configurar CORS adecuadamente.
6.  **Pruebas**:
    *   Escribir tests unitarios para los casos de uso y los adaptadores (mockeando dependencias).
    *   Escribir tests de integración para los endpoints de la API.
    *   Configurar tests parametrizados para Knex.js con diferentes motores de BD (SQLite para testing es ideal).
7.  **Despliegue y Documentación**:
    *   Crear Dockerfile para el backend.
    *   Documentar la API con OpenAPI/Swagger.
    *   Generar diagramas de arquitectura (C4Model).
    *   Refinar el archivo `README.md` con instrucciones de configuración y ejecución.
