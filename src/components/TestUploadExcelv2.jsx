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

  // Versión mejorada que guarda también los códigos externos
  const subirDatos = async () => {
    if (excelData.length === 0) return alert('No hay datos cargados');

    setCargando(true);
    try {
      for (const row of excelData) {
        const depCod = row['dep']?.trim();
        const depNom = row['Departamento']?.trim();

        const provCod = row['prov']?.trim();
        const provNom = row['Provincia']?.trim();

        const muniNom = row['Municipio']?.trim();
        const distCod = row['dist']?.trim();
        const zonaNom = row['zon']?.trim();

        const tipoCircuns = row['Cincun']?.trim();

        const recCod = row['reci']?.trim();
        const recNom = row['Recinto']?.trim();

        const nroMesa = row['Numero de Mesa']?.toString().trim();
        const codMesa = row['mesa']?.toString().trim();

        const habilitados = row['Habilitados'] || 0;
        const inhabilitados = row['Inhabilitados'] || 0;

        if (!depCod || !depNom || !provCod || !provNom || !muniNom || !recNom || !nroMesa) continue;

        // 1. Departamento
        let depId = await obtenerIdUnico('departamentos', 'codigo', depCod);
        if (!depId)
          depId = await agregarDoc('departamentos', {
            nombre: depNom,
            codigo: depCod,
            estado: 'activo',
          });

        // 2. Provincia
        let provId = await obtenerIdUnico('provincias', 'codigo', provCod, 'idDepartamento', depId);
        if (!provId)
          provId = await agregarDoc('provincias', {
            nombre: provNom,
            codigo: provCod,
            idDepartamento: depId,
            estado: 'activo',
          });

        // 3. Municipio
        let muniId = await obtenerIdUnico('municipios', 'nombre', muniNom, 'idProvincia', provId);
        if (!muniId)
          muniId = await agregarDoc('municipios', {
            nombre: muniNom,
            idProvincia: provId,
            estado: 'activo',
          });

        // 4. Distrito
        let distId = null;
        if (distCod) {
          distId = await obtenerIdUnico('distritos', 'codigo', distCod, 'idMunicipio', muniId);
          if (!distId)
            distId = await agregarDoc('distritos', {
              codigo: distCod,
              idMunicipio: muniId,
              estado: 'activo',
            });
        }

        // 5. Zona
        let zonaId = null;
        if (zonaNom) {
          zonaId = await obtenerIdUnico('zonas', 'nombre', zonaNom, 'idMunicipio', muniId);
          if (!zonaId)
            zonaId = await agregarDoc('zonas', {
              nombre: zonaNom,
              idMunicipio: muniId,
              estado: 'activo',
            });
        }

        // 6. Circunscripción
        let circId = null;
        if (tipoCircuns) {
          circId = await obtenerIdUnico('circunscripciones', 'nombre', tipoCircuns, 'idDepartamento', depId);
          if (!circId)
            circId = await agregarDoc('circunscripciones', {
              nombre: tipoCircuns,
              idDepartamento: depId,
              estado: 'activo',
            });
        }

        // 7. Recinto
        let recintoId = await obtenerIdUnico('recintos', 'codigo', recCod, 'idMunicipio', muniId);
        if (!recintoId)
          recintoId = await agregarDoc('recintos', {
            nombre: recNom,
            codigo: recCod,
            idMunicipio: muniId,
            estado: 'activo',
          });

        // 8. Mesa
        const mesaExiste = await obtenerIdUnico('mesas', 'numeroMesa', nroMesa, 'idRecinto', recintoId);
        if (!mesaExiste) {
          await agregarDoc('mesas', {
            numeroMesa: nroMesa,
            codigo: codMesa || null,
            habilitados: Number(habilitados),
            inhabilitados: Number(inhabilitados),
            idRecinto: recintoId,
            estado: 'activo',
          });
        }
      }

      alert('Datos cargados correctamente');
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
