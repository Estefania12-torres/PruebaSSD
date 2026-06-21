# Especificaciones Técnicas del Frontend: AI SQL Dashboard

## 1. Visión General
El Frontend es una interfaz de usuario de página única (SPA) diseñada para permitir a los usuarios interactuar con el pipeline de IA del backend. Su propósito es capturar consultas en lenguaje natural, coordinar la petición asíncrona al servidor y renderizar de forma dual los resultados de los datos (Tablas) y la lógica generada (SQL).

## 2. Identidad Visual y UX (User Experience)
Se adopta un enfoque de **Dashboard Moderno** con las siguientes pautas:
- **Modo de Color**: Dark Mode predominante.
  - Fondo Principal: `bg-slate-950` o `bg-zinc-900`.
  - Superficies/Tarjetas: `bg-slate-900` con bordes `border-slate-800`.
  - Acentos: `text-indigo-400` o `bg-indigo-600` para botones y elementos activos.
  - Texto: `text-slate-300` (secundario) y `text-white` (principal).
- **Responsividad**: Implementación mediante Tailwind CSS utilizando un sistema de rejilla (`grid`) que colapse de 2 columnas a 1 en dispositivos móviles.

## 3. Arquitectura de la Interfaz (Layout)

### 3.1. Panel de Entrada (Input Section)
- **Contenedor**: Centrado en la pantalla con un ancho máximo (`max-w-4xl`).
- **Campo de Consulta**: 
  - Elemento `<textarea>` expansible.
  - Estilo: `bg-slate-800`, `border-slate-700`, `rounded-lg`, `p-4`, `focus:ring-2 focus:ring-indigo-500`.
  - Placeholder: "Ej: Mostrar los últimos 10 usuarios registrados en la base de datos...".
  - Atributo: `name="natural_query"`.
- **Acción**: Botón de envío (`button`) con transición de hover y estado deshabilitado durante la carga.

### 3.2. Indicador de Estado (Loading State)
- **Componente**: Overlay semi-transparente o Spinner centrado.
- **Visual**: Animación `animate-spin` de Tailwind CSS.
- **Mensaje**: "Orquestando Agentes Inteligentes... Por favor espere."
- **Lógica**: Se activa al hacer click en "Enviar" y se desactiva al recibir la respuesta (éxito o error).

### 3.3. Visualizador de Resultados (Results Panel)
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
    "schema": null
  }
  ```

### 4.2. Flujo de Manejo de Datos
1. **Envío**: Captura del valor del textarea $\rightarrow$ Activación de Spinner $\rightarrow$ Petición `fetch()`.
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
