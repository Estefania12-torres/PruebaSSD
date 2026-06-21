# Arquitectura Multiagente Basado en LLMs y RAG para la Generación Segura de Consultas SQL a partir de Lenguaje Natural en Bases de Datos Relacionales


**Especificación técnica y de producto siguiendo el formato Spec-First**
**Contexto del Sistema:** Backend Express en Node.js (Arquitectura Hexagonal) + Flujo de Agentes de IA en n8n

--- 

## Sección 1 — Visión del Producto

**Tu visión:**

> La **Arquitectura Multiagente Basado en LLMs y RAG para la Generación Segura de Consultas SQL a partir de Lenguaje Natural en Bases de Datos Relacionales** es un sistema seguro de traducción de lenguaje natural a SQL que permite a desarrolladores e ingenieros consultar bases de datos relacionales mediante IA sin exponer jamás datos reales ni metadatos sensibles (nombres de tablas o columnas) a modelos externos. Resuelve el problema crítico de la privacidad y cumplimiento normativo (GDPR/PII compliance) al integrar Inteligencia Artificial en entornos corporativos con datos confidenciales.


---

## Sección 2 — Usuarios y Casos de Uso

**Tus usuarios:**

| Usuario | Descripción | Casos de uso |
|---|---|---|
| **Principal (Desarrollador / Ingeniero de Datos)** | Profesional técnico que necesita integrar capacidades de lenguaje natural para consultar bases de datos de forma rápida, ágil y, sobre todo, segura. | 1. Envía una consulta en lenguaje natural (ej: *"¿Cuáles clientes compraron más de $1000 ayer?"*) y recibe un set de resultados descifrado y formateado en Markdown.<br>2. Expone y consume los endpoints del backend en sus aplicaciones cliente (BFF / API REST).<br>3. Ejecuta validaciones rápidas del esquema anonimizado y el motor de base de datos. |
| **Secundario (Auditor de Seguridad / Oficial de Compliance)** | Responsable de velar por la protección de datos personales (PII) y de garantizar que no ocurran fugas de información hacia APIs públicas de IA (como OpenAI, Anthropic, Gemini). | 1. Define qué tablas y columnas del esquema real de la base de datos se consideran sensibles (PII).<br>2. Audita que todas las peticiones que salen a internet hacia n8n e LLMs vayan 100% anonimizadas.<br>3. Monitorea que no se ejecuten queries destructivas (INSERT/UPDATE/DELETE/DROP) en la base de datos local. |

---

## Sección 3 — Funcionalidades

### [Área 1: Backend Gateway y Seguridad Perimetral (Node.js - Hexagonal)]
- **El usuario puede** enviar una pregunta en lenguaje natural junto con su cadena de conexión cifrada a través del endpoint `POST /api/v1/ask`.
- **El sistema permite** la extracción dinámica de metadatos estructurales (`information_schema`) de la base de datos seleccionada mediante Knex.
- **El sistema anonimiza** de forma bidireccional y en memoria todos los nombres de tablas y atributos sensibles marcados como PII, sustituyéndolos por alias genéricos (ej: `Atributo_1`, `Atributo_2`), garantizando el enfoque de **Cero Confianza (Zero-Trust)**.
- **El sistema desanonimiza** la consulta SQL generada por la IA antes de su ejecución local, sustituyendo los alias genéricos por los nombres de base de datos reales.
- **El sistema puebla** la plantilla de texto devuelta por la IA reemplazando marcadores como `{{DATOS}}` con los registros reales de la base de datos formateados en una tabla Markdown clara.

### [Área 2: Orquestación e IA Multi-Agente (n8n Workflow)]
- **El sistema detecta** automáticamente el motor de base de datos (PostgreSQL, MySQL, SQLite, Oracle, SQL Server) en base al connection string provisto.
- **El Context Agent (Gemini 2.5 Flash) genera** la consulta SQL óptima para la extracción de metadatos del motor correspondiente.
- **El PII Analyst Agent (Gemini 2.5 Flash) identifica** los campos y tablas vulnerables que contienen información privada (nombres, cédulas, teléfonos, salarios) y genera una lista estructurada en JSON para su anonimización en el backend.
- **El Reasoner Agent (DeepSeek Chat v4-flash) planea** la lógica semántica de la consulta comparando la pregunta del usuario con el esquema enmascarado/encriptado recibido del backend.
- **El SQL Gen Agent (Qwen2.5-Coder-32B) traduce** el plan lógico a código SQL seguro utilizando únicamente nombres de variables anonimizados e imponiendo un límite de seguridad (`LIMIT 100`).
- **El Security Agent (Defog SQLCoder 70b) audita** sintáctica y semánticamente el SQL resultante para bloquear comandos de manipulación de datos (DML) o estructurales (DDL) como DROP, DELETE, INSERT o UPDATE.
- **El Final Interpreter (Gemini 2.5 Flash) redacta** un análisis profesional de dos líneas sobre los datos consultados y coloca la etiqueta `{{DATOS}}` en la plantilla de salida.

### Estados:
- **El sistema muestra** una respuesta exitosa con la estructura JSON `{ status: 'cod_ok', data: '...' }` cuando el pipeline de agentes y el backend resuelven la consulta correctamente.
- **El sistema muestra** un error controlado del tipo `ANONYMIZATION_FAILED`, `DEANONYMIZATION_FAILED` o `Security Violation` si alguna etapa falla o se detecta un comportamiento anómalo.
- **El sistema bloquea** y retorna un código de error si el Agente de Seguridad detecta palabras clave prohibidas o si la cadena SQL generada no contiene la instrucción `SELECT`.

### Fuera del alcance (v1):
- No incluye autenticación de usuarios, roles de acceso ni persistencia de sesiones en el backend (diseño stateless).
- No incluye un panel o interfaz de usuario (Dashboard) para configurar las reglas de PII de manera visual (se consume vía REST API).
- No incluye soporte para bases de datos NoSQL (ej: MongoDB, Redis, DynamoDB).
- No incluye exportación de informes a formatos como PDF o Excel (únicamente tablas en Markdown).

---

## Sección 4 — Flujos de Usuario

### Flujo principal — Consultar Base de Datos con Lenguaje Natural:
1. El usuario envía un request POST a `/api/v1/ask` con la pregunta en lenguaje natural y la cadena de conexión de su base de datos.
2. El backend (Express) recibe la solicitud e inicia el flujo seguro enviando los datos iniciales al Webhook de n8n.
3. n8n detecta el motor de base de datos y pide al backend el esquema de metadatos llamando a `/api/query`.
4. n8n analiza el esquema con el Agente de PII y pide al backend anonimizar las tablas/columnas sensibles llamando a `/api/anonymize`.
5. El backend genera un mapeo bidireccional volátil en memoria, traduce el esquema a nombres genéricos (ej: `Atributo_1`) y lo devuelve a n8n.
6. Los agentes de n8n (Reasoner, SQL Gen, Security, Interpreter) planean, generan y auditan el SQL anonimizado, y crean la plantilla de respuesta final con el token `{{DATOS}}`.
7. n8n envía el SQL seguro, la plantilla y la cadena de conexión de regreso al backend llamando a `/api/execute`.
8. El backend desanonimiza el SQL sustituyendo los alias por los nombres reales, ejecuta la consulta de forma local con Knex, convierte los resultados en una tabla Markdown y la inyecta en la plantilla reemplazando el marcador `{{DATOS}}`.
9. El backend devuelve la respuesta final con el análisis redactado y los datos reales integrados al usuario.

### Flujo de error — Intento de Inyección de SQL o Consulta No SELECT:
1. El SQL Gen Agent genera un SQL incorrecto o el usuario induce al sistema a generar comandos maliciosos (ej: `DROP TABLE Atributo_1;`).
2. El Security Agent audita el SQL, detecta el comando destructivo o no válido y devuelve una respuesta con la palabra "ERROR".
3. El Security Parser (Code Node de n8n) detecta la palabra "ERROR" y arroja una excepción controlada: *"Validación fallida por el Agente de Seguridad"*.
4. El flujo de n8n se detiene, el webhook retorna el error y el backend Express responde al cliente con un código de error HTTP `400/500` y el mensaje de infracción de seguridad, impidiendo que la consulta toque la base de datos real.

---

## Sección 5 — Arquitectura

| Componente | Tecnología | Función |
|---|---|---|
| **Frontend/Cliente** | Cliente REST (Postman / App Web) | Envía la pregunta en lenguaje natural y la cadena de conexión. Recibe la respuesta final. |
| **Backend** | Node.js + Express (Arquitectura Hexagonal) | BFF / API Gateway. Ejecuta la anonimización/desanonimización en memoria, realiza la conexión Knex y ejecuta el SQL real. |
| **Base de Datos** | Postgres, MySQL, SQLite, Oracle, MSSQL | Motor relacional local o remoto del cliente que contiene la información real y el `information_schema`. |
| **Orquestador (IA)** | n8n (Motor Multi-Agente) | Orquesta el pipeline de agentes de IA y la lógica de control. Se comunica con el backend mediante peticiones HTTP. |
| **Modelos de IA** | Gemini 2.5 Flash, DeepSeek Chat, Qwen2.5-Coder, Defog SQLCoder | Proveedores de lenguaje e inferencia que planifican, estructuran, generan y auditan las consultas del motor. |

### Flujo de datos:
```
Usuario → [Backend: /api/v1/ask] → [n8n Webhook] → [n8n Agents + LLMs] → [Backend: /api/anonymize] (anonimización) → [n8n Agents (SQL Gen & Security)] → [Backend: /api/execute] (ejecución & desanonimización) → Usuario
```

---

## Sección 6 — Requisitos No Funcionales

### Rendimiento:
- La latencia total de extremo a extremo (desde la pregunta hasta el markdown con datos) no debe superar los 35 segundos en promedio, limitando la latencia del backend a menos de 500ms (excluyendo llamadas a LLM).
- La base de datos debe ser consultada con un límite de registros estricto (`LIMIT 100`) para evitar transferencias masivas de datos y caídas de memoria.

### Seguridad:
- **Cero Confianza (Zero-Trust):** Ningún dato real (filas) ni metadato sensible (nombres de columnas/tablas PII) se transmite fuera del servidor local del cliente hacia n8n o APIs de LLM externas.
- Las variables críticas como API Keys, URL del backend e información de firmas se configuran mediante variables de entorno seguras (`.env`).
- Restricción estricta de consultas a nivel de transporte y ejecución (únicamente consultas del tipo `SELECT`).

### Accesibilidad:
- Los endpoints HTTP siguen los estándares RESTful utilizando formato JSON para el request y response.
- El sistema de base de datos es compatible con múltiples motores relacionales de manera agnóstica gracias al ORM/Query Builder Knex.js.

### Fuera del alcance (v1):
- No incluye autenticación OAuth ni JWT de manera nativa en el backend gateway.
- No incluye caché de consultas desanonimizadas para evitar riesgos de almacenamiento persistente de datos en claro.
- No incluye soporte para motores de almacenamiento de Big Data (ej: Snowflake, BigQuery) en esta versión inicial.

---

## Checklist final

- [x] **Visión** — ¿Cabe en 2 oraciones y es clara?
- [x] **Usuarios** — ¿Están descritos como personas reales con acciones concretas?
- [x] **Funcionalidades** — ¿Cada una empieza con "El usuario puede..." o "El sistema..."?
- [x] **Flujos** — ¿Tienen pasos numerados Y flujo de error?
- [x] **Arquitectura** — ¿Las tecnologías están elegidas y el flujo de datos es claro?
- [x] **Requisitos** — ¿Incluyen lo que está FUERA del alcance?
