"""Prepara los turnos de prueba para la demo del 15/07/2026, usando usuarios
reales que ya existen en la BD (no crea usuarios).

Usuarios referenciados por DNI (deben existir de antemano; si alguno falta
el script corta con un error explicando cuál):
    - Secretaria/Admin:              Ezequiel Weber   (DNI 44710154)
    - Paciente principal:            Santiago Cáceres (DNI 1233211)
    - Paciente lista de espera #1:   Santino Casares  (DNI 9990999)
    - Paciente lista de espera #2:   Diego Fernández  (DNI 35222222)

Antes de armar los datos nuevos, limpia lo que dejó el seed viejo:
    - Martina López (DNI 35111111): libera todos sus turnos y da de baja
      sus inscripciones en lista de espera (ya no participa de la demo).
    - Diego Fernández: libera cualquier turno donde haya quedado como
      titular (no debería haber ninguno) y da de baja sus inscripciones
      viejas antes de re-inscribirlo según el esquema nuevo.

Arma 4 escenarios:
    1. Turno de HOY reservado con Santiago (tren_superior), para demostrar
       registrar inasistencia / cancelar turno de paciente.
    2. Un turno DISPONIBLE de hoy o mañana que se deja SIN reservar, para
       que la secretaria lo asigne en vivo durante la demo (registro manual).
    3. Turno lleno #1 (>= 20/07/2026): todos los cupos reservados con
       Santiago; Santino en lista de espera en posición #1 y Diego en
       posición #2. Para el escenario "ACEPTAR oferta".
    4. Turno lleno #2 (>= 20/07/2026, distinto del anterior): mismo armado,
       para el escenario "RECHAZAR oferta".

No pasa por HTTP: usa el cliente admin de Supabase (tabla profiles) y
SQLAlchemy (AsyncSessionLocal + modelos de app.models.turno) directamente,
igual que los demás scripts en BackEnd/scripts/.

Idempotente: los turnos ya reservados por Santiago se reutilizan (nunca se
liberan turnos de Santiago ni de Santino, así los turnos-lleno #1/#2 quedan
estables entre corridas); las inscripciones de lista de espera se verifican
por paciente+turno+activo antes de insertar.

Uso:
    cd BackEnd
    python -m scripts.seed_demo   (o) python scripts/seed_demo.py
"""
import asyncio
from collections import defaultdict
from datetime import date, timedelta

from sqlalchemy import and_, select

from app.db.session import AsyncSessionLocal
from app.integrations.supabase.client import get_supabase_admin_client
from app.models.turno import AreaTratamiento, EstadoTurno, ListaEspera, Turno
from app.repositories.patients.patient_repository import get_patient_by_dni

HOY = date(2026, 7, 15)
BUSQUEDA_TURNO_LLENO_DESDE = date(2026, 7, 20)

SECRETARIA_DNI = "44710154"
SANTIAGO_DNI = "1233211"
SANTINO_DNI = "9990999"
DIEGO_DNI = "35222222"
MARTINA_DNI_A_LIMPIAR = "35111111"


def obtener_perfil_obligatorio(dni: str, descripcion: str) -> dict:
    perfil = get_patient_by_dni(dni)
    if not perfil:
        raise RuntimeError(
            f"No se encontró el perfil de {descripcion} (DNI {dni}) en la BD. "
            f"Este script no crea usuarios nuevos: deben existir de antemano."
        )
    return perfil


async def obtener_turnos_reservados_de(session, paciente_id: str, fecha: date) -> list[Turno]:
    result = await session.execute(
        select(Turno)
        .where(
            and_(
                Turno.paciente_id == paciente_id,
                Turno.fecha == fecha,
                Turno.estado == EstadoTurno.RESERVADO,
            )
        )
        .order_by(Turno.hora_inicio)
    )
    return list(result.scalars().all())


async def liberar_turnos_de_paciente(session, paciente_id: str) -> int:
    result = await session.execute(select(Turno).where(Turno.paciente_id == paciente_id))
    turnos = list(result.scalars().all())
    for turno in turnos:
        turno.paciente_id = None
        turno.estado = EstadoTurno.DISPONIBLE
        turno.area_tratamiento = None
        session.add(turno)
    if turnos:
        await session.commit()
    return len(turnos)


async def desactivar_lista_espera_de_paciente(session, paciente_id: str) -> int:
    result = await session.execute(
        select(ListaEspera).where(
            and_(ListaEspera.paciente_id == paciente_id, ListaEspera.activo.is_(True))
        )
    )
    inscripciones = list(result.scalars().all())
    for inscripcion in inscripciones:
        inscripcion.activo = False
        session.add(inscripcion)
    if inscripciones:
        await session.commit()
    return len(inscripciones)


async def limpiar_seed_viejo(session, diego_id: str) -> None:
    martina = get_patient_by_dni(MARTINA_DNI_A_LIMPIAR)
    if martina:
        n_turnos = await liberar_turnos_de_paciente(session, martina["id"])
        n_lista = await desactivar_lista_espera_de_paciente(session, martina["id"])
        print(
            f"  Martina López (DNI {MARTINA_DNI_A_LIMPIAR}): {n_turnos} turno(s) "
            f"liberado(s), {n_lista} inscripción(es) dada(s) de baja"
        )
    else:
        print(f"  Martina López (DNI {MARTINA_DNI_A_LIMPIAR}) no existe en la BD, nada que limpiar")

    n_turnos_diego = await liberar_turnos_de_paciente(session, diego_id)
    n_lista_diego = await desactivar_lista_espera_de_paciente(session, diego_id)
    print(
        f"  Diego Fernández (DNI {DIEGO_DNI}) - datos del seed viejo: "
        f"{n_turnos_diego} turno(s) liberado(s), {n_lista_diego} inscripción(es) dada(s) de baja"
    )


async def asegurar_turno_hoy_santiago(session, santiago_id: str) -> Turno:
    ya_reservados = await obtener_turnos_reservados_de(session, santiago_id, HOY)
    if ya_reservados:
        return ya_reservados[0]

    result = await session.execute(
        select(Turno)
        .where(and_(Turno.fecha == HOY, Turno.estado == EstadoTurno.DISPONIBLE))
        .order_by(Turno.hora_inicio)
    )
    disponibles_hoy = list(result.scalars().all())
    if not disponibles_hoy:
        raise RuntimeError(
            f"No hay turnos DISPONIBLES hoy ({HOY}) para reservar con Santiago. "
            f"Generá la grilla de julio 2026 antes de correr el seed."
        )

    turno = disponibles_hoy[0]
    turno.estado = EstadoTurno.RESERVADO
    turno.paciente_id = santiago_id
    turno.area_tratamiento = AreaTratamiento.TREN_SUPERIOR
    session.add(turno)
    await session.commit()
    return turno


async def buscar_turno_para_registro_manual(session, excluir_turno: Turno) -> Turno | None:
    """Busca un turno DISPONIBLE de hoy o mañana para que la secretaria lo
    asigne en vivo. Prefiere un horario distinto al de excluir_turno para que
    no se confundan en la demo (aunque sea otro profesional a la misma hora);
    si no hay otro horario, cae a cualquier DISPONIBLE que no sea el mismo id."""
    result = await session.execute(
        select(Turno)
        .where(
            and_(
                Turno.fecha.in_([HOY, HOY + timedelta(days=1)]),
                Turno.estado == EstadoTurno.DISPONIBLE,
            )
        )
        .order_by(Turno.fecha, Turno.hora_inicio)
    )
    candidatos = [t for t in result.scalars().all() if t.id != excluir_turno.id]

    otro_horario = next(
        (t for t in candidatos if (t.fecha, t.hora_inicio) != (excluir_turno.fecha, excluir_turno.hora_inicio)),
        None,
    )
    if otro_horario is not None:
        return otro_horario

    return candidatos[0] if candidatos else None


async def turnos_llenos_de_santiago(session, santiago_id: str, fecha_desde: date) -> list[tuple]:
    """Grupos (fecha, hora_inicio) desde fecha_desde donde todos los cupos ya
    están ocupados y Santiago es titular de al menos uno: son los turnos-lleno
    que este seed ya armó en una corrida anterior. Como nunca liberamos los
    turnos de Santiago, esto es estable entre corridas."""
    result = await session.execute(
        select(Turno)
        .where(Turno.fecha >= fecha_desde)
        .order_by(Turno.fecha, Turno.hora_inicio, Turno.id)
    )
    grupos: dict = defaultdict(list)
    for turno in result.scalars().all():
        grupos[(turno.fecha, turno.hora_inicio)].append(turno)

    claves_llenas = []
    for clave in sorted(grupos.keys()):
        grupo = grupos[clave]
        todos_reservados = all(t.estado != EstadoTurno.DISPONIBLE for t in grupo)
        # t.paciente_id es un uuid.UUID (columna UUID) y santiago_id es un str
        # (viene de la tabla profiles vía supabase-py): hay que comparar como
        # texto o "==" siempre da False aunque sea el mismo id.
        tiene_santiago = any(str(t.paciente_id) == str(santiago_id) for t in grupo)
        if todos_reservados and tiene_santiago:
            claves_llenas.append(clave)

    return claves_llenas


async def buscar_primer_turno_disponible(session, fecha_desde: date, excluir_claves=None) -> Turno | None:
    excluir_claves = excluir_claves or set()
    result = await session.execute(
        select(Turno)
        .where(and_(Turno.fecha >= fecha_desde, Turno.estado == EstadoTurno.DISPONIBLE))
        .order_by(Turno.fecha, Turno.hora_inicio, Turno.id)
    )
    for turno in result.scalars().all():
        if (turno.fecha, turno.hora_inicio) not in excluir_claves:
            return turno
    return None


async def asegurar_en_lista_espera(session, paciente_id: str, turno: Turno) -> None:
    result = await session.execute(
        select(ListaEspera).where(
            and_(
                ListaEspera.paciente_id == paciente_id,
                ListaEspera.turno_id == turno.id,
                ListaEspera.activo.is_(True),
            )
        )
    )
    if result.scalar_one_or_none():
        return

    inscripcion = ListaEspera(
        turno_id=turno.id,
        paciente_id=paciente_id,
        area_tratamiento=turno.area_tratamiento or AreaTratamiento.TREN_SUPERIOR,
    )
    session.add(inscripcion)
    await session.commit()


async def armar_turno_lleno(
    session, fecha: date, hora_inicio, santiago_id: str, santino_id: str, diego_id: str,
) -> Turno:
    result = await session.execute(
        select(Turno)
        .where(and_(Turno.fecha == fecha, Turno.hora_inicio == hora_inicio))
        .order_by(Turno.id)
    )
    grupo = list(result.scalars().all())
    if not grupo:
        raise RuntimeError(f"No hay turnos generados para {fecha} {hora_inicio}")

    for turno in grupo:
        if turno.estado == EstadoTurno.DISPONIBLE:
            turno.estado = EstadoTurno.RESERVADO
            turno.paciente_id = santiago_id
            turno.area_tratamiento = AreaTratamiento.TREN_SUPERIOR
            session.add(turno)
    await session.commit()

    turno_ancla = grupo[0]

    # Orden de inscripción determina la posición en la lista de espera:
    # Santino primero (#1), Diego después (#2).
    await asegurar_en_lista_espera(session, santino_id, turno_ancla)
    await asegurar_en_lista_espera(session, diego_id, turno_ancla)

    return turno_ancla


async def main():
    print("=== Seed demo 15/07/2026 ===\n")

    print("Buscando usuarios reales por DNI (no se crean, deben existir)...")
    secretaria = obtener_perfil_obligatorio(SECRETARIA_DNI, "Secretaria/Admin (Ezequiel Weber)")
    santiago = obtener_perfil_obligatorio(SANTIAGO_DNI, "paciente principal (Santiago Cáceres)")
    santino = obtener_perfil_obligatorio(SANTINO_DNI, "paciente lista de espera #1 (Santino Casares)")
    diego = obtener_perfil_obligatorio(DIEGO_DNI, "paciente lista de espera #2 (Diego Fernández)")
    santiago_id, santino_id, diego_id = santiago["id"], santino["id"], diego["id"]
    print(f"  Secretaria: {secretaria['nombre']} {secretaria['apellido']} (DNI {SECRETARIA_DNI})")
    print(f"  Santiago Cáceres  -> id={santiago_id}")
    print(f"  Santino Casares   -> id={santino_id}")
    print(f"  Diego Fernández   -> id={diego_id}")
    print()

    async with AsyncSessionLocal() as session:
        print("Limpiando datos del seed anterior...")
        await limpiar_seed_viejo(session, diego_id)
        print()

        print(f"Turno de hoy ({HOY}) para inasistencia/cancelación (Santiago):")
        turno_inasistencia = await asegurar_turno_hoy_santiago(session, santiago_id)
        print(f"  {turno_inasistencia.fecha} {turno_inasistencia.hora_inicio} (id={turno_inasistencia.id})")
        print()

        print("Turno para registrar manual en vivo durante la demo (queda DISPONIBLE):")
        turno_manual = await buscar_turno_para_registro_manual(session, turno_inasistencia)
        if turno_manual is None:
            print(f"  ADVERTENCIA: no se encontró ningún turno DISPONIBLE distinto en {HOY}/{HOY + timedelta(days=1)}")
        else:
            print(f"  {turno_manual.fecha} {turno_manual.hora_inicio} (id={turno_manual.id})")
        print()

        print(f"Buscando/armando turnos llenos desde {BUSQUEDA_TURNO_LLENO_DESDE}...")
        claves_existentes = await turnos_llenos_de_santiago(session, santiago_id, BUSQUEDA_TURNO_LLENO_DESDE)
        clave1 = claves_existentes[0] if len(claves_existentes) >= 1 else None
        clave2 = claves_existentes[1] if len(claves_existentes) >= 2 else None

        if clave1 is None:
            primero = await buscar_primer_turno_disponible(session, BUSQUEDA_TURNO_LLENO_DESDE)
            if primero is None:
                raise RuntimeError(
                    f"No hay turnos DISPONIBLES desde {BUSQUEDA_TURNO_LLENO_DESDE} para el turno lleno #1; "
                    f"generá la grilla correspondiente antes de correr el seed."
                )
            clave1 = (primero.fecha, primero.hora_inicio)

        if clave2 is None:
            segundo = await buscar_primer_turno_disponible(session, BUSQUEDA_TURNO_LLENO_DESDE, excluir_claves={clave1})
            if segundo is None:
                raise RuntimeError(
                    f"No hay un segundo turno DISPONIBLE desde {BUSQUEDA_TURNO_LLENO_DESDE} para el turno lleno #2; "
                    f"generá la grilla correspondiente antes de correr el seed."
                )
            clave2 = (segundo.fecha, segundo.hora_inicio)

        turno_lleno_1 = await armar_turno_lleno(session, clave1[0], clave1[1], santiago_id, santino_id, diego_id)
        print(f"  Turno lleno #1 (ACEPTAR): {turno_lleno_1.fecha} {turno_lleno_1.hora_inicio}")

        turno_lleno_2 = await armar_turno_lleno(session, clave2[0], clave2[1], santiago_id, santino_id, diego_id)
        print(f"  Turno lleno #2 (RECHAZAR): {turno_lleno_2.fecha} {turno_lleno_2.hora_inicio}")
        print()

    print("=== Resumen ===")
    print("\nUsuarios (ya existentes, usar sus credenciales reales):")
    print(f"  Secretaria/Admin: {secretaria['nombre']} {secretaria['apellido']} - DNI {SECRETARIA_DNI}")
    print(f"  Paciente principal: Santiago Cáceres - DNI {SANTIAGO_DNI}")
    print(f"  Lista de espera #1 (acepta): Santino Casares - DNI {SANTINO_DNI}")
    print(f"  Lista de espera #2 (recibe si rechazan): Diego Fernández - DNI {DIEGO_DNI}")
    print("\nTurnos:")
    print(f"  Inasistencia/cancelación (Santiago):  {turno_inasistencia.fecha} {turno_inasistencia.hora_inicio}")
    if turno_manual is not None:
        print(f"  Registro manual en vivo (disponible): {turno_manual.fecha} {turno_manual.hora_inicio}")
    else:
        print("  Registro manual en vivo (disponible): NO ENCONTRADO, revisar grilla")
    print(f"  Turno lleno #1 - ACEPTAR (Santino #1, Diego #2):  {turno_lleno_1.fecha} {turno_lleno_1.hora_inicio}")
    print(f"  Turno lleno #2 - RECHAZAR (Santino #1, Diego #2): {turno_lleno_2.fecha} {turno_lleno_2.hora_inicio}")


if __name__ == "__main__":
    asyncio.run(main())
