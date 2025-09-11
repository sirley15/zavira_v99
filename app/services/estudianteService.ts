import Usuario from '../models/usuario.js'
import bcrypt from 'bcrypt'

export default class EstudianteService {

  async listarPorInstitucion(id_institucion: number) {
    return await Usuario.query()
      .where('id_institucion', id_institucion)
      .where('rol', 'Usuario')
      .select([
        'id_usuario',
        'nombre_usuario',
        'apellido',
        'tipo_documento',
        'numero_documento',
        'grado',
        'curso',
        'jornada',
        'correo',
      ])
      .orderBy('apellido', 'asc')
  }

  async listarEstudiantes(
    id_institucion: number,
    grado?: number,
    curso?: string,
    jornada?: string
  ) {
    const query = Usuario.query()
      .where('id_institucion', id_institucion)
      .where('rol', 'Usuario') 
      .select([
        'id_usuario',
        'nombre_usuario',
        'apellido',
        'tipo_documento',
        'numero_documento',
        'grado',
        'curso',
        'jornada',
        'correo',
      ])

    if (grado != null) query.where('grado', grado)
    if (curso) query.where('curso', curso)
    if (jornada) query.where('jornada', jornada)

    return await query
      .orderBy('grado', 'asc')
      .orderBy('curso', 'asc')
      .orderBy('apellido', 'asc')
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
  // Acepta snake_case o camelCase y normaliza todo a las columnas de BD.
  const p = payload || {}

  const toStr = (v: any) => (v === undefined ? undefined : String(v))
  const norm: any = {}

  // nombre_usuario
  norm.nombre_usuario = toStr(p.nombre_usuario ?? p.nombreUsuario)
  // apellido
  norm.apellido = toStr(p.apellido)
  // tipo_documento (si viene, a UPPERCASE)
  const td = toStr(p.tipo_documento ?? p.tipoDocumento)
  if (td !== undefined) norm.tipo_documento = td.toUpperCase()
  // numero_documento
  const nd = toStr(p.numero_documento ?? p.numeroDocumento)
  if (nd !== undefined) norm.numero_documento = nd
  // grado (numérico si vino)
  if (p.grado !== undefined && p.grado !== null && String(p.grado) !== '') {
    const g = Number(p.grado)
    if (!Number.isNaN(g)) norm.grado = g
  }
  // curso
  norm.curso = toStr(p.curso)
  // jornada
  norm.jornada = toStr(p.jornada)
  // correo
  norm.correo = toStr(p.correo)

  // Purga claves undefined para evitar updates vacíos
  for (const k of Object.keys(norm)) {
    if (norm[k] === undefined) delete norm[k]
  }

  if (Object.keys(norm).length === 0) {
    return { error: 'No hay campos para actualizar' }
  }

  // Actualiza updated_at si tu tabla lo usa en snake_case
  norm.updated_at = new Date()

  // UPDATE atómico sin returning
  const affected = await Usuario.query()
    .where('id_usuario', id_usuario)
    .where('id_institucion', id_institucion)
    .update(norm)

  if (!affected) {
    return { error: 'Estudiante no encontrado' }
  }

  // Vuelve a leer lo guardado desde BD
  const estudiante = await Usuario.query()
    .where('id_usuario', id_usuario)
    .where('id_institucion', id_institucion)
    .select([
      'id_usuario',
      'nombre_usuario',
      'apellido',
      'tipo_documento',
      'numero_documento',
      'grado',
      'curso',
      'jornada',
      'correo',
      'id_institucion',
      'created_at',
      'updated_at',
    ])
    .first()

  return { mensaje: 'Estudiante actualizado correctamente', estudiante }
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

}
