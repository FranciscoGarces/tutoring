/* Empresas de ejemplo. La persona responsable las carga desde Empresa → Contexto →
   "Cargar ejemplo" y las edita; se guardan en data/empresa.json.
   OJO: el código de Nodo Software y el cambio de ejemplo del junior tienen bugs
   A PROPÓSITO (son el material de la demo). No los corrijas. */
window.T = window.T || {};

(function () {
  const g = (clave, contenido) => ({ id: "g-" + clave, clave, titulo: T.core.GENERALES.find(x => x.clave === clave).titulo, contenido, general: true });
  const p = (id, titulo, contenido) => ({ id, titulo, contenido, general: false });

  // ---------------------------------------------------------------- Nodo Software
  const nodo = {
    version: 3,
    empresa: "Nodo Software",
    rubro: "Software",
    responsable: { nombre: "Cecilia Arce", rol: "Dirección general" },

    contextos: [
      g("proposito", `Nodo Software es una software factory de San Miguel con 18 personas. Fue fundada hace seis años por Martín Sosa y Cecilia Arce, que empezaron haciendo sistemas de turnos para un consultorio de su familia.
Nuestro producto principal es TurnoFácil: un sistema web de turnos para consultorios, peluquerías, barberías y otros negocios de servicios. Tiene unos 300 clientes, casi todos PyMEs de uno a cinco empleados. Cada turno perdido es plata que pierde el cliente final.`),
      g("oferta", `TurnoFácil: reservas online desde un enlace del negocio (Instagram, Google o WhatsApp); recordatorios 24 horas antes por WhatsApp o email, donde el paciente responde 1 para confirmar o 2 para cancelar (bajaron las ausencias un 30 % en promedio); agenda diaria y semanal con bloqueos; señas opcionales cobradas con Mercado Pago; multisucursal en el plan Clínica.
Planes (precios de ejemplo, se actualizan por inflación): Básico, para un profesional y un local, $ 45.000 por mes; Pro, hasta cinco profesionales, con WhatsApp y señas, $ 89.000 por mes; Clínica, varias sucursales, a convenir.
Prueba gratis de 30 días, sin tarjeta. Se puede cambiar de plan en cualquier momento; el cambio se aplica al mes siguiente. Los aumentos se avisan con 30 días de anticipación, por email y en el panel.`),
      g("trabajo", `Scrum con sprints de 2 semanas. Daily 9:30 (15 min). Tablero en Jira, proyecto TF.
Ramas: feature/TF-123 desde develop. Hotfix solo para prioridad 1.
Definición de terminado: test del caso + review de un senior + probado en staging.
Deploys a producción martes y jueves a las 18 h.
Commits y PRs en español.

Equipo (solo para el mentor y la evaluación, no para el cliente):
Martín Sosa, líder técnico: arquitectura y prioridades técnicas.
Cecilia Arce, dirección general: decisiones de negocio, precios y clientes grandes.
Ignacio Duarte, product owner: prioridades de cada sprint y alcance de los pedidos de clientes.
Ramiro Ibarra, senior de pagos: todo lo que toca Mercado Pago. Único que toca api/pagos.
Agustina Ferrari, soporte de primer nivel.
Tomás Quiroga, dev senior de backend: recordatorios, jobs e integración con WhatsApp.
Julieta Peña, dev frontend: panel del negocio y página de reservas.`),
      g("problemas", `1. Entender el impacto: a cuántos clientes afecta y desde cuándo.
2. Reproducirlo antes de arreglarlo.
3. Buscar la causa, no parchear el síntoma.
4. Primero el cambio más chico y reversible.
5. Escribir un test del caso que falló.
6. PR con: qué cambia, por qué y cómo lo probaste.`),
      g("clientes", `Sin tecnicismos. Primero escuchar y entender, después proponer.
No prometer fechas sin estimar con el equipo: "lo reviso y te aviso a las 15" es mejor que una promesa.
Avisar antes de que el cliente pregunte. Nunca culpar a un compañero ni a otro proveedor delante del cliente: se dice "estamos revisando".
Reconocer el impacto: si un paciente canceló por el error, eso es lo primero que se nombra.
Quién decide qué: soporte resuelve el uso del sistema; pagos, señas y devoluciones van a Ramiro (confirmar recepción en 2 horas hábiles, resolver en 48); cambios de precio o descuentos los autoriza Cecilia; las migraciones grandes se estiman con un senior antes de dar fecha.`),
      g("calidad", `- ¿Resuelve la causa o solo el síntoma?
- Casos borde: datos vacíos, fechas, zonas horarias (los negocios están en distintas provincias).
- ¿Puede correr dos veces en paralelo sin romper nada?
- Tiene test del caso que falló.
- No rompe otros módulos que usan la misma función.
- Descripción del PR clara: qué, por qué y cómo se probó.`),
      g("restricciones", `api/pagos: solo con un senior (Ramiro).
No se accede a datos reales de pacientes fuera de producción.
Antes de modificar jobs/recordatorios.js, tener en cuenta que el worker corre en dos réplicas.`),
      p("p-arquitectura", "Arquitectura y módulos", `api/ (Node.js + Express): turnos, clientes, negocios, pagos. Base PostgreSQL.
web/ (React): panel del negocio y página de reservas.
jobs/recordatorios.js: corre cada 15 minutos y envía los recordatorios. Existe porque los recordatorios son lo que reduce las ausencias.
api/pagos (Mercado Pago): señas y cobros. Es dinero de los clientes: no se toca sin un senior.
Desde septiembre, el worker de jobs corre en 2 réplicas para soportar más carga.`)
    ],

    documentos: [
      {
        nombre: "jobs/recordatorios.js",
        contenido: `// jobs/recordatorios.js
// Corre cada 15 minutos (cron). En producción hay 2 réplicas del worker.
const db = require("../api/db");
const whatsapp = require("../api/servicios/whatsapp");
const email = require("../api/servicios/email");

async function enviarRecordatorios() {
  const turnos = await db.query(\`
    SELECT t.id, t.fecha_hora, c.nombre, c.telefono, c.email,
           n.nombre AS negocio, n.zona_horaria
    FROM turnos t
    JOIN clientes c ON c.id = t.cliente_id
    JOIN negocios n ON n.id = t.negocio_id
    WHERE t.estado = 'confirmado'
      AND t.recordatorio_enviado = false
      AND t.fecha_hora BETWEEN now() AND now() + interval '24 hours'
  \`);

  for (const turno of turnos.rows) {
    const mensaje = armarMensaje(turno);
    if (turno.telefono) await whatsapp.enviar(turno.telefono, mensaje);
    else await email.enviar(turno.email, "Recordatorio de turno", mensaje);

    await db.query(
      "UPDATE turnos SET recordatorio_enviado = true WHERE id = $1",
      [turno.id]
    );
  }
}

function armarMensaje(turno) {
  const hora = new Date(turno.fecha_hora).toLocaleString("es-AR", {
    timeZone: turno.zona_horaria
  });
  return \`Hola \${turno.nombre}, te recordamos tu turno en \${turno.negocio} el \${hora}. Respondé 1 para confirmar o 2 para cancelar.\`;
}

module.exports = { enviarRecordatorios };`
      },
      {
        nombre: "playbook-soporte",
        contenido: `Incidentes típicos y cómo se resuelven (uso interno del mentor y de la evaluación).

1. Recordatorios duplicados (clínica). Síntoma: pacientes reciben dos mensajes por WhatsApp. Causa típica: el job corre en dos réplicas y el marcado de enviado llega tarde. Qué hacer: no prometer fecha; confirmar impacto (cuántos pacientes, desde cuándo); dev reproduce en staging; avisar cuando hay fix. Qué no hacer: tocar api/pagos ni desactivar recordatorios sin avisar.
2. Turno que no aparece (peluquería). Causa típica: zona horaria mal configurada o turno cargado en otra sucursal. Qué hacer: pedir captura del mail de confirmación y el enlace de reserva; revisar en el panel si el turno existe y en qué sucursal.
3. Pago aprobado, turno sin confirmar (estética). Causa típica: el aviso de Mercado Pago llegó tarde o se perdió. Qué hacer: escalar a Ramiro con el número de operación; no prometer plazo hasta que Ramiro confirme; decir que el dinero no se pierde y que se avisa en 48 horas hábiles.
4. Baja por aumento de precio (barbería). Qué hacer: escuchar el motivo; reconocer si el aviso llegó con poca anticipación; mostrar el plan Básico como alternativa; descuentos solo si Cecilia los autorizó.
5. Migración de clientes desde una planilla (peluquería). Qué hacer: pedir una planilla de muestra; normalizar teléfonos sin código de área; unificar clientes repetidos por teléfono; estimar con un dev senior antes de dar fecha.
6. Respuestas de WhatsApp no registradas. Causa típica: el mensaje llegó fuera de la ventana de 24 horas o con texto extra ("1 gracias"). Qué hacer: explicar al negocio que el paciente puede llamar para confirmar; registrar el caso para revisar el parser.`
      }
    ],

    // Textos que precargan las tarjetas del junior.
    tareaEjemplo: {
      entender: "Explicame qué hace jobs/recordatorios.js y por qué existe.",
      trabajo: "¿Cómo trabaja el equipo? Contame el proceso desde que tomo un ticket hasta que llega a producción.",
      tarea: "Me asignaron este ticket:\n\nTF-142 · Prioridad 2\nAlgunos clientes reciben el recordatorio del turno dos veces por WhatsApp. Lo reportaron Clínica Norte y 3 peluquerías. Empezó a mediados de septiembre.\n\n¿Cómo lo encaro?",
      revisar: "Revisá mi cambio antes de abrir el PR (ticket TF-142):\n\n```js\n// jobs/recordatorios.js\nfor (const turno of turnos.rows) {\n  // Marco el turno antes de enviar para que no se repita\n  await db.query(\n    \"UPDATE turnos SET recordatorio_enviado = true WHERE id = $1\",\n    [turno.id]\n  );\n  const mensaje = armarMensaje(turno);\n  await whatsapp.enviar(turno.telefono, mensaje);\n}\n```"
    },

    escenarios: [
          {
                "id": "bloqueo-compañero",
                "titulo": "Un compañero bloquea tu ticket",
                "resumen": "Estás en el daily del equipo de Nodo Software. Tu ticket de recordatorios depende de una revisión de Tomás Quiroga, dev senior de backend, que lleva dos días sin responder. El sprint cierra el viernes y necesitás destrabarlo hoy.",
                "modalidad": "llamada",
                "cliente": "Tomás Quiroga, dev senior de backend de Nodo. Muy bueno y muy ocupado.",
                "personalidad": "Cortante y con prisa. No es hostil, pero se cierra si lo presionan. Responde mejor a pedidos concretos.",
                "situacion": "Te acercás a su escritorio durante el daily para pedirle la revisión del PR de recordatorios. A mitad de la charla te dice que ya arregló el problema en otra rama, pero no lo comunicó. Solo si preguntan: El PR tiene 240 líneas; Julieta podría revisar pero no conoce el módulo; tiene reunión con Martín a las 11.",
                "objetivo": "Desbloquear el ticket sin escalar ni culpar, acordar una revisión concreta y coordinar con quien ya tiene el cambio.",
                "cierre": "Se resuelve cuando acuerdan quién revisa el PR y en qué plazo, o cuando el candidato propone algo concreto que Tomás puede aceptar. Si el candidato solo pide disculpas o insiste sin proponer nada, Tomás corta con un 'dale, después lo vemos'.",
                "duracion": 8,
                "dificultad": "Media"
          },
          {
                "id": "alcance-sprint",
                "titulo": "Te piden meter tres features antes del cierre",
                "resumen": "Ignacio Duarte, product owner de Nodo, te pide una reunión de planificación. Quiere sumar tres pedidos de clientes al sprint que cierra en dos días. Tenés que responderle qué entra, qué no y por qué.",
                "modalidad": "llamada",
                "cliente": "Ignacio Duarte, product owner de Nodo. Tiene presión de dirección y de clientes.",
                "personalidad": "Entusiasta y rápido. Cree que todo es un cambio chico. Cambia de opinión si ve datos.",
                "situacion": "Pide sumar exportación a Excel de la agenda, recordatorio por SMS y zona horaria por sucursal. A los 5 minutos te cuenta que uno de los clientes que lo pidió canceló ayer, pero dirección igual quiere el cambio. Solo si preguntan: El equipo tiene 30 horas disponibles; el sprint ya tiene cuatro tickets comprometidos; la zona horaria toca el módulo de recordatorios.",
                "objetivo": "Negociar el alcance con datos: explicar qué entra, qué no y por qué, sin decir que sí a todo ni cerrar con un no vacío.",
                "cierre": "Se resuelve cuando acuerdan qué entra, qué queda para el siguiente sprint y qué hace falta para decidir lo demás. Si el candidato acepta todo sin análisis, Ignacio lo toma como bien pero pide confirmación por escrito. Si rechaza todo sin alternativas, insiste y la conversación queda abierta.",
                "duracion": 10,
                "dificultad": "Alta"
          },
          {
                "id": "incidente-viernes",
                "titulo": "Viernes 19:30: los recordatorios no salieron",
                "resumen": "Es viernes a la noche y sos el responsable de guardia. Agustina Ferrari, de soporte, te llama porque varios pacientes de clientes de TurnoFácil no recibieron el recordatorio de los turnos de mañana. Tenés que atender la llamada y decidir qué hacer.",
                "modalidad": "llamada",
                "cliente": "Agustina Ferrari, soporte de Nodo. Preocupada pero no entra en pánico; necesita saber qué hacer.",
                "personalidad": "Ansiosa al principio. Se calma si ve un plan. Hace varias preguntas seguidas.",
                "situacion": "Llama al responsable de guardia por un problema con los recordatorios de la noche. A los 4 minutos aparece que hubo un deploy a las 18 h que tocó el worker, y Martín no atiende el teléfono. Solo si preguntan: El worker corre en dos réplicas; hay turnos el sábado a la mañana; el rollback está documentado pero nadie lo probó.",
                "objetivo": "Triagear el incidente, decidir un primer paso reversible, avisar a quien corresponde y dejar un registro. No improvisar un arreglo en producción.",
                "cierre": "Se resuelve cuando hay un primer paso concreto (quién hace qué, en cuánto tiempo y cómo se avisa a los clientes afectados). Si el candidato promete arreglar todo sin revisar el impacto, Agustina lo marca y pide una reunión con Martín; la llamada termina con un plan incompleto.",
                "duracion": 10,
                "dificultad": "Alta"
          },
          {
                "id": "feedback-pr",
                "titulo": "Feedback a una compañera sobre su PR",
                "resumen": "Tenés una reunión 1:1 con Julieta Peña, dev frontend de Nodo. Revisaste su PR del panel del negocio y tenés comentarios para darle. Es una conversación de equipo, no una evaluación de desempeño.",
                "modalidad": "llamada",
                "cliente": "Julieta Peña, dev frontend de Nodo. Buena y sensible a las críticas, sobre todo si la sienten pública.",
                "personalidad": "Cordial al principio. Se pone a la defensiva si siente que la juzgan. Cede si le explican el porqué con ejemplos.",
                "situacion": "Tenés que hablar de un bug de zona horaria (la fecha se muestra en UTC), dos componentes sin etiquetas para lectores de pantalla y una variable con nombre confuso. A mitad de la revisión te cuenta que Martín le pidió el PR con apuro y que ella ya lo había avisado. Solo si preguntan: El bug apareció en un negocio de Ushuaia; la accesibilidad es requisito de la página de reservas.",
                "objetivo": "Dar feedback específico y constructivo, separar lo urgente de lo opcional, escuchar la justificación y acordar qué cambia y cuándo.",
                "cierre": "Se resuelve cuando Julieta entiende los problemas y acuerdan cuáles son obligatorios y para cuándo. Si el candidato critica a la persona en vez del código, Julieta se cierra y la conversación termina sin acuerdos.",
                "duracion": 10,
                "dificultad": "Media"
          },
          {
                "id": "estimacion-direccion",
                "titulo": "La directora pide una estimación",
                "resumen": "Cecilia Arce, directora de Nodo, te llama en medio de otra reunión. Quiere saber si se puede migrar la base de pacientes de Clínica Norte antes de fin de mes. Todavía no tenés todos los datos.",
                "modalidad": "llamada",
                "cliente": "Cecilia Arce, directora de Nodo. Va directo al punto y no le gustan los rodeos.",
                "personalidad": "Impaciente, exigente y justa. Si detecta una respuesta inflada o vaga, la pide de nuevo.",
                "situacion": "Te llama para pedir una estimación de la migración de Clínica Norte. A los 5 minutos te dice que el cliente agregó dos sucursales más y quiere saber el costo. Solo si preguntan: La planilla tiene cuatro formatos de teléfono; hay unos 300 duplicados aproximados; nadie hizo una migración de este tamaño antes.",
                "objetivo": "Responder con una estimación con rango y nivel de confianza, explicar supuestos y riesgos, y decir qué información falta y cuándo se consigue.",
                "cierre": "Se resuelve cuando tiene un rango con supuestos y lo que falta. Si el candidato da una fecha sin rango, Cecilia la pide de nuevo; si cede a todo sin análisis, lo dice y corta.",
                "duracion": 8,
                "dificultad": "Alta"
          },
          {
                "id": "integracion-imposible",
                "titulo": "La clínica pide una integración imposible",
                "resumen": "Ariel Montenegro, director médico de Clínica Norte y cliente de TurnoFácil desde hace dos años, te llama. Quiere conectar el sistema con su software de historias clínicas y dice que está evaluando otros proveedores.",
                "modalidad": "llamada",
                "cliente": "Dr. Ariel Montenegro, director médico de Clínica Norte. Formal, poco tiempo y con un proveedor anterior que lo defraudó.",
                "personalidad": "Formal y con tono de autoridad. Respeta a quien admite lo que no sabe y desconfía de quien promete todo.",
                "situacion": "Te llama para plantear la integración con su software de historias clínicas, que no tiene API pública. A los 5 minutos menciona que otro proveedor ya le contestó que sí a la integración. Solo si preguntan: Manejan datos de salud (sensibles); el contrato actual vence en 60 días; el otro proveedor no sabe qué datos se van a intercambiar.",
                "objetivo": "Mantener la relación sin prometer lo que no se puede, explicar qué sí es posible, derivar a dirección y proponer un próximo paso con fecha.",
                "cierre": "Se resuelve cuando hay un próximo paso concreto (reunión con dirección y fecha de respuesta). Si el candidato promete la integración, pide confirmación por escrito. Si dice que no sin ofrecer nada, el doctor termina la llamada anunciando el cambio de proveedor.",
                "duracion": 10,
                "dificultad": "Alta"
          }
    ],

    criterios: [
      { nombre: "Escucha y claridad", descripcion: "Deja hablar, retoma lo que dijo el otro sin pedir que lo repita y se expresa en frases simples y ordenadas.", peso: 15, indicadores: {"cuenta": ["retoma con palabras propias lo que dijo el otro, para confirmar que entendió", "pregunta por lo que no entendió, sin pedir que repita lo que ya dijo", "explica en frases cortas y ordenadas, y define los términos técnicos que usa"], "noCuenta": ["pide que le repitan algo que ya se dijo", "responde a otra pregunta distinta de la que le hicieron", "habla largo sin pausas ni espacio para el otro, o usa jerga sin explicarla"]} },
      { nombre: "Empatía y contención", descripcion: "Reconoce el malestar o la presión del otro y lo contiene sin ponerse a la defensiva ni culpar a nadie.", peso: 10, indicadores: {"cuenta": ["nombra, con sus palabras, el sentimiento o la presión que nota en el otro", "deja que el otro termine y espera antes de proponer una solución", "reconoce el impacto que el problema tiene en el otro, sin culpar a nadie ni a nada", "la contención se nota en la conducta posterior: el otro se siente escuchado y sigue la conversación"], "noCuenta": ["tranquiliza sin contenido ('no te preocupes', 'todo va a estar bien') como única respuesta", "minimiza lo que siente el otro", "culpa a una persona, un proceso o un sistema para protegerse", "promete una solución sin plan: una promesa no es empatía"]} },
      { nombre: "Cierre y próximos pasos", descripcion: "Resume lo acordado, dice qué va a pasar, quién lo hace y cuándo vuelve a comunicarse.", peso: 10, indicadores: {"cuenta": ["resume lo que quedó acordado antes de cortar", "dice quién hace cada cosa, para cuándo y cómo se avisa", "confirma que el otro está de acuerdo con el plan"], "noCuenta": ["se despide sin acuerdo concreto", "deja 'hablamos después' o 'te aviso' sin fecha ni canal", "no nombra a quién le corresponde cada paso"]} },
      { nombre: "Criterio y autonomía", descripcion: "Averigua antes de prometer, resuelve lo que le corresponde y deriva lo que no. No promete fechas ni soluciones que no puede garantizar.", peso: 20, indicadores: {"cuenta": ["distingue qué puede resolver él y qué necesita que decida o haga otra persona", "verifica antes de prometer: pide datos o hace la pregunta de diagnóstico", "propone un primer paso acotado y reversible", "deriva con nombre de la persona y motivo concreto"], "noCuenta": ["promete una resolución o una fecha sin datos que la respalden", "le asigna a otro una tarea que le corresponde a él", "decide cambios en producción sin verificar el impacto"]} },
      { nombre: "Receptividad", descripcion: "Incorpora lo que dice el cliente, el compañero o el equipo, y ajusta su propuesta cuando recibe información nueva.", peso: 10, indicadores: {"cuenta": ["cambia su propuesta cuando aparece un dato nuevo, y lo dice en voz alta", "integra en el plan lo que dijo el otro, en vez de repetir su plan original"], "noCuenta": ["repite el plan original aunque el otro aportó un dato que lo cambia", "ignora la información que le dieron"]} },
      { nombre: "Curiosidad", descripcion: "Pregunta para entender lo que no sabe: desde cuándo, a quién afecta, qué se intentó antes. No da por sentado lo que no se dijo.", peso: 20, indicadores: {"cuenta": ["pregunta desde cuándo pasa, a quién afecta y qué cambió antes", "pregunta qué se intentó antes de proponer algo", "profundiza: sigue la respuesta con una pregunta más precisa"], "noCuenta": ["hace preguntas genéricas que no se conectan con lo que dijo el otro", "asume causas o antecedentes que nadie mencionó"]} },
      { nombre: "Iniciativa", descripcion: "Propone alternativas o próximos pasos sin que se lo pidan y se ofrece a hacer algo concreto dentro de lo que le corresponde.", peso: 15, indicadores: {"cuenta": ["propone alternativas o próximos pasos sin que se los pidan", "se ofrece a algo concreto dentro de lo que le corresponde", "anticipa un riesgo o una consecuencia y lo nombra"], "noCuenta": ["espera instrucciones antes de moverse", "ofrece ayuda vaga ('avisame si necesitás algo')"]} }
    ],

    notasEvaluacion: "Valorá la confiabilidad (cumple lo que promete), el pensamiento crítico (distingue lo que sabe de lo que supone), la curiosidad (pregunta lo que no sabe) y la receptividad (incorpora lo que dice el otro). Preferimos un 'lo consulto y te confirmo' antes que una respuesta rápida inventada. Con datos de pacientes y pagos no hay margen de error."
  };

  // ---------------------------------------------------------------- La Esquina (bodegón)
  // Palabras técnicas que aparecen en cada escenario, explicadas en una línea para el briefing.
  const GLOSARIO = {
    "bloqueo-compañero": [
      { termino: "Daily", significa: "reunión corta de pie, de 15 minutos, en la que cada uno cuenta qué hizo, qué hará y qué lo traba." },
      { termino: "Ticket", significa: "tarea registrada en el tablero del equipo, con su descripción y su responsable." },
      { termino: "Revisión (PR)", significa: "un compañero lee tu cambio de código antes de sumarlo al proyecto." },
      { termino: "Sprint", significa: "el período de trabajo (acá, dos semanas) con lo que el equipo se comprometió a entregar." }
    ],
    "alcance-sprint": [
      { termino: "Sprint", significa: "el período de trabajo con lo que el equipo se comprometió a entregar." },
      { termino: "Product owner", significa: "la persona que decide qué se construye primero." },
      { termino: "Feature", significa: "una funcionalidad nueva que ve el usuario." },
      { termino: "Backlog", significa: "la lista de pedidos pendientes, ordenada por prioridad." }
    ],
    "incidente-viernes": [
      { termino: "Guardia", significa: "la persona que atiende los problemas urgentes fuera del horario de trabajo." },
      { termino: "Deploy", significa: "subir a producción una versión nueva del sistema." },
      { termino: "Worker", significa: "programa que corre solo, sin pantalla (acá, el que manda los recordatorios)." },
      { termino: "Rollback", significa: "volver a la versión anterior, la que funcionaba." }
    ],
    "feedback-pr": [
      { termino: "PR (pull request)", significa: "propuesta de cambio de código que otro revisa antes de sumarla." },
      { termino: "Merge", significa: "aprobar y sumar el cambio al código principal." },
      { termino: "Feedback", significa: "devolución sobre cómo hizo algo, para que lo mejore." }
    ],
    "estimacion-direccion": [
      { termino: "Estimación", significa: "cuánto tiempo calculás que lleva algo, dando un rango." },
      { termino: "Deuda técnica", significa: "partes del código que quedaron mal hechas y hacen más lento el trabajo." },
      { termino: "Sprint", significa: "el período de trabajo con lo que el equipo se comprometió a entregar." }
    ],
    "integracion-imposible": [
      { termino: "Integración", significa: "conectar nuestro sistema con el software de otra empresa." },
      { termino: "API", significa: "la forma en que dos sistemas se hablan entre sí." },
      { termino: "Sandbox", significa: "un entorno de prueba separado de los datos reales." }
    ]
  };
  nodo.escenarios.forEach(e => { e.glosario = GLOSARIO[e.id] || []; });

  const esquina = {
    version: 2,
    empresa: "La Esquina",
    rubro: "Gastronomía",
    responsable: { nombre: "Ana Gómez", rol: "Encargada de salón" },

    contextos: [
      g("proposito", `La Esquina es un bodegón familiar del centro de San Miguel, a dos cuadras de la estación. Lo abrió la familia Gómez en 1987 y hoy somos 25 personas.
Queremos que la gente coma rico, abundante y a buen precio, y que se sienta como en casa: muchos clientes vienen hace años y nos conocen por el nombre. Un cliente mal atendido no vuelve y se lo cuenta a diez.`),
      g("oferta", `Cocina casera de bodegón: milanesas, pastas caseras, minutas, parrilla los fines de semana y postres de la casa (flan, budín de pan).
Menú ejecutivo de lunes a viernes al mediodía (plato + bebida + postre o café).
Salón para 90 personas en 3 sectores (salón principal, fondo y vereda). Tomamos reservas por teléfono y WhatsApp. Delivery propio en un radio de 20 cuadras.
Clientes: familias los fines de semana, oficinistas y comerciantes al mediodía, estudiantes de la zona y grupos que festejan cumpleaños.
Lo que más valoran: las porciones, la atención cálida y que la comida salga rápido al mediodía.`),
      g("trabajo", `Dos turnos: mediodía (11:30 a 16) y noche (19:30 a 0:30). De martes a domingo; los lunes cerramos a la noche.
Roles: encargada de salón (Ana), jefe de cocina (Rubén), 6 mozos por turno con sector asignado, 2 ayudantes de cocina, bachero y cajera.
Antes de cada turno hay una reunión de 10 minutos: platos del día, qué se terminó, reservas y grupos.
Las comandas se cargan en la tablet del salón y salen impresas en cocina. Todo pedido especial (alergias, sin sal, punto de la carne) se escribe en el campo "Observaciones".
Las propinas se juntan y se reparten por igual al cierre de cada turno.`),
      g("problemas", `1. Escuchar al cliente hasta el final, sin interrumpir ni justificarse.
2. Disculparse por la situación (no hace falta echarle la culpa a nadie).
3. Averiguar qué pasó de verdad (en cocina, en la comanda o en caja) antes de prometer nada.
4. Ofrecer una solución concreta dentro de lo que el mozo puede dar solo.
5. Si hace falta algo más, llamar a la encargada.
6. Anotarlo en el cuaderno de novedades al final del turno, para que no se repita.`),
      g("clientes", `Saludar en menos de un minuto desde que se sientan, aunque sea para decir "ya estoy con ustedes".
Nunca decir "no es mi mesa": si te llaman, te hacés cargo o avisás al compañero.
Tiempos reales: si la cocina está demorada, se avisa al tomar el pedido.
No se discute con un cliente enojado delante de otras mesas: se escucha y se resuelve.
A los clientes de siempre se los saluda por el nombre.`),
      g("calidad", `- El plato sale de la pasa en menos de 20 minutos al mediodía y 30 a la noche.
- Caliente lo caliente: si el plato espera más de 2 minutos en la pasa, se avisa a cocina.
- La comanda está completa: mesa, cubiertos, observaciones y alergias.
- La mesa se limpia y se vuelve a armar en menos de 3 minutos cuando se va un cliente.
- El ticket coincide con lo que se consumió antes de llevarlo a la mesa.`),
      g("restricciones", `Descuentos o invitaciones más allá de una bebida o un postre: solo la encargada.
Grupos de más de 12 personas o que llegan sin reserva: siempre consultar a la encargada antes de confirmar.
Alergias: nunca decir "no tiene" sin confirmarlo con el jefe de cocina.
La caja la maneja solo la cajera o la encargada.`),
      p("p-salon", "Atención en el salón", `Cada mozo tiene su sector y lo recorre con la mirada cada vez que pasa: vasos vacíos, platos terminados, alguien que levanta la mano.
Orden de servicio: saludo y carta, bebidas, pedido (ofrecer el plato del día), entradas, principales, retirar, postre y café, cuenta.
La cuenta se lleva solo cuando la piden. Se cobra en la mesa con el posnet o en caja con efectivo.
Si un plato se termina en cocina, avisan por la pasa y los mozos lo informan antes de tomar el pedido.`),
      p("p-reclamos", "Reclamos", `Lo que puede resolver el mozo solo: reponer un plato que salió mal, invitar una bebida o un postre, priorizar el pedido en cocina.
Lo que resuelve la encargada: descuentos, no cobrar un plato, reclamos por cobros o por el trato de un compañero.
Todo reclamo se anota en el cuaderno de novedades: mesa, qué pasó y cómo se resolvió.
Si la cocina dice que el plato salió bien y el cliente dice que no, gana el cliente: se repone y después se revisa internamente qué pasó.`),
      p("p-caja", "Cierre de caja", `Al final de cada turno la cajera cuenta el efectivo, imprime el cierre Z de la registradora y el resumen del posnet.
Efectivo contado + tarjetas + transferencias tiene que dar igual al total del Z.
Diferencia de hasta $2.000: se anota y se explica. Más de $2.000: se avisa a la encargada antes de irse.
Todo retiro de efectivo (proveedores, cambio) va con un vale firmado.
El sobre con el efectivo se entrega cerrado y con la planilla, nunca suelto.`)
    ],

    documentos: [
      {
        nombre: "carta-con-alergenos.txt",
        contenido: `LA ESQUINA · Carta (actualizada en septiembre)
Referencias: [TACC] contiene gluten · [L] lácteos · [H] huevo · [FS] frutos secos · [*] se cocina en la freidora compartida

ENTRADAS
- Empanadas de carne cortada a cuchillo (unidad) ........ $2.200 [TACC] [H]
- Provoleta con orégano .................................. $7.800 [L]
- Rabas .................................................. $12.500 [TACC] [H] [*]

PRINCIPALES
- Milanesa de ternera con papas fritas ................... $16.900 [TACC] [H] [*]
- Milanesa napolitana con papas fritas ................... $19.500 [TACC] [H] [L] [*]
- Ravioles de ricota con salsa a elección ................ $14.800 [TACC] [H] [L]
- Ñoquis de papa con estofado ............................ $15.200 [TACC] [H]
- Bife de chorizo con papas al horno ..................... $22.000 (sin TACC si se pide sin salsa)
- Pollo al horno con puré ................................ $15.900 [L]
- Ensalada completa (lechuga, tomate, huevo, zanahoria) .. $8.500 [H]

POSTRES
- Flan casero con dulce de leche ......................... $6.200 [L] [H] (sin TACC)
- Budín de pan ........................................... $6.200 [TACC] [L] [H]
- Panqueque con dulce de leche ........................... $6.800 [TACC] [L] [H]
- Helado de nuez (2 bochas) .............................. $5.900 [L] [FS]

MENÚ EJECUTIVO (lunes a viernes, mediodía) ............... $13.500
Plato del día + bebida sin alcohol + postre o café.

IMPORTANTE PARA CELÍACOS
Las papas fritas y todo lo empanado se cocinan en la misma freidora: NO son aptas.
La cocina puede preparar papas al horno en bandeja aparte. Siempre confirmar con Rubén antes de asegurar que un plato es apto.`
      }
    ],

    tareaEjemplo: {
      entender: "¿Cómo funciona el circuito de una comanda, desde que tomo el pedido hasta que el plato llega a la mesa? ¿Por qué se hace así?",
      trabajo: "¿Cómo es un turno de noche? Contame desde que llego hasta que me voy, y por qué existe cada paso.",
      tarea: "Tengo esta situación:\n\nMesa 12, turno mediodía. Un cliente reclama que su milanesa llegó fría. Rubén, de cocina, dice que salió bien y caliente. El cliente está molesto y la mesa de al lado está mirando.\n\n¿Cómo lo resuelvo?",
      revisar: "Revisá mi cierre de caja antes de entregarlo (turno mediodía, sábado):\n\nTotal cierre Z: $912.400\nTarjetas (posnet): $548.000\nTransferencias: $96.300\nEfectivo contado: $263.100\n\nRetiré $6.000 de la caja para pagarle al verdulero, pero no me dio factura.\nDiferencia: me faltan $5.000, supongo que di mal un vuelto. Lo dejo así y el lunes le aviso a Ana."
    },

    escenarios: [
      {
        id: "demora-mesa",
        titulo: "Cliente molesto por la demora",
        resumen: "Una familia espera su comida hace 40 minutos y el padre te llama, enojado.",
        modalidad: "presencial",
        cliente: "Roberto Díaz, 58 años, cliente de La Esquina desde hace años. Vino con su familia a almorzar un domingo.",
        personalidad: "Enojado pero razonable. Si le dan una explicación real y una solución concreta, se calma. Si le dicen \"ya sale\" sin saber, se enoja más y levanta la voz.",
        situacion: "Pidieron hace 40 minutos y todavía no les llegó nada. La mesa de al lado llegó después y ya está comiendo.\nDatos que solo da si le preguntan: son 5 personas; pidieron 2 milanesas napolitanas, 1 ravioles y 2 bifes de chorizo; es el cumpleaños número 80 de su suegra; tienen que irse a las 15 porque viaja.",
        objetivo: "Contener al cliente, averiguar el estado real del pedido antes de prometer, dar un tiempo honesto y ofrecer algo que esté a tu alcance.",
        duracion: 4,
        dificultad: "Media"
      },
      {
        id: "grupo-sin-aviso",
        titulo: "Grupo grande sin reserva",
        resumen: "Un viernes a la noche llegan 14 personas sin reserva y el salón está casi lleno.",
        modalidad: "presencial",
        cliente: "Sofía Benítez, 24 años, organiza el festejo de egresados de su grupo de la facultad.",
        personalidad: "Simpática pero insistente. Está nerviosa porque el grupo la espera en la vereda. Si le prometen algo y después no se cumple, se ofende mucho.",
        situacion: "Llega a las 21:15 y pide una mesa para 14. Asegura que \"alguien llamó el martes\", pero no hay ninguna reserva anotada.\nDatos que solo da si le preguntan: pueden dividirse en dos mesas; tienen un presupuesto de unos veinte mil pesos por persona; pueden esperar hasta media hora; dos personas son vegetarianas.",
        objetivo: "No confirmar sin consultar (regla de grupos grandes), ofrecer alternativas reales con tiempos honestos y mantener un buen trato aunque no haya lugar enseguida.",
        duracion: 4,
        dificultad: "Alta"
      },
      {
        id: "alergia",
        titulo: "Clienta celíaca",
        resumen: "Una clienta te pregunta qué puede comer: es celíaca y le preocupa la contaminación cruzada.",
        modalidad: "presencial",
        cliente: "Martina López, 35 años, primera vez en La Esquina. Vino con una amiga.",
        personalidad: "Amable pero desconfiada: ya la pasó mal en otros restaurantes. Hace preguntas precisas. Si le contestan \"sí, todo bien\" sin averiguar, se pone tensa y pregunta más.",
        situacion: "Pregunta si la milanesa puede ser sin gluten y si las papas fritas son aptas.\nDatos que solo da si le preguntan: es celíaca diagnosticada, estricta; la contaminación cruzada le hace mal; no quiere comer solo una ensalada; le encantan los postres.",
        objetivo: "No asegurar nada sin confirmar con cocina, explicar con claridad el riesgo de la freidora compartida, ofrecer alternativas seguras y dejar registrada la alergia en la comanda.",
        duracion: 4,
        dificultad: "Media"
      }
    ],

    criterios: [
      { nombre: "Escucha y contención", descripcion: "Deja hablar, reconoce el malestar o la preocupación y no se pone a la defensiva.", peso: 3 },
      { nombre: "Averigua antes de prometer", descripcion: "Consulta en cocina, en la comanda o con la encargada antes de dar tiempos o garantías.", peso: 3 },
      { nombre: "Seguridad del cliente", descripcion: "Con alergias o pedidos especiales no improvisa: pregunta, informa riesgos y lo registra.", peso: 3 },
      { nombre: "Soluciones a su alcance", descripcion: "Ofrece soluciones concretas que puede dar y deriva a la encargada lo que no le corresponde.", peso: 2 },
      { nombre: "Claridad y calidez", descripcion: "Habla simple, con tono amable, sin excusas ni culpar a compañeros delante del cliente.", peso: 2 },
      { nombre: "Cierre", descripcion: "Confirma lo acordado y deja claro qué va a pasar y cuándo vuelve a la mesa.", peso: 2 }
    ],

    notasEvaluacion: "Preferimos un \"lo consulto con cocina y vuelvo en dos minutos\" a una respuesta rápida inventada. Con las alergias no hay margen de error."
  };

  T.EJEMPLOS = {
    nodo: { etiqueta: "Nodo Software · software factory", config: nodo },
    esquina: { etiqueta: "La Esquina · bodegón familiar", config: esquina }
  };
  T.DEFAULTS = nodo;
  T.RUBROS = ["Software", "Gastronomía", "Comercio", "Salud", "Industria", "Servicios", "Otro"];
})();
