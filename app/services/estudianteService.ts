import Usuario from '../models/usuario.js'
import bcrypt from 'bcrypt'

export default class EstudianteService {
  
  async listarEstudiantes(
    id_institucion: number,
    grado?: number,
    curso?: string,
    jornada?: string
  ) {
    const query = Usuario.query()
      .where('id_institucion', id_institucion)
      .where('rol', 'Usuario')

    if (grado !== undefined && grado !== null) query.where('grado', grado)
    if (curso) query.where('curso', curso)
    if (jornada) query.where('jornada', jornada)

    return await query
  }

  async obtenerEstudiante(id_usuario: number, id_institucion: number) {
    const user = await Usuario.query()
      .where('id_usuario', id_usuario)
      .where('id_institucion', id_institucion)
      .first()

    if (!user) return { error: 'Estudiante no encontrado' }
    return { estudiante: user }
  }

  async actualizarEstudiante(id_usuario: number, id_institucion: number, payload: any) {
    const user = await Usuario.query()
      .where('id_usuario', id_usuario)
      .where('id_institucion', id_institucion)
      .first()

    if (!user) return { error: 'Estudiante no encontrado' }

    const {
      nombre_usuario,
      apellido,
      tipo_documento,
      numero_documento,
      grado,
      curso,
      jornada,
      correo,
      password,
     
    } = payload

    if (nombre_usuario !== undefined) user.nombre_usuario = nombre_usuario
    if (apellido !== undefined) user.apellido = apellido
    if (tipo_documento !== undefined) user.tipo_documento = tipo_documento
    if (numero_documento !== undefined) user.numero_documento = numero_documento
    if (grado !== undefined) user.grado = grado
    if (curso !== undefined) user.curso = curso
    if (jornada !== undefined) user.jornada = jornada
    if (correo !== undefined) user.correo = correo

    if (password !== undefined && String(password).trim() !== '') {
      user.password = await bcrypt.hash(String(password), 10)
    }

    await user.save()
    return { mensaje: 'Estudiante actualizado correctamente', estudiante: user }
  }

  
  async eliminarEstudiante(id_usuario: number, id_institucion: number) {
    const user = await Usuario.query()
      .where('id_usuario', id_usuario)
      .where('id_institucion', id_institucion)
      .first()

    if (!user) return { error: 'Estudiante no encontrado' }

    await user.delete()
    return { mensaje: 'Estudiante eliminado' }
  }

  
  async listarPorInstitucion(id_institucion: number) {
    return await Usuario.query()
      .where('id_institucion', id_institucion)
      .where('rol', 'Usuario')
  }
}
