import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { db } from './firebaseConfig';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import Loader from './Loader';

export default function TestUploadExcel() {
  const [excelData, setExcelData] = useState([]);
  const [cargando, setCargando] = useState(false);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet);
      setExcelData(json);
    };
    reader.readAsArrayBuffer(file);
  };

  const subirDatos = async () => {
    if (excelData.length === 0) return alert('No hay datos cargados');

    setCargando(true);
    try {
      for (const row of excelData) {
        const dpto = row['DEPARTAMENTO']?.trim();
        const circ = row['CIRCUNSPCION']?.trim();
        const prov = row['PROVINCIA']?.trim();
        const muni = row['MUNICIPIO']?.trim();
        const rec = row['RECINTO']?.trim();
        const nroMesa = row['NumeroMesa']?.toString().trim();

        if (!dpto || !circ || !prov || !muni || !rec || !nroMesa) continue;

        // 1. Departamento
        let depId = await obtenerIdUnico('departamentos', 'nombre', dpto);
        if (!depId) depId = await agregarDoc('departamentos', { nombre: dpto, estado: 'ejemplo' });

        // 2. Circunscripción
        let circId = await obtenerIdUnico('circunscripciones', 'nombre', circ, 'idDepartamento', depId);
        if (!circId)
          circId = await agregarDoc('circunscripciones', {
            nombre: circ,
            idDepartamento: depId,
            estado: 'ejemplo',
          });

        // 3. Provincia
        let provId = await obtenerIdUnico('provincias', 'nombre', prov, 'idCircunscripcion', circId);
        if (!provId)
          provId = await agregarDoc('provincias', {
            nombre: prov,
            idCircunscripcion: circId,
            estado: 'ejemplo',
          });

        // 4. Municipio
        let muniId = await obtenerIdUnico('municipios', 'nombre', muni, 'idProvincia', provId);
        if (!muniId)
          muniId = await agregarDoc('municipios', {
            nombre: muni,
            idProvincia: provId,
            estado: 'ejemplo',
          });

        // 5. Recinto
        let recintoId = await obtenerIdUnico('recintos', 'nombre', rec, 'idMunicipio', muniId);
        if (!recintoId)
          recintoId = await agregarDoc('recintos', {
            nombre: rec,
            idMunicipio: muniId,
            estado: 'ejemplo',
          });

        // 6. Mesa
        const existeMesa = await obtenerIdUnico('mesas', 'numeroMesa', nroMesa, 'idRecinto', recintoId);
        if (!existeMesa) {
          await agregarDoc('mesas', {
            numeroMesa: nroMesa,
            idRecinto: recintoId,
            estado: 'ejemplo',
          });
        }
      }

      alert('Datos de ejemplo subidos correctamente');
      setExcelData([]);
    } catch (err) {
      console.error('Error al subir los datos:', err);
      alert('Ocurrió un error al subir los datos');
    } finally {
      setCargando(false);
    }
  };

  const obtenerIdUnico = async (col, campo, valor, campoExtra = null, valorExtra = null) => {
    if (!valor) return null;
    const q = campoExtra
      ? query(collection(db, col), where(campo, '==', valor), where(campoExtra, '==', valorExtra))
      : query(collection(db, col), where(campo, '==', valor));

    const snap = await getDocs(q);
    return snap.empty ? null : snap.docs[0].id;
  };

  const agregarDoc = async (col, data) => {
    const docRef = await addDoc(collection(db, col), data);
    return docRef.id;
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Cargar datos jerárquicos desde Excel</h2>
      <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
      <br /><br />
      <button onClick={subirDatos} disabled={cargando || excelData.length === 0}>
        Subir a Firebase
      </button>
      {cargando && <Loader />}
    </div>
  );
}
