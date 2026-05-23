# common

Componentes base reutilizables.

Estos componentes estan pensados para que las pantallas nuevas del equipo usen Tailwind sin repetir estilos.

## Componentes disponibles

- `Button`: boton base con variantes `primary`, `secondary` y `danger`.
- `TextInput`: campo de texto con label y mensaje de error.
- `Modal`: modal simple para confirmaciones o formularios cortos.
- `Card`: caja blanca reutilizable para bloques de informacion.
- `PageContainer`: contenedor base para pantallas internas.

## Ejemplo

```jsx
import { Button, Card, PageContainer, TextInput } from '../components/common'

function NuevaPantalla() {
  return (
    <PageContainer title="Turnos" subtitle="Gestion de reservas">
      <Card>
        <TextInput label="Buscar paciente" placeholder="Nombre o DNI" />
        <Button className="mt-4">Guardar</Button>
      </Card>
    </PageContainer>
  )
}
```

Auth y gestion de personal siguen usando CSS propio porque ya estan avanzadas y probadas.
