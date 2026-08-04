# Alcance funcional

## Incluido

- Familia con varios perfiles de embarazo e hijos, preparada para varios cuidadores.
- Preconcepción, edad gestacional, FPP, ácido fólico, consultas, estudios y complicaciones.
- Registro rápido de sueño, lactancia/alimentación, extracción, pañales, síntomas, temperatura, medicación, vacunas, crecimiento, conducta y rutinas.
- Línea de tiempo y tendencias sencillas con etiquetas de procedencia.
- Carga de PDF e imágenes, estado de revisión y muestra de datos extraídos.
- Cuatro niveles de orientación y mensajes de incertidumbre.
- Informe de rutina o enfermedad por periodo, vista previa y exportación PDF.

## También implementado en el MVP

- Acceso con Supabase Auth cuando existe configuración y modo demostración claramente separado cuando no existe.
- Alta, inicio de sesión, recuperación de acceso, persistencia de sesión y consentimiento inicial.
- Dictado del navegador cuando está disponible, siempre convertido en texto editable antes de guardar.
- Perfiles de embarazo e hijos, varios cuidadores y permisos locales por perfil.
- Temporizadores persistentes para pecho y sueño, además de registros rápidos que no obligan a completar formularios largos.
- Historiales independientes de sueño, alimentación, pañales, bienestar, confort, desarrollo, crecimiento, medicamentos y vacunas.
- Preparación de relevo entre cuidadores y preguntas pendientes incorporadas al informe para consulta.
- Motor de sueño personal explicable y motor separado de reglas urgentes versionadas.
- Exportación portable de datos y generación local de PDF para consulta.

## Fuera del MVP: requisitos para producción

Estos puntos no deben presentarse como funciones terminadas hasta contar con infraestructura, revisión o validación externa:

- Invitaciones reales y sincronización offline contra el backend, con resolución de conflictos.
- OCR y extracción asíncrona reales ejecutados en servidor; el MVP sólo demuestra el flujo de propuesta y confirmación.
- Catálogo clínico validado por edad, país e idioma, con dos revisiones profesionales independientes y suspensión inmediata de versiones.
- Números de emergencia, calendarios de vacunación y referencias de crecimiento definidos por jurisdicción y decisión clínica.
- Enlaces temporales auditados para profesionales y portal de solo lectura.
- Evaluación de impacto de privacidad, revisión legal, pruebas de penetración, accesibilidad formal y estudio de usabilidad con familias.

El estado y los criterios de cierre se detallan en [Preparación para producción](RELEASE_CHECKLIST.md).
