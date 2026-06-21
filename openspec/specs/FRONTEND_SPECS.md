# Especificaciones Técnicas del Frontend: AI SQL Dashboard

## 1. Visión General
El Frontend es una interfaz de usuario de página única (SPA) diseñada con **Stitch** para permitir a los usuarios interactuar con el pipeline de IA del backend. Su propósito es capturar consultas en lenguaje natural, coordinar la petición asíncrona al servidor y renderizar de forma dual los resultados de los datos (Tablas) y la lógica generada (SQL). Incluye además un módulo de configuración de cadena de conexión persistente con gestión segura y validaciones anti-inyección.

## 2. Identidad Visual y UX (User Experience)
Se adopta un enfoque de **Dashboard Moderno** con las siguientes pautas:
- **Modo de Color**: Dark Mode predominante.
  - Fondo Principal: `bg-slate-950` o `bg-zinc-900`.
  - Superficies/Tarjetas: `bg-slate-900` con bordes `border-slate-800`.
  - Acentos: `text-indigo-400` o `bg-indigo-600` para botones y elementos activos.
  - Texto: `text-slate-300` (secundario) y `text-white` (principal).
- **Responsividad**: Implementación mediante Tailwind CSS utilizando un sistema de rejilla (`grid`) que colapse de 2 columnas a 1 en dispositivos móviles.

## 3. Arquitectura de la Interfaz (Layout)

### 3.1. Módulo de Configuración de Cadena de Conexión (Connection Manager)

Este módulo gestiona la cadena de conexión a la base de datos. Es el **primer elemento visible** al cargar la app si no existe una cadena configurada.

#### 3.1.1. Flujo de Primera Vez (Onboarding)
- **Trigger**: Si `localStorage.getItem('db_connection_string')` es `null` o vacío, se muestra un modal/panel de configuración **bloqueante** antes de permitir el uso de la app.
- **Componente**: Modal centrado con overlay oscuro (`bg-black/70`).
- **Campos**:
  - `<input type="password">` etiquetado como "Cadena de Conexión a la Base de Datos".
  - Placeholder: `postgresql://usuario:contraseña@host:5432/db` o equivalente.
  - Atributo: `id="connection-string-input"`, `autocomplete="off"`.
- **Acción**: Botón "Guardar y Conectar":
  1. Ejecuta validación de formato (ver sección 7).
  2. Si válido: almacena en `localStorage` con clave `db_connection_string` y cierra el modal.
  3. Si inválido: muestra mensaje de error inline debajo del campo.
- **Comportamiento**: Una vez guardada, el modal **no vuelve a aparecer** en recargas posteriores.

#### 3.1.2. Panel de Gestión de la Cadena (Estado Configurado)
- **Ubicación**: Barra superior del dashboard o sección colapsable en el sidebar.
- **Visualización**: La cadena se muestra **enmascarada** (`postgresql://***:***@host:5432/db`) — nunca en texto plano.
- **Acciones disponibles**:
  - **Editar** (ícono lápiz `✏️`): Abre el mismo modal de configuración pre-cargado. Al guardar sobreescribe el valor en `localStorage`.
  - **Eliminar** (ícono basura `🗑️`): Muestra un diálogo de confirmación (`¿Estás seguro? Esto eliminará la conexión configurada.`). Al confirmar: elimina `localStorage.removeItem('db_connection_string')` y recarga el módulo de onboarding.
- **Integración con el Backend**:
  - La cadena de conexión almacenada se **inyecta automáticamente** en cada petición `POST /api/v1/query` dentro del campo `connection_string` del payload JSON.
  - El frontend **nunca expone** la cadena en logs de consola ni en atributos HTML visibles.

### 3.2. Panel de Entrada (Input Section)
- **Requisito previo**: El panel de entrada solo es interactuable si existe una `connection_string` válida en `localStorage`. De lo contrario, el botón "Enviar" está deshabilitado con tooltip `"Configure primero la conexión a la base de datos"`.
- **Contenedor**: Centrado en la pantalla con un ancho máximo (`max-w-4xl`).
- **Campo de Consulta**:
  - Elemento `<textarea>` expansible.
  - Estilo: `bg-slate-800`, `border-slate-700`, `rounded-lg`, `p-4`, `focus:ring-2 focus:ring-indigo-500`.
  - Placeholder: `"Ej: Mostrar los últimos 10 usuarios registrados en la base de datos..."`.
  - Atributo: `name="natural_query"`, `id="query-input"`.
- **Acción**: Botón de envío (`button`) con transición de hover y estado deshabilitado durante la carga.

### 3.3. Indicador de Estado (Loading State)
- **Componente**: Overlay semi-transparente o Spinner centrado.
- **Visual**: Animación `animate-spin` de Tailwind CSS.
- **Mensaje**: `"Orquestando Agentes Inteligentes... Por favor espere."`
- **Lógica**: Se activa al hacer click en "Enviar" y se desactiva al recibir la respuesta (éxito o error).

### 3.4. Visualizador de Resultados (Results Panel)
Dividido en dos bloques paralelos utilizando `grid grid-cols-1 lg:grid-cols-2 gap-6`.

#### A. Panel Izquierdo: Tabla de Datos Dinámica
- **Tipo**: Tabla HTML5 semántica (`<table>`).
- **Renderizado Automático**:
  - El sistema debe iterar sobre el primer objeto del arreglo `results` para generar las cabeceras (`<thead>`).
  - Las filas (`<tbody>`) se generan dinámicamente mapeando cada objeto JSON.
- **Estilos**: `w-full`, `text-left`, `border-collapse`, `divide-y divide-slate-800`.

#### B. Panel Derecho: Visor de Código SQL
- **Tipo**: Bloque de código preformateado (`<pre>` + `<code>`).
- **Estilo**:
  - Fondo: `bg-black` o `bg-slate-900`.
  - Fuente: Monospace (`font-mono`).
  - Colores: Sintaxis resaltada mediante colores neutros o indigo suave.
  - Scroll: `overflow-x-auto` para consultas extensas.

## 4. Contrato de Integración (API Client)

### 4.1. Configuración de la Petición
- **Método**: `POST`
- **URL**: `http://localhost:3000/api/v1/query`
- **Cabeceras**: `{'Content-Type': 'application/json'}`
- **Cuerpo (Payload)**:
  ```json
  {
    "naturalLanguageQuery": "valor_del_textarea",
    "connection_string": "valor_de_localStorage['db_connection_string']"
  }
  ```

### 4.2. Flujo de Manejo de Datos
1. **Envío**: Captura del valor del textarea + `connection_string` del localStorage → Activación de Spinner → Petición `fetch()`.
2. **Éxito (200 OK)**:
   - Extraer `data` de la respuesta JSON.
   - Inyectar `data.results` en la tabla dinámica.
   - Inyectar `data.sqlQuery` en el visor de código.
   - Desactivar Spinner.
3. **Error (400/500)**:
   - Capturar el mensaje de error del servidor.
   - Mostrar alerta roja (`bg-red-500/10`, `text-red-500`, `border-red-500`) en la parte superior del panel.
   - Desactivar Spinner.

## 5. Estándar de Implementación Técnica

- **Diseño**: Interfaz y diseño visual construidos utilizando **Stitch**.
- **Lenguaje**: JavaScript Vanilla (ES6+).
- **Maquetación**: HTML5 + Tailwind CSS (vía CDN para prototipado rápido o compilado).
- **Patrón de Desarrollo**:
  - Separación de lógica de UI (manipulación del DOM) y lógica de red (servicios de fetch).
  - Uso de `async/await` para todas las llamadas al backend.
  - Plantillas literales (Template Literals) para la generación de filas de la tabla.

## 6. Mapa de Clases Tailwind Clave
- **Layout**: `flex`, `grid`, `gap-x`, `items-center`, `justify-between`.
- **Espaciado**: `p-4`, `m-2`, `space-y-4`.
- **Tipografía**: `text-sm`, `font-bold`, `font-mono`, `leading-relaxed`.
- **Efectos**: `transition-all`, `duration-300`, `hover:scale-105`, `animate-spin`.

## 7. Seguridad y Validaciones del Frontend

### 7.1. Validación de Cadena de Conexión
Antes de almacenar o enviar la cadena de conexión, el frontend debe ejecutar las siguientes validaciones:

| Validación | Descripción | Regex / Lógica |
|---|---|---|
| **Formato válido** | Debe coincidir con un DSN reconocido (PostgreSQL, MySQL, MSSQL, SQLite) | `^(postgresql|mysql|mssql|sqlite):\/\/.+` |
| **Longitud mínima** | Mínimo 10 caracteres | `value.length >= 10` |
| **Caracteres peligrosos** | Bloquear caracteres de control o secuencias de script | Rechazar `<script`, `javascript:`, `\x00`-`\x1F` |
| **Sin credenciales vacías** | El usuario y contraseña no deben estar en blanco si el protocolo los requiere | Parseo de URL con `new URL(value)` |

### 7.2. Validación de la Consulta en Lenguaje Natural (Anti-Inyección)
El campo de consulta en lenguaje natural **no es SQL** pero debe igualmente ser sanitizado para prevenir ataques:

| Validación | Descripción | Acción |
|---|---|---|
| **Longitud máxima** | No más de 2000 caracteres | Bloquear envío, mostrar contador |
| **Detección de palabras SQL directas** | Si el input contiene `DROP`, `DELETE`, `TRUNCATE`, `INSERT`, `UPDATE`, `EXEC`, `xp_` como palabras sueltas | Mostrar advertencia amarilla: `"Parece que estás ingresando SQL directo. Por favor usa lenguaje natural."` |
| **Bloquear HTML/Script** | Sanitizar `<`, `>`, `&`, `"`, `'` con `textContent` en lugar de `innerHTML` | Siempre usar `textContent` al renderizar resultados |
| **Recorte de espacios** | Eliminar espacios al inicio/fin antes de enviar | `value.trim()` |
| **Campo vacío** | No permitir envío si está vacío tras trim | Deshabilitar botón o mostrar error inline |

### 7.3. Seguridad en Renderizado de Resultados
- **Nunca usar `innerHTML`** para insertar datos provenientes del servidor directamente. Usar `textContent` o `createElement`.
- Los encabezados y valores de la tabla deben escaparse antes de ser inyectados al DOM.
- Función de escape recomendada:
  ```javascript
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }
  ```

### 7.4. Seguridad en Almacenamiento Local
- La cadena de conexión se almacena en `localStorage` **únicamente** como medida de prototipado/desarrollo.
- Para producción, se recomienda migrar a un mecanismo de backend session o token cifrado (fuera del alcance del MVP actual).
- **No registrar** la cadena en `console.log` bajo ninguna circunstancia.
