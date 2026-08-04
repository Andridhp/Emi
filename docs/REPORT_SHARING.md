# Reportes privados y enlaces temporales

El módulo “Resumen para consulta” genera el PDF en el dispositivo. Con una cuenta conectada, la familia puede subir una copia a un bucket privado y crear un enlace temporal y revocable.

## Despliegue

1. Aplica las migraciones en orden, incluida `011_private_report_sharing.sql`.
2. Confirma que el bucket `consultation-reports` exista, sea privado, acepte únicamente `application/pdf` y limite cada archivo a 5 MB.
3. Despliega la función pública que canjea el token. No debe exigir JWT porque la capacidad temporal es la credencial:

   ```bash
   supabase functions deploy report-share --no-verify-jwt
   ```

4. Verifica que la función tenga `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`. La clave de servicio vive sólo en la función; nunca se publica en Expo.
5. Prueba creación, apertura, expiración y revocación con dos familias y perfiles distintos antes de usar datos reales.

## Diseño de seguridad

- El PDF se almacena en `consultation-reports/{family_id}/{profile_id}/{report_id}.pdf`; el nombre original no forma parte de la ruta.
- Storage es privado y las políticas RLS separan familias y perfiles.
- El token tiene 256 bits aleatorios. La base conserva únicamente su hash SHA-256 y el valor sin hash se devuelve una sola vez.
- El token viaja en el fragmento `#…` del enlace. El navegador no envía ese fragmento en la petición GET ni en los registros HTTP habituales. La página lo canjea mediante POST y limpia la barra de direcciones antes de mostrar el PDF.
- La vigencia puede ser de 1 hora, 24 horas o 7 días. La familia puede revocar el acceso antes del vencimiento.
- Cada apertura válida aumenta un contador y genera una entrada de auditoría sin copiar el contenido clínico a los logs.
- Las respuestas deshabilitan caché, referencias, incrustación y detección ambigua de contenido.
- El modo demostración genera archivos locales, pero nunca sube el reporte ni crea enlaces externos.

## Límites operativos pendientes

Antes de producción se necesita configurar límites de tráfico en el borde, alertas de abuso, retención y eliminación automática de reportes vencidos, respaldos y respuesta a incidentes. También deben ensayarse las políticas RLS/Storage y el borrado completo en un ambiente de pruebas. El enlace protege el acceso; no convierte el PDF en un expediente médico ni reemplaza el consentimiento de la familia para compartirlo.
