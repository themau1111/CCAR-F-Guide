# Claude Architect Study Lab

Aplicación de estudio en español para **Claude Certified Architect — Foundations**. Incluye tarjetas de conceptos, flashcards, juegos de emparejamiento y ordenamiento, además de simulacros configurables con temporizador opcional.

## Cobertura del temario

La app incorpora una matriz visible con todos los subtemas públicos de la guía fuente, agrupados en los cinco dominios ponderados: orquestación de agentes, tools/MCP, Claude Code, prompts/salida estructurada y contexto/confiabilidad. El banco de preguntas cubre además los escenarios de soporte, generación de código, investigación multiagente, productividad, CI/CD, extracción estructurada y arquitectura conversacional.

El escenario 8 (herramientas de IA agéntica) se identifica de forma transparente como un área reportada por candidatos pero sin temario público verificable en la guía fuente. La aplicación cubre principios transferibles de diseño de herramientas, pero no afirma cobertura oficial de ese contenido no publicado.

## Ejecutar localmente

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

## Despliegue en Vercel

1. Sube esta carpeta a un repositorio de GitHub.
2. En Vercel selecciona **Add New → Project** e importa el repositorio.
3. Vercel detectará Next.js. No hacen falta variables de entorno ni base de datos.
4. Pulsa **Deploy**.

El progreso se almacena únicamente en el navegador mediante `localStorage`. Para añadir cuentas, sincronización multi-dispositivo o analítica compartida, el siguiente paso recomendado es Supabase con autenticación y Row Level Security.

## Material base

Esta herramienta se basa en materiales públicos de la comunidad: [paullarionov/claude-certified-architect](https://github.com/paullarionov/claude-certified-architect). Es una herramienta independiente y no es un producto oficial de Anthropic.
