# Motor de orientación segura

El MVP separa las alertas clínicas del análisis generativo. La IA no clasifica urgencias, no interpreta texto libre para activar una alerta y no puede reducir la prioridad de una regla.

## Alcance del piloto

- La familia marca señales observables de forma explícita.
- Una coincidencia de emergencia produce **Atención inmediata** y prevalece sobre patrones, promedios y predicciones.
- La ausencia de selección se muestra como **no evaluado**, nunca como “todo está bien”.
- Cada regla conserva versión, fuente, estado de revisión y próxima fecha de revisión.
- Las categorías Esperado, Observar y Consultar aparecen como modelo de comunicación, pero no se automatizan hasta completar validación clínica y jurisdiccional.

## Antes de producción

Se requiere un comité clínico responsable, revisión por país y etapa vital, protocolo de actualización de evidencia, pruebas de sensibilidad y lenguaje con familias, accesibilidad, localización de servicios de emergencia, monitoreo de incidentes y retirada inmediata de reglas defectuosas.

## Catálogo del backend

La migración `004_clinical_rule_catalog.sql` añade conjuntos de reglas inmutables por versión, reglas declarativas, revisiones profesionales y un historial de publicaciones. El cliente solo puede leer versiones publicadas, vigentes y habilitadas; no puede crear, editar ni aprobar contenido clínico.

Publicar exige dos aprobaciones independientes y ninguna objeción pendiente. Una función separada permite suspender inmediatamente una versión. Los países, idiomas, periodo de vigencia, evidencia y procedencia forman parte de cada lanzamiento.

Las condiciones se guardan como JSON declarativo validado por un intérprete cerrado. Nunca deben contener SQL, código ejecutable ni texto generado por IA. Las evaluaciones clínicas individuales no se registrarán hasta definir necesidad, retención y consentimiento en la evaluación de impacto de privacidad.
