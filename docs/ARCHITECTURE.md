# Arquitectura del MVP

## Decisiones

- **Cliente:** Expo SDK 57 + React Native + TypeScript + Expo Router. Una base universal para iOS, Android y web.
- **Estado local:** Zustand. El modo demo funciona sin cuenta ni red; en producción se sustituye la persistencia de eventos por repositorios Supabase.
- **Backend recomendado:** Supabase administrado en una región elegida según residencia de datos: Postgres, Auth, Storage privado, funciones en el borde y políticas RLS.
- **Autorización:** pertenencia familiar más acceso explícito por perfil (`viewer`, `editor`, `manager`). Ser cuidador de una familia no debe revelar automáticamente todos los embarazos o hijos.
- **Procesamiento documental:** carga directa mediante URL firmada; cola asíncrona; antivirus; OCR; extracción estructurada; revisión humana obligatoria antes de promover datos.
- **IA:** servicio aislado del cliente. Recibe el mínimo contexto, produce JSON validado, registra versión/modelo/evidencias y nunca tiene acceso directo a toda la base.
- **Asistente Emi:** Edge Function autenticada que recibe sólo familia, perfil y finalidad; recupera por RLS un periodo acotado y hechos documentales confirmados. La respuesta es efímera y la bitácora conserva únicamente metadatos y hashes.

## Flujo de datos

1. El cuidador registra un evento o sube un documento.
2. El dato se guarda con perfil, hora, autor y procedencia inmutable.
3. Para documentos, un trabajador extrae hechos con página y nivel de confianza.
4. La familia confirma o corrige cada hecho. El original no se altera.
5. El motor de reglas clínicas validado evalúa señales de atención; la IA solo explica y resume.
6. Los análisis muestran evidencia, procedencia, caducidad y lenguaje de incertidumbre.
7. “Resumen para consulta” selecciona perfil, periodo y secciones, genera el PDF en el dispositivo y, con consentimiento, puede guardarlo en Storage privado con un enlace temporal y revocable.
8. Una eliminación se programa después de reautenticar, permanece cancelable siete días y se ejecuta en servidor: archivos primero, registros después e identidad Auth al final mediante una cola reintentable.

## Fronteras de confianza

- El cliente usa únicamente la clave publicable y nunca una clave de servicio.
- Invitaciones, aceptación de tokens, auditoría, OCR, IA, exportaciones completas y eliminaciones se ejecutan en funciones de servidor.
- Los tokens de invitación y enlaces compartidos se almacenan como hash, expiran y pueden revocarse.
- Storage es privado; una URL firmada se crea únicamente después de comprobar familia, perfil y finalidad.
- `member_profile_access` aplica mínimo privilegio por embarazo o hijo. Los propietarios conservan acceso administrativo.
- El registro de auditoría es de solo lectura para propietarios y de escritura exclusiva para servicios confiables.
- El cliente solicita procesamiento mediante una función que verifica permiso de edición y consentimiento vigente. La cola, los intentos y la procedencia de cada etapa son server-only.
- Cada ejecución documental conserva proveedor, versión, esquema y hashes de entrada/salida; nunca se guardan textos médicos completos en logs operativos.
- Cada solicitud del asistente requiere consentimiento `family_insights`, se limita por usuario, usa un identificador de seguridad seudónimo y valida que las evidencias citadas pertenezcan al contexto enviado.
- El catálogo clínico es de solo lectura para el cliente. Publicar requiere dos revisiones profesionales independientes; cualquier versión puede suspenderse en servidor sin actualizar la app.
- País, idioma y vigencia se filtran antes de evaluar. Si el catálogo remoto no es válido o está vencido, la app no improvisa una clasificación mediante IA.
- Los reportes compartidos usan tokens aleatorios almacenados sólo como hash. El token permanece en el fragmento del enlace, se canjea por POST en una función aislada y nunca otorga acceso directo al bucket.
- La eliminación directa no está autorizada al cliente. El trabajador usa arrendamientos, limpia los dos buckets privados y conserva únicamente un comprobante seudónimo sin claves foráneas hacia la familia eliminada.

## Límites del MVP

El MVP implementa navegación, perfiles, registros, panel diario, tendencias, sincronización configurable, almacenamiento documental privado, cola protegida, revisión humana, PDF local, reportes privados con acceso temporal, un Asistente Emi opcional y un recorrido recuperable de eliminación. Los trabajadores OCR/IA, asistente y borrado no deben activarse con datos reales hasta configurar proveedores, ensayar fallos y completar la revisión regulatoria. Las notificaciones clínicas tampoco se publican sin un catálogo clínico validado.

## Evolución

Separar dominios en `identity`, `timeline`, `documents`, `insights`, `reports` y `notifications`; añadir sincronización offline con cola idempotente; versionar esquemas de evento; incorporar observabilidad sin datos clínicos en logs; y automatizar pruebas de RLS.
