
# Fase 6: Horarios por dia con franjas multiples

## Resumen
Refactorizar los tres archivos que usan logica de horarios para que lean de la tabla `day_schedules` (ya existente) en lugar de `business_settings`. Redisenar AdminHorarios con una UI por dia de la semana con soporte para multiples turnos. No se necesitan cambios en base de datos ya que la tabla `day_schedules` ya existe con las columnas necesarias y RLS configurado.

## 1. `src/pages/admin/AdminHorarios.tsx` - Rediseno completo

Reemplazar la seccion "Horario General" (un unico par apertura/cierre + botones de dias) por:

- **7 secciones colapsables** (Lunes a Domingo, usando Collapsible de ShadCN)
- Cada dia tiene un **Switch** para activar/desactivar (insertar/eliminar registros en `day_schedules`)
- Dentro de cada dia activo, se listan los **tramos existentes** (ej. "09:00 - 14:00") con boton de eliminar
- Boton **"+ Anadir turno"** que muestra dos inputs `type="time"` (inicio/fin) para insertar un nuevo registro en `day_schedules`
- **Query**: `supabase.from('day_schedules').select('*').order('day_of_week').order('hora_inicio')`
- **Mutations**: INSERT para nuevo tramo, DELETE para eliminar tramo, UPDATE para modificar `activo`
- Se mantiene la seccion de **Bloqueos** sin cambios

## 2. `src/pages/ReservarCita.tsx` - Usar `day_schedules`

- Reemplazar el query de `business_settings` por un query a `day_schedules` (todos los registros activos)
- **`disabledDays`**: Un dia esta deshabilitado si no tiene ningun registro activo en `day_schedules` para ese `day_of_week`
- **`availableSlots`**: En lugar de generar slots desde un unico rango apertura-cierre, iterar sobre cada tramo del dia seleccionado y generar slots de 30 min solo dentro de cada tramo. Los huecos entre tramos (ej. 14:00-16:00) no generan slots
- Eliminar el tipo `BusinessSettings` y la referencia a `settings`

## 3. `src/pages/admin/AdminAgenda.tsx` - Adaptar time grid

- Agregar query a `day_schedules` filtrando por `day_of_week` del dia seleccionado y `activo = true`
- **Grid start/end**: Calcular desde `min(hora_inicio)` hasta `max(hora_fin)` de los tramos del dia
- **Huecos entre tramos**: Renderizar bloques grises con texto "Cerrado" entre tramos (ej. de 14:00 a 16:00)
- **`getAvailableSlots`**: Generar slots solo dentro de los tramos activos, no en el rango global
- **Click en hueco cerrado**: No debe abrir el dialog de nueva cita (agregar `data-closed-block` y filtrar en `handleGridClick`)

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/admin/AdminHorarios.tsx` | Rediseno completo: secciones colapsables por dia con CRUD de tramos |
| `src/pages/ReservarCita.tsx` | Usar `day_schedules` para calcular slots y dias deshabilitados |
| `src/pages/admin/AdminAgenda.tsx` | Adaptar time grid para multiples tramos con zonas cerradas |

## Detalles tecnicos

- **Consulta de tramos para un dia**: `day_schedules` se filtra con `.eq('day_of_week', date.getDay()).eq('activo', true).order('hora_inicio')`
- **Generacion de slots en ReservarCita**: Se itera cada tramo `{hora_inicio, hora_fin}`, generando slots de 30 min dentro de ese rango. Un slot solo es valido si cabe completamente dentro de un tramo
- **Zonas cerradas en AdminAgenda**: Se calculan los gaps entre tramos consecutivos. Si tramo 1 termina a las 14:00 y tramo 2 empieza a las 16:00, se pinta un bloque gris de 14:00 a 16:00
- **AdminHorarios UI**: Los dias de la semana se muestran con nombres completos (Lunes, Martes...). Se usa `day_of_week` con 0=Domingo, igual que `Date.getDay()`. Los datos se agrupan localmente por `day_of_week` para renderizar
- **Orden de dias en AdminHorarios**: Se muestran de Lunes (1) a Domingo (0) para seguir la convencion espanola
