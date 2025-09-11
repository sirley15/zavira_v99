import type { HttpContext } from '@adonisjs/core/http'
import KolbService from '../services/kolbService.js'
import jwt from 'jsonwebtoken'

const kolbService = new KolbService()
const SECRET = process.env.jwt_secret || 'secret123'

export default class KolbController {

  async listarPreguntas({ response }: HttpContext) {
    try {
      const preguntas = await kolbService.listarPreguntas()
      return response.json(preguntas)
    } catch (error) {
      return response.json({ error: 'Error al obtener preguntas' })
    }
  }

  async guardarRespuestas({ request, response }: HttpContext) {
    //  aquí tomamos TODO el body (no filtramos nada)
    const raw = request.raw()
    

    // Aquí parseamos el JSON crudo
    let body: any
    try {
      body = JSON.parse(raw || "{}")
    } catch (e) {
      body = {}
    }

    const respuestas = body.respuestas
    const authUsuario = request.authUsuario // Esto es correcto


    if (!respuestas) {
      return response.status(400).json({ error: "No se recibieron respuestas" })
    }

    // aquí llamamos al service
     const resultado = await kolbService.guardarRespuestas({
    id_usuario: authUsuario.id,
    respuestas,
  })

  return response.json(resultado)
}

  async obtenerResultado({ request, response }: HttpContext) {
    try {
      const authHeader = request.header('Authorization')

      if (!authHeader) {
        return response.json({ error: 'Token obligatorio' })
      }

      const token = authHeader.replace('Bearer ', '').trim()
      const decoded: any = jwt.verify(token, SECRET)

      const id_usuario = decoded.id

      const resultado = await kolbService.obtenerResultado(id_usuario)
      return response.json(resultado)

    } catch (error) {
      return response.json({ error: 'Error al obtener resultado del test' })
    }
  }
}
