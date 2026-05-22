# KinePro

Sistema de gestion para centros de kinesiologia.

## Objetivo del repositorio

Este repositorio contiene el esqueleto inicial del proyecto para que el equipo pueda trabajar con GitFlow. Los archivos de codigo quedan vacios a proposito hasta que cada integrante implemente su parte en ramas de feature.

## Estructura

- `BackEnd/`: API, servicios, modelos, base de datos, tareas y tests.
- `FrontEnd/`: aplicacion React con Vite, separada por componentes, paginas, rutas, hooks, servicios y estilos.
- `Docs/`: acuerdos de trabajo, GitFlow y documentacion funcional/tecnica.

## Stack previsto

- Frontend: React, Vite, TailwindCSS.
- Backend: FastAPI, Celery, Redis.
- Base de datos / Auth / servicios: Supabase.

## Rol del backend

FastAPI sera la capa principal de comunicacion entre frontend y backend. Tambien concentrara las reglas sensibles del negocio:

- reservas y turnos
- concurrencia
- metricas
- validaciones
- auditoria
- envio de notificaciones
- coordinacion de tareas en segundo plano con Celery y Redis

## Documentacion util

- `Docs/project-structure.md`: explica que hace cada carpeta.
- `Docs/gitflow.md`: flujo de ramas para trabajar en equipo.
- `Docs/group-b-scope.md`: alcance del grupo B para perfiles y administracion del personal.
- `Docs/api.md`: documentacion futura de endpoints.
- `Docs/database.md`: documentacion futura de Supabase.
- `Docs/frontend.md`: documentacion futura del frontend.

correr backend
cd /Users/juanuceda/Desktop/KinePro/BackEnd
source venv/bin/activate
venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port 8000;

correr frontend
cd /Users/juanuceda/Desktop/KinePro/FrontEnd
npm run dev
