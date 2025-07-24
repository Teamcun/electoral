import React from 'react';
import styles from './UsuarioCard.module.css';

export default function UsuarioCard({ usuario, onHabilitar, puedeHabilitar = false }) {
  return (
    <div className={styles.card}>
      <div>
        <strong>{usuario.nombre}</strong>
        <p>Email: {usuario.email}</p>
        <p>Celular: {usuario.celular}</p>
        <p>Departamento: {usuario.departamentoNombre}</p>
        <p>Provincia: {usuario.provinciaNombre}</p>
        <p>Municipio: {usuario.municipioNombre}</p>
        <p>Recinto: {usuario.recintoNombre}</p>
      </div>
      {puedeHabilitar && (
        <button onClick={() => onHabilitar(usuario)} className={styles.button}>
          Habilitar
        </button>
      )}
    </div>
  );
}
