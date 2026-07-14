-- Índice sobre lista_espera.turno_id: la FK no crea un índice automáticamente en Postgres,
-- y esta columna se filtra en cada consulta de lista de espera de un turno
-- (obtener_primer_paciente_en_espera, ofertar_turno_lista_espera, etc.).
CREATE INDEX IF NOT EXISTS ix_lista_espera_turno_id ON lista_espera (turno_id);
