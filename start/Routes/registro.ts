import Router from '@adonisjs/core/services/router'
import RegistroController from '../../app/controller/registroController.js'
import EstudiantesController from '../../app/controller/estudiantesController.js'
import InstitucionController from '../../app/controller/institucionController.js'
import Authjwt from '../../app/middleware/authjwt.js'
import KolbController from '../../app/controller/kolbController.js'

// Crear instancias de controladores y middleware
const registro = new RegistroController()
const institucion = new InstitucionController()
const estudiante = new EstudiantesController()
const authjwt = new Authjwt()
const kolb = new KolbController()

//  RUTAS PARA INSTITUCIONES 
Router.post('/registrarInstitucion', registro.registrarInstitucion.bind(registro))
Router.post('/loginInstitucion', registro.loginInstitucion.bind(registro))
Router.post('/cambiarContraseñaI', registro.cambiarPasswordInstitucion.bind(registro))

Router.get('/perfilInstitucion', registro.perfilInstitucion.bind(registro))
  .use(authjwt.handle.bind(authjwt))

Router.get('/listaInstituciones', institucion.listarInstituciones.bind(institucion))


// RUTAS PARA ESTUDIANTES
Router.post('/registrarEstudiante', registro.registrarEstudiante.bind(registro))
Router.post('/loginEstudiante', registro.loginEstudiante.bind(registro))
Router.post('/cambiarContraseñaE', registro.cambiarPassword.bind(registro))

Router.get('/perfilEstudiante', registro.perfilEstudiante.bind(registro))
  .use(authjwt.handle.bind(authjwt))

// Filtrar estudiantes (con id_institucion del token)
Router.get('/estudiantes', estudiante.filtrarEstudiantes.bind(estudiante))
  .use(authjwt.handle.bind(authjwt))

// Importar CSV protegido
Router.post('/estudianteCSV', estudiante.subirCSV.bind(estudiante))
  .use(authjwt.handle.bind(authjwt))

// Listar estudiantes por institución (sin parámetro en URL)
Router.get('/listarPorInstituciones', estudiante.listarPorInstitucion.bind(estudiante))
  .use(authjwt.handle.bind(authjwt))


//  RUTAS DE KOLB (Test de estilo de aprendizaje)
Router.get('/kolb/preguntas', kolb.listarPreguntas.bind(kolb))
  .use(authjwt.handle.bind(authjwt))

// Guardar respuestas del test Kolb
Router.post('/kolb/guardarRespuestas', kolb.guardarRespuestas.bind(kolb))
  .use(authjwt.handle.bind(authjwt))

// Obtener resultado más reciente del estudiante
Router.get('/kolb/resultado', kolb.obtenerResultado.bind(kolb))
  .use(authjwt.handle.bind(authjwt))
