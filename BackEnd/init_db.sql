-- =============================================================================
-- KinePro — Script de inicialización de base de datos
-- Ejecutar en Supabase → SQL Editor (una sola vez, al arrancar el proyecto)
-- Es IDEMPOTENTE: se puede correr múltiples veces sin romper nada existente.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. EXTENSIONES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. TIPOS / ENUMS
--    (usados por los turnos — deben crearse antes que la tabla turnos)
-- ─────────────────────────────────────────────────────────────────────────────

-- Estado de un turno
DO $$ BEGIN
    CREATE TYPE estado_turno AS ENUM (
        'disponible',   -- cupo libre, nadie lo reservó
        'reservado',    -- paciente asignado
        'bloqueado',    -- día cerrado / feriado
        'cancelado'     -- fue cancelado
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Área de tratamiento
DO $$ BEGIN
    CREATE TYPE area_tratamiento AS ENUM (
        'tren_superior',
        'tren_medio',
        'tren_inferior'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. TABLA: profiles
--    Todos los usuarios del sistema: pacientes, profesionales, secretarias,
--    administrativos. El id es el mismo UUID que genera Supabase Auth.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
    id               UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre           TEXT        NOT NULL,
    apellido         TEXT        NOT NULL,
    dni              TEXT        NOT NULL UNIQUE,
    telefono         TEXT        NOT NULL,
    email            TEXT        NOT NULL UNIQUE,
    fecha_nacimiento DATE        NOT NULL,
    obra_social      TEXT        NOT NULL DEFAULT 'Sin obra social',
    rol              TEXT        NOT NULL
                                 CHECK (rol IN ('paciente', 'profesional', 'secretaria', 'administrativo')),
    activo           BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ          DEFAULT NOW(),
    updated_at       TIMESTAMPTZ          DEFAULT NOW(),
    created_by       UUID,       -- id del usuario que lo creó
    updated_by       UUID        -- id del último usuario que lo modificó
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. TABLA: professional_profiles
--    Datos específicos de los kinesiólogos/profesionales.
--    Relación 1-a-1 con profiles (solo para rol = 'profesional').
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS professional_profiles (
    profile_id       UUID        PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    matricula        TEXT        NOT NULL,
    especialidad     TEXT        NOT NULL,
    area_tratamiento TEXT        NOT NULL,   -- texto libre: "tren superior", etc.
    horario_entrada  TIME        NOT NULL,
    horario_salida   TIME        NOT NULL,
    CONSTRAINT chk_horario CHECK (horario_salida > horario_entrada)
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. TABLA: audit_logs
--    Registro de todas las acciones relevantes del sistema (quién hizo qué).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id    UUID,                       -- quién realizó la acción
    actor_role  TEXT        NOT NULL,
    action      TEXT        NOT NULL,       -- ej: "CREATE_PATIENT", "DELETE_STAFF"
    entity_type TEXT        NOT NULL,       -- ej: "patient", "staff"
    entity_id   UUID,                       -- id del objeto afectado
    entity_role TEXT,                       -- rol del objeto afectado
    description TEXT        NOT NULL,
    metadata    JSONB       NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. TABLA: configuracion_grilla
--    Parámetros con los que se generó una grilla mensual.
--    Permite saber cómo fue configurada y regenerarla si es necesario.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS configuracion_grilla (
    id              UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
    mes             INTEGER  NOT NULL CHECK (mes BETWEEN 1 AND 12),
    anio            INTEGER  NOT NULL,
    hora_inicio     TIME     NOT NULL,
    hora_fin        TIME     NOT NULL,
    turnos_por_slot INTEGER  NOT NULL,      -- cupos simultáneos por horario
    dias_habiles    TEXT     NOT NULL,      -- "lunes,martes,miercoles,jueves,viernes"
    creado_por      UUID     NOT NULL,      -- id de la secretaria que la generó
    creado_en       TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_horario_grilla CHECK (hora_fin > hora_inicio)
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. TABLA: turnos
--    Cada fila es un cupo individual (slot) generado por la grilla.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS turnos (
    id               UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    configuracion_id UUID             REFERENCES configuracion_grilla(id) ON DELETE SET NULL,
    fecha            DATE             NOT NULL,
    hora_inicio      TIME             NOT NULL,
    hora_fin         TIME             NOT NULL,
    area_tratamiento area_tratamiento,               -- null hasta que se reserva
    estado           estado_turno     NOT NULL DEFAULT 'disponible',
    paciente_id      UUID,                           -- null si disponible
    profesional_id   UUID,                           -- se asigna al reservar
    creado_en        TIMESTAMPTZ      DEFAULT NOW(),
    actualizado_en   TIMESTAMPTZ      DEFAULT NOW(),
    nota_bloqueo     TEXT,                           -- motivo si está bloqueado
    CONSTRAINT chk_horario_turno CHECK (hora_fin > hora_inicio)
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. TABLA: dias_cerrados
--    Fechas marcadas como feriado o cerradas. El generador de grilla las omite.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dias_cerrados (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha          DATE        NOT NULL UNIQUE,
    motivo         TEXT,                           -- "Feriado nacional", "Mantenimiento", etc.
    creado_por     UUID        NOT NULL,
    creado_en      TIMESTAMPTZ DEFAULT NOW(),
    horario_inicio TIME,                           -- si tiene valor junto con horario_fin: día con horario reducido
    horario_fin    TIME
);

ALTER TABLE dias_cerrados ADD COLUMN IF NOT EXISTS horario_inicio TIME;
ALTER TABLE dias_cerrados ADD COLUMN IF NOT EXISTS horario_fin TIME;


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. TABLA: lista_espera
--    Pacientes que quedaron en espera para un turno ocupado.
--    Prioridad FIFO: primero en inscribirse, primero en ser notificado.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lista_espera (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    turno_id          UUID        NOT NULL REFERENCES turnos(id) ON DELETE CASCADE,
    paciente_id       UUID        NOT NULL,
    fecha_inscripcion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    activo            BOOLEAN     NOT NULL DEFAULT TRUE   -- FALSE si ya fue notificado
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. ÍNDICES (mejoran la performance en las queries más frecuentes)
-- ─────────────────────────────────────────────────────────────────────────────

-- turnos: búsquedas por fecha y estado (endpoint principal)
CREATE INDEX IF NOT EXISTS idx_turnos_fecha         ON turnos(fecha);
CREATE INDEX IF NOT EXISTS idx_turnos_estado        ON turnos(estado);
CREATE INDEX IF NOT EXISTS idx_turnos_fecha_estado  ON turnos(fecha, estado);
CREATE INDEX IF NOT EXISTS idx_turnos_paciente_id   ON turnos(paciente_id);
CREATE INDEX IF NOT EXISTS idx_turnos_profesional   ON turnos(profesional_id);

-- lista_espera: búsquedas por turno y paciente
CREATE INDEX IF NOT EXISTS idx_lista_espera_turno      ON lista_espera(turno_id);
CREATE INDEX IF NOT EXISTS idx_lista_espera_paciente   ON lista_espera(paciente_id);
CREATE INDEX IF NOT EXISTS idx_lista_espera_activo     ON lista_espera(turno_id, activo);

-- audit_logs: búsquedas por actor y fecha
CREATE INDEX IF NOT EXISTS idx_audit_actor      ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_created    ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity     ON audit_logs(entity_id);

-- profiles: búsquedas por rol y DNI
CREATE INDEX IF NOT EXISTS idx_profiles_rol     ON profiles(rol);
CREATE INDEX IF NOT EXISTS idx_profiles_dni     ON profiles(dni);
CREATE INDEX IF NOT EXISTS idx_profiles_email   ON profiles(email);

-- configuracion_grilla: búsqueda por mes/año
CREATE INDEX IF NOT EXISTS idx_grilla_mes_anio  ON configuracion_grilla(mes, anio);


-- ─────────────────────────────────────────────────────────────────────────────
-- 11. TRIGGERS: actualizar automáticamente los campos de timestamp
-- ─────────────────────────────────────────────────────────────────────────────

-- Función genérica reutilizable para updated_at / actualizado_en
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_set_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger en profiles (updated_at)
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- Trigger en turnos (actualizado_en)
DROP TRIGGER IF EXISTS trg_turnos_actualizado_en ON turnos;
CREATE TRIGGER trg_turnos_actualizado_en
    BEFORE UPDATE ON turnos
    FOR EACH ROW EXECUTE FUNCTION fn_set_actualizado_en();


-- =============================================================================
-- FIN DEL SCRIPT
-- Tablas creadas:
--   ✔ profiles
--   ✔ professional_profiles
--   ✔ audit_logs
--   ✔ configuracion_grilla
--   ✔ turnos
--   ✔ dias_cerrados
--   ✔ lista_espera
-- =============================================================================
