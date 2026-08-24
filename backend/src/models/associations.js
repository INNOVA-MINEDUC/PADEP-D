import bcrypt from 'bcryptjs';
import env from '../config/env.js';

// Define TODAS las relaciones (FK) del esquema v3 y los hooks que
// reemplazan a los triggers/columnas generadas que sequelize.sync() no crea.
export default (db) => {
  const {
    Departamento, Municipio, Idioma, Etnia, Escalafon, Jornada, DireccionMineduc, TipoEscuela, Escuela,
    Rol, Permiso, RolPermiso, Usuario,
    Carrera, Cohorte, Semestre, Corte,
    Coordinador, Sede, CohorteSede, Seccion, EnlaceDIDEDUC, CohorteEnlace,
    TipoDocumento, Documento, Extraccion,
    Docente, Catedratico, CatedraticoNivel, CatedraticoSede,
    Inscripcion, SituacionLaboral, HistorialEstatus, Graduacion,
    Asignatura, CursoImpartido, Nota, Sesion, Asistencia, AsistenciaResumen,
    NominaRegistro, Incidencia,
  } = db;

  const CASCADE = { onUpdate: 'CASCADE', onDelete: 'CASCADE' };
  const RESTRICT = { onUpdate: 'CASCADE', onDelete: 'RESTRICT' };
  const SETNULL = { onUpdate: 'CASCADE', onDelete: 'SET NULL' };

  // Helper: define belongsTo + hasMany manteniendo el nombre de columna del esquema.
  const link = (child, parent, fk, opts) => {
    child.belongsTo(parent, { foreignKey: fk, ...opts });
    parent.hasMany(child, { foreignKey: fk, ...opts });
  };

  // ---- Catalogos geograficos ----
  link(Municipio, Departamento, 'id_departamento', RESTRICT);
  link(Escuela, TipoEscuela, 'id_tipo_escuela', SETNULL);
  link(Escuela, Municipio, 'id_municipio', RESTRICT);

  // ---- Seguridad ----
  link(RolPermiso, Rol, 'id_rol', CASCADE);
  link(RolPermiso, Permiso, 'id_permiso', CASCADE);
  Rol.belongsToMany(Permiso, { through: RolPermiso, foreignKey: 'id_rol', otherKey: 'id_permiso' });
  Permiso.belongsToMany(Rol, { through: RolPermiso, foreignKey: 'id_permiso', otherKey: 'id_rol' });
  link(Usuario, Rol, 'id_rol', RESTRICT);

  // ---- Programa academico ----
  link(Cohorte, DireccionMineduc, 'id_direccion', SETNULL);
  link(Semestre, Cohorte, 'id_cohorte', CASCADE);
  link(Corte, Semestre, 'id_semestre', CASCADE);

  // ---- Sedes ----
  link(Sede, Escuela, 'id_escuela', RESTRICT);
  link(Sede, Municipio, 'id_municipio', RESTRICT);
  link(CohorteSede, Cohorte, 'id_cohorte', CASCADE);
  link(CohorteSede, Sede, 'id_sede', RESTRICT);
  link(CohorteSede, Coordinador, 'id_coordinador', SETNULL);
  link(Seccion, CohorteSede, 'id_cohorte_sede', CASCADE);
  link(Seccion, Carrera, 'id_carrera', RESTRICT);
  link(CohorteEnlace, Cohorte, 'id_cohorte', CASCADE);
  link(CohorteEnlace, EnlaceDIDEDUC, 'id_enlace', RESTRICT);

  // ---- Archivos ----
  link(Documento, Corte, 'id_corte', CASCADE);
  link(Documento, Cohorte, 'id_cohorte', RESTRICT);
  link(Documento, TipoDocumento, 'id_tipo', RESTRICT);
  link(Documento, Usuario, 'id_usuario', SETNULL);
  link(Extraccion, Documento, 'id_documento', CASCADE);

  // ---- Personas ----
  link(Docente, Idioma, 'id_idioma', SETNULL);
  link(Docente, Etnia, 'id_etnia', SETNULL);
  link(Docente, Municipio, 'id_municipio_residencia', SETNULL);
  link(Catedratico, Departamento, 'id_departamento', SETNULL);
  link(CatedraticoNivel, Catedratico, 'id_catedratico', CASCADE);
  link(CatedraticoSede, Catedratico, 'id_catedratico', CASCADE);
  link(CatedraticoSede, Sede, 'id_sede', CASCADE);

  // ---- Inscripcion ----
  link(Inscripcion, Docente, 'id_docente', RESTRICT);
  link(Inscripcion, Cohorte, 'id_cohorte', RESTRICT);
  link(Inscripcion, Carrera, 'id_carrera', RESTRICT);
  link(Inscripcion, Seccion, 'id_seccion', SETNULL);
  link(Inscripcion, Extraccion, 'id_extraccion', SETNULL);
  link(SituacionLaboral, Inscripcion, 'id_inscripcion', CASCADE);
  link(SituacionLaboral, Semestre, 'id_semestre', CASCADE);
  link(SituacionLaboral, Escuela, 'id_escuela', SETNULL);
  link(SituacionLaboral, Escalafon, 'id_escalafon', SETNULL);
  link(SituacionLaboral, Jornada, 'id_jornada', SETNULL);
  link(HistorialEstatus, Inscripcion, 'id_inscripcion', CASCADE);
  link(HistorialEstatus, Usuario, 'id_usuario', SETNULL);
  link(Graduacion, Inscripcion, 'id_inscripcion', CASCADE);

  // ---- Oferta academica ----
  link(Asignatura, Carrera, 'id_carrera', SETNULL);
  link(CursoImpartido, Asignatura, 'id_asignatura', RESTRICT);
  link(CursoImpartido, Corte, 'id_corte', CASCADE);
  link(CursoImpartido, Seccion, 'id_seccion', SETNULL);
  link(CursoImpartido, Catedratico, 'id_catedratico', SETNULL);
  link(Nota, Inscripcion, 'id_inscripcion', CASCADE);
  link(Nota, CursoImpartido, 'id_curso_impartido', CASCADE);
  link(Nota, Extraccion, 'id_extraccion', SETNULL);
  link(Sesion, Corte, 'id_corte', CASCADE);
  link(Asistencia, Inscripcion, 'id_inscripcion', CASCADE);
  link(Asistencia, Sesion, 'id_sesion', CASCADE);
  link(Asistencia, Extraccion, 'id_extraccion', SETNULL);
  link(AsistenciaResumen, Inscripcion, 'id_inscripcion', CASCADE);
  link(AsistenciaResumen, Corte, 'id_corte', CASCADE);
  link(AsistenciaResumen, Extraccion, 'id_extraccion', SETNULL);

  // ---- Nomina ----
  link(NominaRegistro, Documento, 'id_documento', CASCADE);
  link(NominaRegistro, Corte, 'id_corte', CASCADE);
  link(NominaRegistro, Docente, 'id_docente', SETNULL);

  // ---- Calidad ----
  link(Incidencia, Extraccion, 'id_extraccion', CASCADE);
  link(Incidencia, Corte, 'id_corte', CASCADE);
  link(Incidencia, Documento, 'id_documento', SETNULL);
  link(Incidencia, Docente, 'id_docente', SETNULL);

  // =====================================================================
  // HOOKS  (equivalen a los triggers y a la columna generada del esquema)
  // =====================================================================

  // -- Usuario: hashear password y mantener updated_at --
  const hashIfChanged = async (usuario) => {
    if (usuario.changed('password_hash')) {
      usuario.password_hash = await bcrypt.hash(usuario.password_hash, env.auth.bcryptRounds);
    }
  };
  Usuario.beforeCreate(hashIfChanged);
  Usuario.beforeUpdate(async (u) => { await hashIfChanged(u); u.updated_at = new Date(); });
  // Metodo de instancia para verificar contrasena en el login.
  Usuario.prototype.validPassword = function (plain) {
    return bcrypt.compare(plain, this.password_hash);
  };

  // -- Nota.cuadra: columna generada del esquema, calculada por hook --
  const calcCuadra = (nota) => {
    const { zona, examen_final, nota_final } = nota;
    if (zona == null || examen_final == null || nota_final == null) {
      nota.cuadra = null;
      return;
    }
    const diff = Math.abs((Number(zona) + Number(examen_final)) - Number(nota_final));
    nota.cuadra = diff <= 0.01 ? 1 : 0;
  };
  Nota.beforeCreate(calcCuadra);
  Nota.beforeUpdate(calcCuadra);

  // -- trg_hist_retirado_motivo: motivo obligatorio si estatus = retirado --
  HistorialEstatus.beforeCreate((hist) => {
    if (hist.estatus === 'retirado' && (!hist.motivo || hist.motivo.trim() === '')) {
      throw new Error('motivo es obligatorio cuando estatus = retirado');
    }
  });

  // -- trg_hist_sync_inscripcion: sincroniza estatus vigente de la inscripcion --
  HistorialEstatus.afterCreate(async (hist, options) => {
    await Inscripcion.update(
      { estatus_academico: hist.estatus },
      { where: { id_inscripcion: hist.id_inscripcion }, transaction: options.transaction },
    );
  });

  // -- trg_semestre_max: una cohorte no puede tener mas de 4 semestres --
  Semestre.beforeCreate(async (sem, options) => {
    const n = await Semestre.count({
      where: { id_cohorte: sem.id_cohorte },
      transaction: options.transaction,
    });
    if (n >= 4) {
      throw new Error('la cohorte ya tiene sus 4 semestres');
    }
  });

  // -- updated_at automatico en las tablas que lo declaran --
  for (const model of [Cohorte, Corte, Docente, Inscripcion]) {
    model.beforeUpdate((row) => { row.updated_at = new Date(); });
  }
};
