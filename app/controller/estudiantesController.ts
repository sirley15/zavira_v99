import type { HttpContext } from '@adonisjs/core/http'
import fs from 'fs'
import RegistroService from '../services/registroService.js'
import EstudianteService from '../services/estudianteService.js'

const registroService = new RegistroService()
const estudianteService = new EstudianteService()

export default class EstudiantesController {
  // SUBIR CSV DE ESTUDIANTES
  public async subirCSV({ request, response }: HttpContext) {
    try {
      // 1) Token del Admin (institución) desde el header
      const authHeader = request.header('Authorization') || ''
      const token = authHeader.replace('Bearer ', '').trim()

      if (!token) {
        return response.badRequest({ msj: 'Falta el token de autorización (Bearer ...)' })
      }

      // 2) Archivo CSV
      const archivoCSV = request.file('csv_estudiantes')
      if (!archivoCSV?.tmpPath) {
        return response.badRequest({ msj: 'Archivo CSV no válido o no enviado' })
      }

      // 3) Leer contenido (soporta CRLF)
      const contenidoCSV = fs.readFileSync(archivoCSV.tmpPath, 'utf-8')
      const lineas = contenidoCSV
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l !== '')

      if (lineas.length <= 1) {
        return response.badRequest({ msj: 'El CSV no contiene estudiantes válidos' })
      }

      // 4) Acumuladores
      const estudiantesCreados: any[] = []
      const estudiantesConError: any[] = []

      // 5) Iterar (saltando encabezado)
      for (let i = 1; i < lineas.length; i++) {
        const linea = lineas[i]

        try {
          const campos = linea.split(',').map((c) => c.trim())

          // Requeridos: 0..6, opcional: 7 (correo)
          if (campos.length < 7) {
            throw new Error('Faltan campos obligatorios (min: nombre, apellido, tipo_documento, numero_documento, grado, curso, jornada)')
          }

          const estudianteCSV = {
            nombre_usuario: campos[0],
            apellido: campos[1],
            tipo_documento: campos[2],
            numero_documento: campos[3],
            grado: campos[4],
            curso: campos[5],
            jornada: campos[6],
            correo: campos[7] || '',
            // id_institucion ya NO se toma del CSV/body: viene del token en el service
          }

          //  ahora pasamos el token al service
          const resultado = await registroService.registrarEstudiante(estudianteCSV, token)

          if ((resultado as any).error) {
            throw new Error((resultado as any).error)
          }

          estudiantesCreados.push({
            id: resultado.estudiante.id_usuario,
            correo: resultado.estudiante.correo,
            password_temporal: resultado.password_temporal,
            token: resultado.token,
          })
        } catch (error: any) {
          estudiantesConError.push({ linea, error: error.message || 'Error desconocido' })
        }
      }

      // 6) Respuesta
      return response.ok({
        msj: 'Procesamiento del CSV completado',
        total_lineas: lineas.length - 1,
        estudiantes_creados: estudiantesCreados.length,
        estudiantes_con_error: estudiantesConError.length,
        errores: estudiantesConError,
        estudiantes: estudiantesCreados,
      })
    } catch (error: any) {
      return response.internalServerError({ msj: 'Error al procesar CSV', error: error.message })
    }
  }

  async filtrarEstudiantes({ params, request, response }: HttpContext) {
    try {
      const id_institucion = Number(params.id_institucion)
      if (isNaN(id_institucion))
        return response.badRequest({ error: 'El id_institucion debe ser un número válido' })

      const grado = request.input('grado')
      const curso = request.input('curso')
      const jornada = request.input('jornada')

      const resultado = await estudianteService.listarEstudiantes(
        id_institucion,
        grado,
        curso,
        jornada
      )
      return response.ok(resultado)
    } catch (error: any) {
      return response.badRequest({
        error: 'Error al filtrar estudiantes',
        detalle: error.message,
      })
    }
  }

  async listarPorInstitucion({ response, params }: HttpContext) {
    try {
      const id_institucion = Number(params.id)
      if (isNaN(id_institucion)) return response.badRequest({ error: 'ID inválido' })
      const estudiantes = await estudianteService.listarPorInstitucion(id_institucion)
      return response.ok(estudiantes)
    } catch {
      return response.badRequest({ error: 'Error al listar estudiantes' })
    }
  }

  async obtenerEstudiante({ params, response }: HttpContext) {
    try {
      const id = Number(params.id)
      if (isNaN(id)) return response.badRequest({ error: 'ID inválido' })
      const resultado = await estudianteService.obtenerEstudiante(id)
      return response.ok(resultado)
    } catch {
      return response.badRequest({ error: 'Error al obtener estudiante' })
    }
  }

  async actualizarEstudiante({ params, request, response }: HttpContext) {
    try {
      const id = Number(params.id)
      if (isNaN(id)) return response.badRequest({ error: 'ID inválido' })
      const payload = request.body()
      const resultado = await estudianteService.actualizarEstudiante(id, payload)
      return response.ok(resultado)
    } catch {
      return response.badRequest({ error: 'Error al actualizar estudiante' })
    }
  }

  async eliminarEstudiante({ params, response }: HttpContext) {
    try {
      const id = Number(params.id)
      if (isNaN(id)) return response.badRequest({ error: 'ID inválido' })
      const resultado = await estudianteService.eliminarEstudiante(id)
      return response.ok(resultado)
    } catch {
      return response.badRequest({ error: 'Error al eliminar estudiante' })
    }
  }
}
