// app/middleware/authjwt.ts
import jwt from 'jsonwebtoken'
import type { HttpContext } from '@adonisjs/core/http'

const SECRET = process.env.jwt_secret || 'secret123'

export default class Authjwt {
  async handle({ request, response }: HttpContext, next: () => Promise<void>) {
    const authHeader = request.header('Authorization')
    const token = authHeader ? authHeader.replace('Bearer ', '').trim() : null

    if (!token) {
      return response.unauthorized({ msj: 'Token obligatorio' })
    }

    try {
      const jwtcode = jwt.verify(token, SECRET)
      
  
      console.log("AuthUsuario en el middleware:", (request as any).authUsuario)
      ;(request as any).authUsuario = jwtcode
      await next()
    } catch {
      return response.unauthorized({ msj: 'Token invalido' })
    }
  }
}
