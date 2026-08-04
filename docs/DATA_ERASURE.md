# Eliminación recuperable de datos

Emi separa **solicitar**, **cancelar** y **ejecutar** una eliminación. El cliente nunca borra directamente una familia, un perfil, archivos privados ni una identidad de Auth.

## Recorrido de la cuenta administradora

1. La persona exporta lo que desea conservar.
2. Vuelve a autenticarse con Supabase Auth. La contraseña no se guarda en el estado local ni en Postgres.
3. Escribe la frase exacta `ELIMINAR MI CUENTA`.
4. `request_data_erasure` comprueba que la sesión se emitió hace menos de diez minutos, que la persona es propietaria y que no existe otra solicitud activa.
5. La solicitud queda pendiente durante siete días. Puede cancelarse mientras conserve el estado `pending`.
6. `data-erasure-worker`, protegido por un secreto independiente, elimina primero objetos de `medical-documents` y `consultation-reports`.
7. Una función de servicio elimina el espacio familiar mediante cascadas controladas y crea una cola transitoria para borrar la identidad de Supabase Auth.
8. Si Auth está temporalmente indisponible, la identidad se reintenta hasta cinco veces. La cola conserva el UUID sólo mientras sea necesario.
9. El comprobante final conserva únicamente huellas SHA-256 con secreto de servidor, alcance y fecha. No conserva correo, nombre, UUID original ni contenido clínico.

## Recuperación y fallos

- Una solicitud pendiente puede cancelarse y queda auditada.
- Al comenzar el procesamiento ya no se ofrece cancelación: detenerlo después de borrar parte de Storage produciría un estado inconsistente.
- Un arrendamiento evita que dos trabajadores ejecuten el mismo borrado.
- Los arrendamientos vencidos se reintentan; después de cinco intentos pasan a revisión operativa.
- La eliminación de identidad se desacopla de la base de datos para que una caída de Auth no restaure ni bloquee datos ya eliminados.

## Alcance actual

La pantalla implementada elimina la **cuenta propietaria y todo su espacio familiar**. Esto también retira el acceso de los demás cuidadores. Las funciones SQL ya distinguen `account`, `family` y `profile`, pero las interfaces independientes para cuidadores y borrado de un solo perfil requieren una política legal de conservación y transferencia de propiedad antes de exponerse.

## Despliegue y prueba obligatoria

1. Aplica `013_data_erasure_workflow.sql` en desarrollo.
2. Configura secretos usando `supabase/functions/data-erasure-worker/.env.example`.
3. Despliega `data-erasure-worker` sin acceso público ordinario; sólo el programador autorizado debe enviar `x-worker-secret`.
4. Programa invocaciones periódicas y alertas para estados `failed` o colas de Auth antiguas.
5. Prueba con datos ficticios: solicitud, frase incorrecta, sesión vieja, cancelación, expiración de siete días, archivos en ambos buckets, caída entre Storage y Postgres, caída de Auth y reintento.
6. Verifica que enlaces de reportes, invitaciones, accesos por perfil y URLs firmadas dejan de funcionar.
7. Antes de producción, aprueba la retención del comprobante anónimo, las obligaciones legales de conservación y el proceso para titulares menores de edad.

El modo demostración sólo simula los estados de solicitud y cancelación. Nunca crea una tarea real.
