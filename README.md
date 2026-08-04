# Emi

MVP multiplataforma en español para acompañar a una familia desde la planeación del embarazo hasta el desarrollo infantil. Organiza registros y documentos, muestra tendencias y genera un **Resumen para consulta**. Nunca diagnostica ni sustituye la atención profesional.

## Qué puedes probar

- Alternar el perfil entre **Emilia** y **Embarazo** tocando el nombre del perfil.
- Comenzar desde una portada cálida y recorrer una bienvenida guiada: etapa familiar, perfil del bebé, cuidadores y explicación del panel.
- Volver directamente con **Ya conozco Emi** o conocer la estructura completa mediante **Explorar**.
- Agregar lactancia, sueño, pañales, síntomas y otros eventos desde el panel diario.
- Iniciar pecho o sueño y guardar un pañal mojado directamente desde el panel con un toque; los detalles quedan como opción posterior.
- Elegir al tocar lactancia entre guardar pecho sin tiempo, iniciar cronómetro o abrir los detalles de alimentación.
- Usar el mismo patrón de decisiones breves para sueño, pañales y confort, manteniendo las opciones avanzadas disponibles sin mostrarlas de inicio.
- Iniciar y finalizar temporizadores persistentes para lactancia y sueño.
- Registrar pañales con un toque, deshacer el último registro y editar o eliminar eventos con confirmación.
- Ver métricas diarias calculadas a partir de los registros reales del perfil activo.
- Obtener un rango de sueño explicable basado en medianas y variabilidad del patrón personal, con nivel de confianza y modo “aprendiendo”.
- Entrar a una pantalla propia para alimentación, sueño, pañales, síntomas, medicamentos, crecimiento y seguimiento prenatal.
- Consultar tendencias semanales en Calendario.
- Cargar un PDF o imagen en Documentos y ver el flujo de revisión.
- En cuentas conectadas, guardar PDF e imágenes de hasta 8 MB en un depósito privado, abrirlos con vínculos firmados de 60 segundos y eliminarlos junto con sus metadatos.
- Elegir informe de control rutinario o enfermedad y generar/compartir un PDF.
- Ver siempre la procedencia: familia, documento, cálculo, profesional o interpretación de IA.
- Revisar consentimientos locales, modo de almacenamiento y controles de datos en **Privacidad y datos**.
- Revisar señales observables en **Orientación segura**, con reglas de emergencia versionadas y separadas de la IA.
- Consultar un centro de avisos derivado de sesiones, citas y documentos reales, con archivo local y sin alarmas clínicas basadas en texto libre.
- Dictar notas en navegadores compatibles, con consentimiento y revisión obligatoria; el texto nunca activa reglas clínicas por sí solo.
- Configurar acceso por embarazo o hijo para cada cuidador: sin acceso, solo lectura o capacidad de registro.
- En una cuenta conectada, crear vínculos de invitación de 72 horas vinculados al correo indicado, aceptar la invitación con esa cuenta y modificar o revocar permisos por perfil.
- Descargar desde Privacidad una copia JSON portable de la información familiar, sin rutas internas ni archivos médicos binarios.
- Recorrer una eliminación protegida de cuenta con reautenticación, frase explícita, siete días para cancelar y simulación completamente local en modo demostración.
- Consultar un panel de análisis explicable con periodo, tamaño de muestra, procedencia y enlaces a los registros utilizados.
- Abrir **Asistente Emi** para preparar un resumen o preguntas con autorización explícita; en demostración usa cálculos locales y, en una cuenta conectada, envía al servidor sólo el perfil, periodo acotado y hechos documentales ya confirmados.
- Revisar peso, talla e hitos en un historial longitudinal de valores registrados, sin percentiles ni etiquetas clínicas automáticas.
- Mantener un historial separado de medicamentos y vacunas, con dosis/vía registradas, procedencia y campos pendientes de confirmar.
- Revisar lactancia, biberones, extracciones y alimentos con totales separados por unidad y sin estimar ingesta.
- Mantener continuidad entre embarazo, nacimiento y posparto materno con expedientes separados y fuentes explícitas.
- Revisar pañales mojados y evacuaciones en un historial propio con resumen diario, patrón descriptivo de siete días y detalles observados, sin inferir hidratación ni diagnósticos.
- Consultar síntomas, temperaturas y estado de ánimo en una línea de tiempo separada de las reglas clínicas, conservando método, unidad y procedencia sin interpretar texto libre.
- Abrir un centro de sueño con rango personal explicable, estado de aprendizaje, confianza, registros usados, resumen diario e historial; las señales reales del bebé siempre tienen prioridad.
- Registrar irritabilidad, gases, regurgitación y rutinas con contexto anterior y posterior, sin atribuir causalidad, y compartirlos como sección opcional del informe.
- Mantener una memoria de desarrollo por áreas declaradas por la familia, sin edades rígidas, puntuaciones ni clasificación automática de retrasos.
- Preparar un relevo de cuidados de 6, 12 o 24 horas para coordinar alimentación, sueño, pañales, bienestar, medicamentos y confort entre cuidadores.
- Guardar preguntas por perfil, marcarlas como conversadas e incorporar automáticamente las pendientes al PDF para consulta.

Los datos incluidos son ficticios y únicamente de demostración.

## Ejecutar

Requiere Node.js LTS y, para dispositivos, Expo Go compatible o una compilación de desarrollo.

```bash
npm install
npm run web
```

También puedes usar `npm run ios` o `npm run android`. El proyecto usa Expo SDK 57; durante la transición de Expo, un dispositivo físico con una versión anterior de Expo Go puede requerir una compilación de desarrollo.

## Verificar

```bash
npm run typecheck
npm test
```

## Backend seguro

El modo demostración no necesita servidor. Para habilitar Supabase:

1. Crea un proyecto Supabase en la región apropiada para tus requisitos de residencia.
2. Copia `.env.example` a `.env` y completa la URL y la clave publicable. Nunca coloques una clave de servicio en la app.
3. Ejecuta, en orden, todas las migraciones de `supabase/migrations/` en una instancia de desarrollo. Las migraciones restringen acceso por perfil, protegen Storage, modelan el procesamiento documental, crean el catálogo clínico versionado y habilitan reportes privados.
4. Verifica que el bucket `medical-documents` sea **privado** y que las rutas usen `{family_id}/{profile_id}/{document_id.ext}`. Los nombres originales nunca forman parte de la ruta.
5. Configura y despliega el trabajador protegido incluido en `supabase/functions/document-worker`. Consume `document_processing_jobs`, ejecuta análisis antimalware, OCR y extracción, y escribe únicamente propuestas en `extracted_facts`. No llames a un proveedor de IA directamente desde el cliente.
6. Despliega `supabase/functions/report-share` sin verificación JWT para que el token temporal pueda actuar como credencial. Revisa el procedimiento en [docs/REPORT_SHARING.md](docs/REPORT_SHARING.md).
7. Configura y despliega `supabase/functions/family-insights` con verificación JWT, los secretos exclusivos de servidor y un origen permitido. El procedimiento y los límites están en [docs/AI_ASSISTANT.md](docs/AI_ASSISTANT.md).
8. Configura y programa `supabase/functions/data-erasure-worker` con secretos exclusivos de servidor. Sigue el ensayo destructivo controlado descrito en [docs/DATA_ERASURE.md](docs/DATA_ERASURE.md).
9. Prueba todas las políticas RLS con dos familias distintas y activa auditoría antes de cargar datos reales.
10. No publiques reglas clínicas hasta contar con dos revisiones profesionales independientes, validación por país e idioma y un procedimiento ensayado de suspensión.

La configuración de base ya modela familias, cuidadores, perfiles, embarazo, nacimiento, posparto, preguntas para consulta, eventos, documentos, hechos extraídos, hallazgos, consentimientos y auditoría. Al conectar Supabase, estos expedientes se sincronizan de forma idempotente mediante identificadores locales estables y permisos por perfil; el modo demostración permanece aislado.

Los cambios de una cuenta conectada pasan por una bandeja de salida persistente. Si la conexión falla, permanecen en el dispositivo y Emi reintenta al recuperar internet, al volver al primer plano y de forma periódica. Una revisión de cola evita marcar como enviado un cambio nuevo que ocurrió mientras había otra sincronización en curso. Antes de enviar, Emi compara los registros modificados con la última versión recibida; si otro cuidador cambió el mismo registro, pausa la sincronización y muestra ambas versiones para elegir cuál conservar.

## Arquitectura y seguridad

- [Arquitectura](docs/ARCHITECTURE.md)
- [Privacidad y límites clínicos](docs/SAFETY_PRIVACY.md)
- [Alcance del MVP](docs/MVP.md)
- [Preparación para producción](docs/RELEASE_CHECKLIST.md)
- [Motor de sueño v1](docs/SLEEP_ENGINE.md)
- [Motor de orientación segura](docs/CLINICAL_RULES.md)
- [Reportes privados y enlaces temporales](docs/REPORT_SHARING.md)
- [Asistente Emi y vínculo seguro de IA](docs/AI_ASSISTANT.md)
- [Eliminación recuperable de datos](docs/DATA_ERASURE.md)

## Principios de IA

1. La IA propone; la familia confirma.
2. El motor de reglas clínicas validado clasifica atención; el modelo generativo no decide urgencias.
3. Cada salida cita los registros o páginas que la originaron y conserva el dato original.
4. No se permiten diagnósticos, prescripciones, ajuste de dosis, causalidad ni falsa tranquilidad.
5. Una alerta urgente no espera sincronización, IA ni aprendizaje del patrón personal.

## Estructura

```text
app/                 pantallas y navegación Expo Router
src/components/      componentes de interfaz
src/data/            datos ficticios
src/lib/             PDF, Supabase y taxonomías
src/store/           estado local del MVP
src/types/           modelo de dominio TypeScript
supabase/migrations/ esquema Postgres y RLS
docs/                arquitectura, alcance y seguridad
tests/               pruebas unitarias básicas
```

## Antes de producción

Este prototipo no está listo para almacenar datos clínicos reales. Se requiere revisión legal y clínica por país, evaluación de impacto de privacidad, validación de contenido y alarmas, pruebas RLS/Storage, autenticación robusta, política de retención/eliminación, respuesta a incidentes, accesibilidad y estudio con familias y profesionales.

Tecnología elegida según la documentación oficial vigente: Expo permite una app universal Android/iOS/web, y Supabase ofrece Auth y Row Level Security para autorización por usuario. Revisa compatibilidad de versiones antes de cada publicación.
## Acceso y autenticación

El MVP incluye creación de cuenta, verificación por correo, inicio de sesión, recuperación y actualización de contraseña, consentimiento inicial idempotente, sesión persistente, aislamiento local por cuenta, sincronización y cierre de sesión. Supabase Auth administra las contraseñas; Emi no las almacena en sus tablas ni en Zustand/AsyncStorage.

Para una cuenta real, copia `.env.example` a `.env`, completa la URL y la clave publicable de Supabase y ejecuta en orden todas las migraciones de `supabase/migrations`, incluidas `006_cloud_workspace_sync.sql`, `007_caregiver_invitations.sql`, `008_private_document_storage.sql`, `009_document_worker_runtime.sql`, `010_continuity_and_questions.sql`, `011_private_report_sharing.sql`, `012_family_insights_ai.sql` y `013_data_erasure_workflow.sql`. Configura en Supabase Auth las URL de redirección de la aplicación web y móvil; el vínculo de recuperación debe regresar a `/auth/update-password`. Sin estas variables, la interfaz muestra un modo demostración local claramente identificado. Los despliegues están documentados en [docs/DOCUMENT_WORKER.md](docs/DOCUMENT_WORKER.md), [docs/REPORT_SHARING.md](docs/REPORT_SHARING.md), [docs/AI_ASSISTANT.md](docs/AI_ASSISTANT.md) y [docs/DATA_ERASURE.md](docs/DATA_ERASURE.md).
