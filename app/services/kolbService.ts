import ResultadoEstudiante from '../models/resultado_estudiante.js'
import TestPorEstudiantes from '../models/test_ea_por_estudiante.js'
import EstilosAprendizajes from '../models/estilos_aprendizaje.js'
import PreguntaEstiloAprendizajes from '../models/pregunta_estilo_aprendizaje.js'

export default class KolbService {

    async listarPreguntas() {
    try {
      // Aquí traes todas las preguntas desde tu modelo
      const preguntas = await PreguntaEstiloAprendizajes.all()
      return preguntas
    } catch (error) {
      console.error('Error al listar preguntas:', error)
      throw new Error('No se pudieron cargar las preguntas')
    }
  }

  // Guarda las respuestas del estudiante y calcula su estilo de aprendizaje
  async guardarRespuestas(data: any) {
    const { id_usuario, respuestas } = data

    const test = await TestPorEstudiantes.create({
      id_usuario,
      fecha_presentacion: new Date().toISOString()
    })

    const puntajes: any = {
      EC: 0,
      OR: 0,
      CA: 0,
      EA: 0
    }

    const mapEstilo:any = {
      'EXPERIENCIA CONCRETA': 'EC',
      'OBSERVACIÓN REFLEXIVA': 'OR',
      'CONCEPTUALIZACIÓN ABSTRACTA': 'CA',
      'EXPERIMENTACIÓN ACTIVA': 'EA'
    }

    for (const respuesta of respuestas) {
      const { id_pregunta, valor } = respuesta
      const pregunta = await PreguntaEstiloAprendizajes.find(id_pregunta)
      if (!pregunta) continue

      const estilo = mapEstilo[pregunta.tipo_pregunta]
      if (estilo && puntajes[estilo] !== undefined) {
        puntajes[estilo] += valor
      }

      await ResultadoEstudiante.create({
        id_test_ea_por_estudiantes: test.id_test_ea_por_estudiantes,
        id_pregunta_estilo_aprendizajes: id_pregunta,
        valor
      })
    }

    console.log('Puntajes acumulados:', puntajes)

    const valoresEstilos: any = {
      DIVERGENTE: puntajes.EC + puntajes.OR - puntajes.CA - puntajes.EA,
      CONVERGENTE: puntajes.CA + puntajes.EA - puntajes.EC - puntajes.OR,
      ACOMODADOR: puntajes.EA + puntajes.EC - puntajes.OR - puntajes.CA,
      ASIMILADOR: puntajes.OR + puntajes.CA - puntajes.EA - puntajes.EC
    }

    let estiloDominante = ''
    let mayorValor = -Infinity

    for (const estilo in valoresEstilos) {
      if (valoresEstilos[estilo] > mayorValor) {
        mayorValor = valoresEstilos[estilo]
        estiloDominante = estilo
      }
    }

    console.log('Estilo Dominante calculado:', estiloDominante)

    estiloDominante = estiloDominante.replace(/\s+/g, '').toUpperCase()

      const estiloAprendizaje = await EstilosAprendizajes.query()
  .whereILike('estilo', `%${estiloDominante.trim()}%`)
  .first()


    if (!estiloAprendizaje) {
      return { mensaje: 'No se encontró información del estilo' }
    }

    test.estilo_aprendizaje = estiloDominante  

      if (estiloAprendizaje) {
        test.id_estilos_aprendizajes = estiloAprendizaje.id_estilos_aprendizajes
      }

      await test.save()

    console.log('Test guardado con estilo:', test.toJSON())

    return {
      mensaje: 'Test guardado correctamente',
      estilo_dominante: estiloAprendizaje.estilo,
      caracteristicas: estiloAprendizaje.caracteristicas,
      recomendaciones: estiloAprendizaje.recomendaciones
    }
  }

  // Servicio para obtener el resultado más reciente del estudiante
  // Servicio para obtener el resultado más reciente del estudiante
  async obtenerResultado(id_usuario: number) {
  const test = await TestPorEstudiantes.query()
  .where('id_usuario', id_usuario)
  .orderBy('id_test_ea_por_estudiantes', 'desc') // 👈 ordenamos por el ID
  .preload('estudiante')
  .first()


  if (!test) {
    return { mensaje: 'No se encontró un test para este usuario' }
  }

  console.log('Test recuperado:', test.toJSON()) // 👀

  // Intentar traer el estilo manualmente
  let estiloAprendizaje = null
  if (test.id_estilos_aprendizajes) {
    estiloAprendizaje = await EstilosAprendizajes.find(test.id_estilos_aprendizajes)
  }

  return {
  nombre: test.estudiante?.nombre_usuario,
  apellido: test.estudiante?.apellido,
  fecha: test.fecha_presentacion,
  estilo: estiloAprendizaje ? estiloAprendizaje.estilo : test.estilo_aprendizaje, // 👈 corrección
  caracteristicas: estiloAprendizaje ? estiloAprendizaje.caracteristicas : null,
  recomendaciones: estiloAprendizaje ? estiloAprendizaje.recomendaciones : null,
}

}

}
