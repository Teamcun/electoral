// StressTestPage.jsx
import React, { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from './firebaseConfig';
import { ClipLoader } from 'react-spinners';
import styles from './StressTestPage.module.css';

export default function StressTestPage() {
  const [imagenesActa, setImagenesActa] = useState([]);
  const [imagenesHoja, setImagenesHoja] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [resultados, setResultados] = useState(null);

  const handleSeleccionImagenesActa = (e) => {
    const files = Array.from(e.target.files).slice(0, 3);
    setImagenesActa(files);
  };

  const handleSeleccionImagenesHoja = (e) => {
    const files = Array.from(e.target.files).slice(0, 3);
    setImagenesHoja(files);
  };

  const generarDatosFalsos = (index, estado) => {
    return {
      nroMesa: `M-${index + 1}`,
      nombreRepresentante: `Persona ${index + 1}`,
      partido: `Partido ${index % 10}`,
      estado,
    };
  };

  const subirRegistro = async (form, imagenActa, imagenHojaTrabajo) => {
    const refActa = ref(storage, `test_actas/${form.nroMesa}_${Date.now()}`);
    await uploadBytes(refActa, imagenActa);
    const urlActa = await getDownloadURL(refActa);

    const refHoja = ref(storage, `test_hojas/${form.nroMesa}_${Date.now()}`);
    await uploadBytes(refHoja, imagenHojaTrabajo);
    const urlHoja = await getDownloadURL(refHoja);

    await addDoc(collection(db, 'recepcion'), {
      ...form,
      imagenActaUrl: urlActa,
      imagenHojaTrabajoUrl: urlHoja,
      creadoEn: serverTimestamp(),
      idUsuarioRecepcion: auth.currentUser?.uid ?? 'test-bot',
    });
  };

  const handleStressTest = async (estado) => {
    if (imagenesActa.length < 1 || imagenesHoja.length < 1) {
      alert('Selecciona al menos una imagen para Acta y Hoja de Trabajo.');
      return;
    }

    setCargando(true);
    const total = 1000;
    const start = Date.now();
    let exitosos = 0;
    let fallidos = 0;

    for (let i = 0; i < total; i++) {
      const form = generarDatosFalsos(i, estado);
      const imagenActa = imagenesActa[i % imagenesActa.length];
      const imagenHojaTrabajo = imagenesHoja[i % imagenesHoja.length];

      try {
        await subirRegistro(form, imagenActa, imagenHojaTrabajo);
        exitosos++;
      } catch (error) {
        console.error(`Error en registro ${i + 1}:`, error);
        fallidos++;
      }
    }

    const end = Date.now();
    const duracion = ((end - start) / 1000).toFixed(2);

    setResultados({ exitosos, fallidos, duracion, estado });
    setCargando(false);
  };

  return (
    <div className={styles.container}>
      <h2>Prueba de Estrés: Carga Masiva</h2>

      <div className={styles.uploads}>
        <div className={styles.uploadBox}>
          <h4 className={styles.uploadTitle}>Imágenes de Acta</h4>
          <input type="file" accept="image/*" multiple onChange={handleSeleccionImagenesActa} className={styles.uploadInput} />
        </div>
        <div className={styles.uploadBox}>
          <h4 className={styles.uploadTitle}>Imágenes de Hoja de Trabajo</h4>
          <input type="file" accept="image/*" multiple onChange={handleSeleccionImagenesHoja} className={styles.uploadInput} />
        </div>
      </div>

      <p>Selecciona 1 a 3 imágenes para Acta y Hoja de Trabajo (se reutilizan aleatoriamente).</p>

      <div className={styles.buttons}>
        <button className={styles['btn-stress']} onClick={() => handleStressTest('pendiente')} disabled={cargando}>
          Cargar 1000 con estado "pendiente"
        </button>
        <button className={styles['btn-stress']} onClick={() => handleStressTest('aprobado')} disabled={cargando}>
          Cargar 1000 con estado "aprobado"
        </button>
      </div>


      {cargando && (
        <div className={styles.spinnerContainer}>
          <ClipLoader color="#007bff" size={60} />
          <p>Cargando registros...</p>
        </div>
      )}

      {resultados && (
        <div className={styles.resultados}>
          <h3>Resultados para estado: "{resultados.estado}"</h3>
          <p>✅ Éxitos: {resultados.exitosos}</p>
          <p>❌ Fallidos: {resultados.fallidos}</p>
          <p>⏱️ Tiempo total: {resultados.duracion} segundos</p>
        </div>
      )}
    </div>
  );
}