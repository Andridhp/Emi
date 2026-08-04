# Motor de sueño v1

El motor de Emilia describe el patrón observado y propone un rango para el siguiente periodo de sueño. No prescribe horarios, no diagnostica trastornos del sueño y no sustituye las señales del bebé ni una indicación profesional.

## Entradas

- Perfil activo y fecha de nacimiento.
- Periodos de sueño completos con inicio y duración.
- Estado de un temporizador de sueño activo.
- Hora local actual.

## Cálculo

1. Convierte cada registro completo en inicio y final.
2. Calcula los intervalos de vigilia entre un sueño y el siguiente.
3. Descarta intervalos menores de 20 minutos o mayores de 8 horas para evitar errores, registros superpuestos y lapsos nocturnos no comparables.
4. Conserva hasta 10 intervalos recientes y, cuando hay suficientes datos, aparta intervalos claramente atípicos mediante desviación absoluta mediana.
5. Usa la mediana personal como centro de la estimación y la desviación absoluta mediana para construir un rango.
6. Considera cuántos días distintos están representados; muchos registros de un solo día no equivalen a un patrón estable.
7. Muestra el total registrado en las últimas 24 horas como contexto descriptivo, sin convertirlo en recomendación.
8. Clasifica el resultado como aprendiendo, próximo, dentro del rango, rango superado, sueño activo o datos desactualizados.

## Confianza

- Menos de 2 intervalos útiles: no produce una hora.
- 2–3: confianza baja.
- 4–6: confianza media si la variación es razonable.
- 7–10: puede alcanzar confianza alta si el patrón es consistente.
- Variabilidad elevada reduce la confianza.
- Registros concentrados en menos de tres días limitan la confianza.
- Antes de los 4 meses la confianza nunca supera “baja”.

La confianza indica calidad y consistencia de los datos, no probabilidad clínica de que el bebé se duerma.

## Límites deliberados

- No usa una tabla de ventanas de vigilia como verdad individual.
- No recomienda mantener despierto al bebé para alcanzar una hora.
- No calcula una predicción si el sueño está en curso.
- No interpreta llanto, enfermedad, reflujo, prematuridad o medicamentos como causas.
- Todavía no distingue automáticamente posición de la siesta, sueño nocturno, enfermedad, cambio de zona horaria o días atípicos.

## Base de seguridad

La AASM no ofrece una recomendación general de duración para menores de 4 meses por la amplia variación normal y evidencia insuficiente. Para 4–12 meses recomienda 12–16 horas totales por 24 horas, incluidas siestas, como referencia poblacional y no como horario individual.

El motor estima cuándo podría aparecer sueño; nunca modifica las recomendaciones de sueño seguro. La AAP recomienda colocar a menores de un año boca arriba, en una superficie firme, plana y no inclinada, sin objetos blandos ni ropa de cama suelta, salvo una indicación individual del profesional tratante.

Fuentes:

- https://aasm.org/resources/pdf/pediatricsleepdurationconsensus.pdf
- https://publications.aap.org/pediatrics/article/150/1/e2022057990/188304/
