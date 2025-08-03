import React from 'react';
import styles from './UsuarioCard.module.css';

export default function UsuarioCard({
  usuario,
  onHabilitar,
  puedeHabilitar = false,
  onCambiarRol = null
}) {
  // Clase para el color de fondo/etiqueta según rol
  const rolClass = usuario.rol ? styles[`rol_${usuario.rol.toLowerCase()}`] : '';

  // Capitalizar la primera letra del rol
  const rolCapitalizado = usuario.rol
    ? usuario.rol.charAt(0).toUpperCase() + usuario.rol.slice(1)
    : 'No asignado';

  return (
    <div className={`${styles.card} ${rolClass}`}>
      <div>
        <strong>{usuario.nombre}</strong>
        <p>Email: {usuario.email}</p>
        <p>Celular: {usuario.celular}</p>
        <p>Departamento: {usuario.departamentoNombre}</p>
        <p>Provincia: {usuario.provinciaNombre}</p>
        <p>Municipio: {usuario.municipioNombre}</p>
        <p>Recinto: {usuario.recintoNombre}</p>
        <p>
          <strong>Rol: </strong>
          <span className={`${styles.rolEtiqueta} ${rolClass}`}>
            {rolCapitalizado}
          </span>
        </p>
      </div>

      {puedeHabilitar && (
        <button onClick={() => onHabilitar(usuario)} className={styles.button}>
          Habilitar
        </button>
      )}

      {onCambiarRol && (
        <button onClick={() => onCambiarRol(usuario)} className={styles.buttonSecundario}>
          Cambiar rol
        </button>
      )}
    </div>
  );
}

