# Preparación para producción

Esta lista separa el prototipo funcional de una aplicación autorizada para datos reales. Una casilla sin marcar es un bloqueo de lanzamiento, no una función que deba simularse en la interfaz.

## MVP funcional

- [x] Navegación principal y mapa completo de áreas.
- [x] Perfiles de embarazo e hijos y cuidadores con permisos por perfil.
- [x] Registro rápido y detallado, temporizadores e historiales longitudinales.
- [x] Documentos con propuestas revisables y procedencia visible.
- [x] Resumen para consulta con PDF, periodo, línea de tiempo y preguntas.
- [x] Reportes privados con enlaces temporales, revocación y contador de aperturas.
- [x] Acceso configurable con Supabase y modo demostración separado.
- [x] Consentimiento, exportación de datos y controles locales de privacidad.
- [x] Pruebas unitarias de motores, separación por perfil y estructura de rutas.
- [x] Asistente Emi con demostración local, consentimiento separado, contexto mínimo, salida estructurada y trazabilidad sin persistir el contenido.

## Backend y operaciones

- [ ] Ejecutar las migraciones en ambientes separados de desarrollo, pruebas y producción.
- [ ] Probar RLS y Storage con al menos dos familias y perfiles cruzados.
- [ ] Desplegar y probar `report-share`, incluyendo expiración, revocación, límites de tráfico y limpieza por retención.
- [x] Implementar invitaciones con token hash, aceptación autenticada, permisos por perfil, revocación de cuidadores y auditoría.
- [x] Preparar eliminación completa en servidor con reautenticación, frase explícita, siete días de recuperación, cancelación, limpieza de Storage, reintentos y comprobante anónimo.
- [ ] Desplegar y ensayar el trabajador de eliminación con fallos parciales, colas antiguas, todos los buckets y revisión legal de retención.
- [x] Conservar una bandeja de salida offline y reintentar al recuperar conexión o volver al primer plano.
- [x] Resolver ediciones simultáneas del mismo registro mediante huellas de versión y una interfaz de conflicto.
- [ ] Validar la resolución de conflictos con dos dispositivos reales y latencia/red intermitente.
- [x] Preparar conexiones OCR/IA únicamente desde funciones de servidor, con consentimiento, contexto limitado, validación y metadatos sin contenido clínico.
- [ ] Contratar y configurar proveedores, comprobar retención real, desplegar las funciones y aprobar los contratos de tratamiento de datos.
- [ ] Configurar monitoreo, respaldos cifrados, recuperación y respuesta a incidentes.

## Clínica, legal y privacidad

- [ ] Definir país e idioma iniciales y obtener revisión legal aplicable.
- [ ] Completar evaluación de impacto de privacidad y política de retención.
- [ ] Validar cada regla clínica con dos profesionales independientes y evidencia versionada.
- [ ] Ensayar la suspensión inmediata del catálogo clínico sin actualizar la aplicación.
- [ ] Validar textos de incertidumbre, atención inmediata y límites de IA con familias y profesionales.
- [ ] Prohibir en revisión de contenido diagnósticos, prescripciones, causalidad y falsa tranquilidad.

## Calidad de lanzamiento

- [ ] Auditoría WCAG y pruebas con lector de pantalla, teclado y contraste.
- [ ] Pruebas E2E en Android, iOS y web, incluyendo red intermitente y sesiones vencidas.
- [ ] Pruebas de seguridad y revisión de dependencias antes de cada versión.
- [ ] Piloto controlado con consentimiento, soporte y mecanismo de reporte de incidentes.
- [ ] Aprobación formal de producto, clínica, privacidad y seguridad.

## Criterio de decisión

El MVP puede demostrarse con datos ficticios. No debe recibir información médica real ni publicarse como producto sanitario hasta completar todos los bloqueos aplicables de las tres secciones anteriores.
