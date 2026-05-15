# GitFlow

## Ramas principales

- `main`: version estable.
- `develop`: integracion del trabajo del equipo.
- `develop-a`: integracion del subgrupo A.
- `develop-b`: integracion del subgrupo B.

## Ramas de trabajo

- `nombre-integrante/nombre-corto`: trabajo individual de cada integrante.
- `feature/nombre-corto`: nuevas funcionalidades si el equipo prefiere ramas por funcionalidad.
- `bugfix/nombre-corto`: correcciones durante desarrollo.
- `release/version`: preparacion de entrega.
- `hotfix/nombre-corto`: correcciones urgentes desde `main`.

## Flujo sugerido por subgrupo

1. Crear cada rama individual desde la rama del subgrupo correspondiente.
2. Trabajar en commits chicos y claros.
3. Abrir pull request hacia `develop-a` o `develop-b`.
4. Revisar con al menos un integrante del subgrupo.
5. Integrar `develop-a` y `develop-b` hacia `develop` cuando el modulo este estable.
6. Integrar `develop` hacia `main` solo para entregas o versiones estables.

## Ejemplo para grupo B

```bash
git checkout develop-b
git pull
git checkout -b juanfran/perfiles
```

Cuando la tarea este lista:

```bash
git push origin juanfran/perfiles
```

Luego se abre un pull request hacia `develop-b`.
