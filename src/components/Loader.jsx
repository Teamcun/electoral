// src/components/Loader.jsx
import { HashLoader } from 'react-spinners';

export default function Loader() {
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.4)', // fondo negro opaco
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,  // para que esté arriba de todo
    }}>
      <HashLoader color="#085fa7" size={85} />
    </div>
  );
}
