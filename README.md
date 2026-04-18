# Tarjetas RolePlay - Generador de Diferenciales

Aplicación full-stack para la creación, gestión y exportación (a PDF) de tarjetas de RolePlay temáticas. Diseñada con una estética moderna, responsiva y con integración de ilustraciones automáticas por rol.

## 🚀 Características

- **Generador de Tarjetas**: Crea tarjetas con situación, rol y desarrollo.
- **Vista Previa en Vivo**: Visualiza cómo quedará la tarjeta antes de guardarla.
- **Organización por Grupos**: Las tarjetas se agrupan automáticamente por tema.
- **Ilustraciones Automáticas**: Los grupos sin imagen muestran ilustraciones generadas basadas en el nombre del rol.
- **Exportación PDF**: Genera archivos PDF listos para imprimir con carátula y tarjetas.
- **Almacenamiento Local**: Base de datos simple basada en archivo JSON (`storage.json`).
- **Límites Ampliados**: Soporta imágenes de alta resolución (hasta 50MB por petición).

## 🛠️ Tecnologías

- **Frontend**: React (Vite), Tailwind CSS, Framer Motion, Lucide React.
- **Backend**: Node.js, Express.
- **Utilidades**: jsPDF, html2canvas, Axios.

## 💻 Instalación y Uso Local

Para ejecutar este proyecto en tu propia máquina (o después de clonarlo desde GitHub), sigue estos pasos:

### 1. Requisitos previos
Asegúrate de tener instalado [Node.js](https://nodejs.org/) (versión 18 o superior).

### 2. Instalación de dependencias
Abre una terminal en la carpeta del proyecto y ejecuta:
```bash
npm install
```

### 3. Ejecución en modo desarrollo
Para iniciar el servidor de desarrollo (backend + frontend con hot-reload):
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:3000`.

### 4. Construcción para producción
Si deseas generar una versión optimizada para desplegar:
```bash
npm run build
npm start
```

## 📁 Estructura del Proyecto

- `server.ts`: Servidor Express que gestiona la API y el almacenamiento de datos.
- `storage.json`: Archivo donde se guardan las tarjetas y grupos de forma persistente.
- `src/App.tsx`: Componente principal de la interfaz React.
- `src/index.css`: Estilos globales y configuración del tema visual.

## 📝 Notas importantes sobre GitHub

- **Datos persistentes**: El archivo `storage.json` se crea automáticamente la primera vez que guardas una tarjeta. Se recomienda añadirlo al `.gitignore` si no quieres compartir tus datos de prueba en el repositorio.
- **Variables de entorno**: Si decides añadir funciones de IA de Google, deberás configurar la variable `GEMINI_API_KEY` en un archivo `.env`.

---
Creado por Anthony Acevedo - 2026
