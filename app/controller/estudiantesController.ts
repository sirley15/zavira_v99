import jwt from 'jsonwebtoken';
import type { HttpContext } from '@adonisjs/core/http';
import EstudianteService from '../services/estudianteService.js';

const estudianteService = new EstudianteService();
const SECRET = process.env.jwt_secret || 'secret123';

export default class EstudiantesController {
  async filtrarEstudiantes({ request, response }: HttpContext) {
    try {
      const authHeader = request.header('Authorization') || '';
      const token = authHeader.replace('Bearer ', '').trim();
      const payload: any = jwt.verify(token, SECRET);

      if (!payload || payload.rol !== 'Administrador')
        return response.unauthorized({ error: 'No autorizado' });

      const id_institucion = payload.id_institucion;
      const { grado, curso, jornada } = request.qs();

      const resultado = await estudianteService.listarEstudiantes(
        id_institucion,
        grado,
        curso,
        jornada
      );

      return response.ok(resultado);
    } catch (error: any) {
      return response.badRequest({ error: 'Error al filtrar estudiantes', detalle: error.message });
    }
  }

  async listarPorInstitucion({ request, response }: HttpContext) {
    try {
      const authHeader = request.header('Authorization') || '';
      const token = authHeader.replace('Bearer ', '').trim();
      const payload: any = jwt.verify(token, SECRET);

      if (!payload || payload.rol !== 'Administrador')
        return response.unauthorized({ error: 'No autorizado' });

      const id_institucion = payload.id_institucion;
      const estudiantes = await estudianteService.listarPorInstitucion(id_institucion);
      return response.ok(estudiantes);
    } catch (error: any) {
      return response.badRequest({ error: 'Error al listar estudiantes', detalle: error.message });
    }
  }

  async actualizarEstudiante({ params, request, response }: HttpContext) {
    try {
      const authHeader = request.header('Authorization') || '';
      const token = authHeader.replace('Bearer ', '').trim();
      const payload: any = jwt.verify(token, SECRET);

      if (!payload || payload.rol !== 'Administrador')
        return response.unauthorized({ error: 'No autorizado' });

      const id_usuario = Number(params.id);
      if (isNaN(id_usuario)) return response.badRequest({ error: 'ID inválido' });

      const payloadBody = request.body();
      const resultado = await estudianteService.actualizarEstudiante(id_usuario, payloadBody);
      return response.ok(resultado);
    } catch (error: any) {
      return response.badRequest({ error: 'Error al actualizar estudiante', detalle: error.message });
    }
  }

  async eliminarEstudiante({ params, response, request }: HttpContext) {
    try {
      const authHeader = request.header('Authorization') || '';
      const token = authHeader.replace('Bearer ', '').trim();
      const payload: any = jwt.verify(token, SECRET);

      if (!payload || payload.rol !== 'Administrador')
        return response.unauthorized({ error: 'No autorizado' });

      const id_usuario = Number(params.id);
      if (isNaN(id_usuario)) return response.badRequest({ error: 'ID inválido' });

      const resultado = await estudianteService.eliminarEstudiante(id_usuario);
      return response.ok(resultado);
    } catch (error: any) {
      return response.badRequest({ error: 'Error al eliminar estudiante', detalle: error.message });
    }
  }

  async subirCSV({ request, response }: HttpContext) {
    try {
      const authHeader = request.header('Authorization') || '';
      const token = authHeader.replace('Bearer ', '').trim();
      const payload: any = jwt.verify(token, SECRET);

      if (!payload || payload.rol !== 'Administrador')
        return response.unauthorized({ error: 'No autorizado' });

      // Lógica existente de CSV...
    } catch (error: any) {
      return response.badRequest({ error: 'Error al importar CSV', detalle: error.message });
    }
  }
}
