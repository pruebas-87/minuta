export const SAMPLE_NOTES = `Reunión de seguimiento del proyecto Atlas — jueves 12 de marzo.
Asisten Ana Ruiz (product manager), Luis Paredes (backend), Marta Gil (diseño) y Diego Salas (QA).

Ana abrió recordando los objetivos del trimestre: lanzar el portal de clientes antes de fin de mayo y reducir un 30% los tickets de soporte.
Luis comentó que la migración de la base de datos a Postgres ya está en producción desde el martes y que los tiempos de consulta bajaron de 800 ms a 210 ms en promedio. Marta preguntó si eso permite mostrar el historial completo en el portal; Luis respondió que sí, pero que necesitan paginar en el frontend.

Se discutió la integración de pagos. Diego planteó que Stripe requiere una revisión de seguridad y que el equipo no tiene capacidad este trimestre. Después de conversar, el equipo decidió posponer la integración de Stripe a la fase 2 y lanzar el portal en fase 1 con transferencia manual y facturación por correo.

Sobre diseño, Marta presentó tres propuestas para el dashboard. Se acordó avanzar con la opción B porque muestra mejor el estado de las solicitudes. Marta necesita el feedback de Ana sobre los textos antes del 18 de marzo.

Riesgos: no hay una persona dedicada a QA y Diego está cubriendo dos proyectos, lo que puede atrasar la regresión. Mitigación propuesta: congelar el alcance de la fase 1 y pedir apoyo de un QA externo durante abril.

Ideas sueltas sin decisión: evaluar notificaciones por WhatsApp, revisar el plan de precios, y ver si conviene un programa de referidos.

Compromisos:
- Ana entrega el cronograma actualizado el viernes 20 de marzo.
- Luis termina el API de login el 30 de marzo.
- Marta entrega el diseño final del dashboard el 27 de marzo.
- Diego arma el plan de pruebas de regresión para el 3 de abril.

Próxima reunión: jueves 19 de marzo a las 10:00.`;
