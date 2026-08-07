# Staff Board — Caracoli Global School

Pizarra digital colaborativa para organizar eventos, tareas y seguimiento del personal del colegio.
Construida con Next.js 14 (App Router), TypeScript, Tailwind CSS y **Supabase** (base de datos, login
real y chat/notificaciones en tiempo real entre todo el equipo).

## Antes de ejecutarlo: conectar Supabase

La app necesita una base de datos real para que el chat y las notificaciones lleguen a otras personas.
Sigue la guía **"COMO ACTIVAR EL BACKEND REAL.md"** (en la carpeta donde recibiste este proyecto) para:
crear tu proyecto gratuito en Supabase, correr `supabase/schema.sql`, crear tu cuenta de administrador,
y llenar `.env.local` (copia `.env.local.example`).

## Cómo ejecutarlo

Requisitos: Node.js 18.18+ (recomendado 20 LTS) y npm.

```bash
npm install
npm run dev
```

Abre http://localhost:3000 — inicia sesión con el correo y contraseña de tu cuenta de administrador
(la que creaste siguiendo la guía de Supabase). Desde **Equipo** puedes invitar a todos los demás.

## Qué incluye

- **Muro**: panel principal con eventos publicados y estadísticas generales.
- **Eventos**: crear, editar, publicar, duplicar y eliminar eventos; cada uno con sus tareas.
- **Tareas**: inscripción por cupos (con ventana de cancelación configurable), líder opcional,
  chat interno con reacciones, evidencias fotográficas y documentos adjuntos (simulados).
- **Mis tareas**: kanban personal (Sin iniciar / En proceso / Terminada).
- **Calendario institucional**: vista mensual con fechas, valor del mes y próximas fechas.
- **Mi agenda**: resumen personal de compromisos, eventos creados e historial.
- **Historial**: bitácora de toda la actividad, exportable a CSV.
- **Equipo** y **Configuración**: solo visibles para administradores.

## Próximos pasos sugeridos

- Conectar un backend real (por ejemplo Supabase) para autenticación institucional, persistencia y
  notificaciones por correo.
- Subida real de archivos/imágenes (hoy se simulan con nombres de archivo).
- Notificaciones push/correo cuando cambian fechas del calendario o vencen tareas.

## Nota sobre esta build

Este proyecto se generó y revisó manualmente (imports, tipos y estructura de archivos) en un entorno
sin acceso al registro de npm, por lo que no se pudo ejecutar `npm install`/`npm run build` aquí. Ejecuta
`npm install && npm run build` en tu máquina para una verificación completa antes de desplegar.
