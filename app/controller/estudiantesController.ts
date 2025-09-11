// app/controllers/estudiantes_controller.ts
import jwt from 'jsonwebtoken'
import type { HttpContext } from '@adonisjs/core/http'
import EstudianteService from '../services/estudianteService.js'
import Usuario from '../models/usuario.js'
import bcrypt from 'bcrypt'
import { parse } from 'csv-parse/sync'
import fs from 'node:fs/promises'
import * as xlsx from 'xlsx'

const estudianteService = new EstudianteService()
const SECRET = process.env.jwt_secret || 'secret123'

// Normalizaciones muy básicas
const normGrado = (s: any = '') => {
  const limpio = String(s).replace('°', '').trim()
  const n = parseInt(limpio, 10)
  return Number.isNaN(n) ? null : n
}
const normCurso = (s: any = '') => String(s).trim().toUpperCase()
const normJornada = (s: any = '') => String(s).trim()

// Helper para validar token y rol
function getAdminPayload(request: HttpContext['request']) {
  const authHeader = request.header('Authorization') || ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) throw new Error('Falta token')
  const payload: any = jwt.verify(token, SECRET)
  if (!payload || payload.rol !== 'Administrador') throw new Error('No autorizado')
  return payload
}

export default class EstudiantesController {
  // GET /estudiantes?grado=&curso=&jornada=
  async filtrarEstudiantes({ request, response }: HttpContext) {
    try {
      const payload = getAdminPayload(request)
      const id_institucion = Number(payload.id_institucion)

      const { grado, curso, jornada } = request.qs()
      const gradoN = grado ? normGrado(grado) : undefined
      const cursoN = curso ? normCurso(curso) : undefined
      const jornadaN = jornada ? normJornada(jornada) : undefined

      const lista = await estudianteService.listarEstudiantes(
        id_institucion,
        gradoN ?? undefined, // null -> undefined
        cursoN,
        jornadaN
      )

      return response.ok(lista) // el frontend espera un array
    } catch (err: any) {
      if (err.message === 'No autorizado' || err.name === 'JsonWebTokenError') {
        return response.unauthorized({ error: 'No autorizado' })
      }
      return response.badRequest({ error: 'Error al filtrar estudiantes', detalle: err.message })
    }
  }

  // GET /listarPorInstitucion
  async listarPorInstitucion({ request, response }: HttpContext) {
    try {
      const payload = getAdminPayload(request)
      const id_institucion = Number(payload.id_institucion)

      const estudiantes = await estudianteService.listarPorInstitucion(id_institucion)
      return response.ok(estudiantes)
    } catch (err: any) {
      if (err.message === 'No autorizado' || err.name === 'JsonWebTokenError') {
        return response.unauthorized({ error: 'No autorizado' })
      }
      return response.badRequest({ error: 'Error al listar estudiantes', detalle: err.message })
    }
  }

  // PATCH/PUT /actualizarEstudiante/:id  (limitado por id_institucion del token)

async actualizarEstudiante({ params, request, response }: HttpContext) {
  try {
    const payload = getAdminPayload(request) // valida token + rol=Administrador
    const id_institucion = Number(payload.id_institucion)

    const id_usuario = Number(params.id)
    if (!Number.isFinite(id_usuario)) {
      return response.badRequest({ error: 'ID inválido' })
    }

    // Aceptar snake_case y camelCase
    const b: any = request.body() || {}
    const pick = (a: any, b: any) =>
      a !== undefined && a !== null && String(a).trim() !== '' ? a : b

    const body = {
      nombre_usuario: pick(b.nombre_usuario, b.nombreUsuario),
      apellido: pick(b.apellido, b.apellidos),
      tipo_documento: (pick(b.tipo_documento, b.tipoDocumento) || '').toUpperCase() || undefined,
      numero_documento: pick(b.numero_documento, b.numeroDocumento),
      grado: b.grado !== undefined ? Number(b.grado) : undefined,
      curso: pick(b.curso, b.curso),           // mismo nombre en ambos casos
      jornada: pick(b.jornada, b.jornada),     // idem
      correo: pick(b.correo, b.email),
      password: b.password,
    }

    // Quitar undefined para no sobreescribir con vacío
    Object.keys(body).forEach((k) => (body as any)[k] === undefined && delete (body as any)[k])

    const resultado = await estudianteService.actualizarEstudiante(
      id_usuario,
      id_institucion,
      body
    )

    if ((resultado as any)?.error) {
      return response.notFound(resultado)
    }

    return response.ok(resultado)
  } catch (err: any) {
    if (err.message === 'No autorizado' || err.name === 'JsonWebTokenError') {
      return response.unauthorized({ error: 'No autorizado' })
    }
    return response.badRequest({ error: 'Error al actualizar estudiante', detalle: err.message })
  }
}


// DELETE /eliminarEstudiante/:id  (limitado por id_institucion del token)
async eliminarEstudiante({ params, request, response }: HttpContext) {
  try {
    const payload = getAdminPayload(request)
    const id_institucion = Number(payload.id_institucion)

    const id_usuario = Number(params.id)
    if (!Number.isFinite(id_usuario)) {
      return response.badRequest({ error: 'ID inválido' })
    }

    const resultado = await estudianteService.eliminarEstudiante(
      id_usuario,
      id_institucion
    )

    if ((resultado as any)?.error) {
      return response.notFound(resultado)  // 404 si no existe o no pertenece a la institución
    }

    return response.ok(resultado)
  } catch (err: any) {
    if (err.message === 'No autorizado' || err.name === 'JsonWebTokenError') {
      return response.unauthorized({ error: 'No autorizado' })
    }
    return response.badRequest({ error: 'Error al eliminar estudiante', detalle: err.message })
  }
}


  // POST /estudianteCSV  (multipart/form-data, campo: "file" o "archivo")
  async subirCSV({ request, response }: HttpContext) {
    try {
      const payload = getAdminPayload(request)
      const id_institucion = Number(payload.id_institucion)

      // Acepta key 'file' o 'archivo'; sin filtrar por extensión para evitar .csv.xlsx
      const file =
        request.file('file', { size: '20mb' }) ??
        request.file('archivo', { size: '20mb' })

      if (!file) {
        return response.badRequest({ error: 'Sube un archivo CSV o XLSX en el campo "file" (o "archivo")' })
      }
      if (!file.isValid) {
        return response.badRequest({ error: 'Archivo inválido', detalle: file.errors })
      }
      if (!file.tmpPath) {
        return response.badRequest({ error: 'No se pudo leer el archivo temporal' })
      }

      // ----- PARSEO ROBUSTO: primero Excel, si no, CSV -----
      let rows: any[] = []
      let parseadoComo: 'xlsx' | 'csv' | null = null

      // Intentar Excel
      try {
        const buf = await fs.readFile(file.tmpPath)
        const wb = xlsx.read(buf, { type: 'buffer' })
        if (wb.SheetNames?.length) {
          const ws = wb.Sheets[wb.SheetNames[0]]
          const data = xlsx.utils.sheet_to_json(ws, { defval: '', raw: false })
          if (Array.isArray(data) && data.length) {
            rows = data as any[]
            parseadoComo = 'xlsx'
          }
        }
      } catch {
        // seguimos a CSV
      }

      // Intentar CSV si no hubo filas desde Excel
      if (!rows.length) {
        let text = (await fs.readFile(file.tmpPath)).toString('utf8')
        if (text.charCodeAt(0) === 0xfeff) text = text.slice(1) // quitar BOM si existe

        const headerLine = text.split(/\r?\n/)[0] || ''
        const delimiter =
          (headerLine.match(/;/g)?.length ?? 0) > (headerLine.match(/,/g)?.length ?? 0) ? ';' : ','

        rows = parse(text, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
          delimiter,
        })
        if (rows.length) parseadoComo = 'csv'
      }

      if (!rows.length) {
        return response.badRequest({ error: 'El archivo está vacío o no se pudo leer como Excel ni como CSV' })
      }

      // ----- Normalizar claves de encabezados -----
      const normalizeKeys = (obj: any) => {
        const out: any = {}
        for (const k of Object.keys(obj)) out[String(k).trim().toLowerCase()] = obj[k]
        return out
      }
      rows = rows.map(normalizeKeys)

      // ----- Validar encabezados requeridos -----
      const required = [
        'tipo_documento',
        'numero_documento',
        'nombre_usuario',
        'apellido',
        'grado',
        'curso',
        'jornada',
        'correo',
      ]
      const missing = required.filter((k) => !(k in rows[0]))
      if (missing.length) {
        return response.badRequest({
          error: `Encabezados faltantes: ${missing.join(', ')}`,
          pista: `La primera fila debe tener: ${required.join(', ')}`,
          parseado_como: parseadoComo,
        })
      }

      // ----- Armar candidatos + duplicados en archivo -----
      const vistos = new Set<string>()
      const candidatos: any[] = []
      let duplicados_en_archivo = 0

      for (const r of rows) {
        const numero_documento = String(r.numero_documento ?? '').trim()
        if (!numero_documento) continue
        if (vistos.has(numero_documento)) { duplicados_en_archivo++; continue }
        vistos.add(numero_documento)

        const gradoNum = normGrado(r.grado)
        candidatos.push({
          nombre_usuario: String(r.nombre_usuario ?? '').trim(),
          apellido: String(r.apellido ?? '').trim(),
          tipo_documento: String(r.tipo_documento ?? '').trim().toUpperCase(),
          numero_documento,
          grado: gradoNum === null ? null : gradoNum,
          curso: normCurso(r.curso),
          jornada: normJornada(r.jornada),
          correo: String(r.correo ?? '').trim(),
        })
      }

      if (!candidatos.length) {
        return response.badRequest({ error: 'No hay registros válidos para importar' })
      }

      // ----- Buscar existentes en la institución -----
      // ----- Buscar existentes en TODA la tabla (índice único es global) -----
      const documentos = candidatos.map((c) => c.numero_documento)
      const existentesRows = await Usuario.query()
      .whereIn('numero_documento', documentos)   // ← quitar filtro por institución
      .select('numero_documento')


      const existentes = existentesRows.map((r) => String(r.numero_documento))
      const existe = new Set(existentes)
      const aInsertar = candidatos.filter((c) => !existe.has(c.numero_documento))
      const omitidos_por_existir = candidatos.length - aInsertar.length

      // ----- Preparar e insertar -----
      for (const e of aInsertar) {
        const base = e.numero_documento + (e.apellido || '').slice(-3)
        e.password = await bcrypt.hash(base, 10)
        e.rol = 'Usuario'
        e.id_institucion = id_institucion
      }

      const chunk = 500
      for (let i = 0; i < aInsertar.length; i += chunk) {
        const slice = aInsertar.slice(i, i + chunk)
        if (slice.length) await Usuario.createMany(slice)
      }

      return response.ok({
        mensaje: 'Importación finalizada',
        parseado_como: parseadoComo,
        insertados: aInsertar.length,
        duplicados_en_archivo,
        omitidos_por_existir,
        total_leidos: rows.length,
      })
    } catch (err: any) {
      if (err.message === 'No autorizado' || err.name === 'JsonWebTokenError') {
        return response.unauthorized({ error: 'No autorizado' })
      }
      return response.badRequest({ error: 'Error al importar', detalle: err?.message || String(err) })
    }
  }
}
