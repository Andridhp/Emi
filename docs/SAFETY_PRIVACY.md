# Seguridad, privacidad y límites clínicos

## Privacidad desde el diseño

- Consentimiento granular para almacenamiento, análisis, voz, IA y compartir; revocable por finalidad.
- Cifrado TLS en tránsito y cifrado administrado en reposo; documentos en bucket privado con URL firmada breve.
- RLS por familia y perfil, roles mínimos, MFA opcional para cuidadores, cierre de sesiones y bitácora de accesos.
- Minimización y retención configurable; exportación y eliminación; copias cifradas y procedimiento probado de restauración.
- Analítica sin texto clínico, nombres, archivos ni identificadores directos. Secretos solo en servidor.
- Un enlace para profesionales es de solo lectura, expira, puede revocarse y queda auditado.
- Una invitación de cuidador no contiene datos clínicos, almacena únicamente hashes y no concede acceso hasta ser aceptada por una cuenta autenticada.
- Los permisos se asignan por perfil: ver, registrar o administrar. Los cambios de permisos se auditan.
- La eliminación requiere autenticación reciente, confirmación explícita, alcance visible y siete días de recuperación. Storage se limpia antes que Postgres y Auth se procesa mediante una cola reintentable.
- La exportación portable separa metadatos de archivos binarios y excluye rutas privadas del dispositivo. La copia sigue siendo sensible y debe protegerse fuera de Emi.

Antes de producción deben definirse jurisdicción y roles legales, completar evaluación de impacto, contratos con encargados, respuesta a incidentes, derechos ARCO/GDPR aplicables y revisión específica de datos de menores. No asumir cumplimiento sanitario por elegir un proveedor.

## Seguridad clínica

- `expected`, `observe`, `consult` y `urgent` proceden de reglas clínicas versionadas y revisadas; no de generación libre.
- Una alerta urgente no depende de promedios personales y muestra acciones aprobadas y números locales verificados.
- La IA resume evidencia y propone preguntas. No diagnostica, prescribe, modifica dosis, descarta urgencias ni afirma causalidad.
- Todo valor extraído conserva documento, página, texto original, confianza y estado de confirmación.
- Los análisis indican datos insuficientes, periodo comparado y caducidad. Un profesional puede corregir datos sin borrar el original.
- La aplicación debe validar accesibilidad, sesgos lingüísticos, falsas alarmas, omisiones y funcionamiento sin conexión.

## Lenguaje permitido

Usar: “en los registros”, “podría”, “conviene confirmar”, “comparación temporal” y “estimación”. Evitar: “tiene”, “confirma”, “la causa es”, “no es grave” y recomendaciones terapéuticas no aprobadas.
