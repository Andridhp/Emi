# Asistente Emi

El Asistente Emi es un vínculo opcional de IA para ordenar registros y preparar conversaciones con profesionales. No sustituye el panel **Análisis explicable**, que mantiene cálculos deterministas, ni **Orientación segura**, que depende de reglas clínicas versionadas.

## Recorrido

1. La persona elige una finalidad: resumen reciente, preguntas para consulta o cambios documentales.
2. La pantalla muestra antes de enviar el perfil, periodo y volumen de datos.
3. Se exige una autorización explícita para esa solicitud y un consentimiento revocable con finalidad `family_insights`.
4. El cliente envía únicamente familia, perfil y finalidad a `family-insights`; nunca envía registros directamente ni contiene la clave del proveedor.
5. La función comprueba sesión, acceso RLS, consentimiento vigente y límite de solicitudes.
6. El servidor recupera hasta 120 eventos de los últimos 14 días y hasta 80 hechos de documentos confirmados. No descarga PDFs, imágenes, OCR sin confirmar ni datos de otros perfiles.
7. El proveedor devuelve JSON estricto. El servidor vuelve a validar longitudes, listas y referencias de evidencia antes de responder.

## Límites deliberados

- No diagnostica, prescribe, modifica dosis, clasifica urgencias, etiqueta algo como normal/anormal ni afirma causalidad.
- No usa información médica externa para completar los registros.
- El texto de eventos se trata como contenido no confiable para resistir instrucciones incrustadas.
- Las referencias inventadas por el modelo se eliminan.
- La respuesta no se persiste en Postgres. `family_insight_runs` conserva solamente finalidad, modelo, versión, estado y hashes de entrada/salida.
- `store: false` solicita al proveedor no almacenar la respuesta para recuperación por API. La contratación y retención efectiva del proveedor deben validarse antes de producción.
- Un rechazo del modelo se muestra como tal y ofrece recorridos sin IA.

La salida estructurada sigue el contrato de [Structured Outputs de OpenAI](https://developers.openai.com/api/docs/guides/structured-outputs). La revisión previa al lanzamiento debe aplicar además [Safety Best Practices de OpenAI](https://developers.openai.com/api/docs/guides/safety-best-practices), especialmente supervisión humana, pruebas adversariales, comunicación de límites e identificadores de seguridad seudónimos.

## Despliegue

1. Aplica `012_family_insights_ai.sql` después de las migraciones anteriores.
2. Configura secretos de Edge Function a partir de `supabase/functions/family-insights/.env.example`. `OPENAI_API_KEY`, la clave de servicio y el secreto del identificador jamás pertenecen al cliente Expo.
3. Despliega `family-insights` con verificación JWT activa.
4. Define `ALLOWED_ORIGIN` con los orígenes web autorizados. En móvil, valida el comportamiento CORS y los enlaces universales por separado.
5. Ejecuta pruebas con dos familias, perfiles sin permiso, consentimiento revocado, sesión vencida, límite de tráfico, respuestas malformadas, rechazo y caída del proveedor.
6. Antes de datos reales, completa evaluación de impacto, contratos y retención; revisión clínica de textos; pruebas de sesgo e idioma; observabilidad sin contenido médico; y procedimiento de incidentes.

## Variables

- `OPENAI_API_KEY`: secreto del proveedor, solo servidor.
- `OPENAI_MODEL`: modelo autorizado; el valor inicial documentado es `gpt-5.6`.
- `SAFETY_IDENTIFIER_SECRET`: sal para derivar un identificador irreversible por usuario.
- `ALLOWED_ORIGIN`: uno o varios orígenes web separados por coma.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`: provistos en el entorno de Supabase; la clave de servicio se usa solo para cerrar la bitácora de ejecución.
