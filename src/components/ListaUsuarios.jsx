import React from 'react';
import UsuarioCard from './UsuarioCard';

export default function ListaUsuarios({ usuarios, puedeHabilitar = false, onHabilitar }) {
  return (
    <div>
      {usuarios.length === 0 ? (
        <p>No hay usuarios en esta sección.</p>
      ) : (
        usuarios.map((u) => (
          <UsuarioCard
            key={u.id}
            usuario={u}
            puedeHabilitar={puedeHabilitar}
            onHabilitar={onHabilitar}
          />
        ))
      )}
    </div>
  );
}
