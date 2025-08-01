import React, { useEffect, useState } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import ReactECharts from 'echarts-for-react';
import styles from './ResultadosPage.module.css';

const diputadosUninominales = {
  'Santa Cruz': 14,
  'La Paz': 14,
  'Cochabamba': 9,
  'Potosí': 7,
  'Chuquisaca': 5,
  'Oruro': 4,
  'Tarija': 4,
  'Beni': 4,
  'Pando': 2,
};

const partidosInfo = [
  {
    nombre: 'ALIANZA POPULAR (AP)',
    acronimo: 'ap',
    colores: ['#5BA5D6', '#fdfeffff', '#477B29', '#58A6D7']
  },
  {
    nombre: 'LIBERTAD Y PROGRESO ADN (LYP-ADN)',
    acronimo: 'adn',
    colores: ['#D9042B', '#0D8C2D', '#FFFFFF', '#F20505', '#000000']
  },
  {
    nombre: 'AUTONOMÍA PARA BOLIVIA SÚMATE (APB-SUMATE)',
    acronimo: 'sumate',
    colores: ['#410A59', '#D91807']
  },
  {
    nombre: 'LIBERTAD Y DEMOCRACIA (LIBRE)',
    acronimo: 'libre',
    colores: ['#1D3973', '#155FBF', '#F20505', '#ffffffff']
  },
  {
    nombre: 'LA FUERZA DEL PUEBLO (FP)',
    acronimo: 'FP',
    colores: ['#52C5F2', '#57D6F2', '#F2F2F2', '#0D0D0D']
  },
  {
    nombre: 'MAS-IPSP',
    acronimo: 'mas',
    colores: ['#0B2447', '#031f47']
  },
  {
    nombre: 'MORENA',
    acronimo: 'morena',
    colores: ['#F20587', '#69BF2C', '#F2CB05', '#F25116', '#676767']
  },
  {
    nombre: 'UNIDAD',
    acronimo: 'unidad',
    colores: ['#FFBA49', '#020873']
  },
  {
    nombre: 'PARTIDO DEMOCRATA CRISTIANO (PDC)',
    acronimo: 'pdc',
    colores: ['#D90B1C', '#D90B31', '#733641', '#027373', '#0D0D0D']
  },
  {
    nombre: 'BIA-YUQUI',
    acronimo: 'BIA-YUQUI',
    colores: ['#000000', '#888888']
  },
  {
    nombre: 'OICH',
    acronimo: 'OICH',
    colores: ['#000000', '#888888']
  }
];


const getColor = (nombre, index = 0) => {
  const partido = partidosInfo.find(p => p.nombre === nombre || p.acronimo === nombre);
  return partido?.colores[index % partido.colores.length] || '#888';
};

const getAcronimo = (nombre) => {
  const partido = partidosInfo.find(p => p.nombre === nombre || p.acronimo === nombre);
  const acronimo = partido?.acronimo || nombre;
  //console.log(`getAcronimo llamada con: "${nombre}" => resultado: "${acronimo}"`);
  return acronimo;
};

const getGradient = (nombre) => {
  const partido = partidosInfo.find(p => p.nombre === nombre || p.acronimo === nombre);
  if (!partido) return '#888'; // Fallback

  const colores = partido.colores;
  if (colores.length === 1) return colores[0]; // Solo un color

  // Distribuir los colores uniformemente en el gradiente
  const stops = colores.map((color, i) => {
    const position = (i / (colores.length - 1)) * 100;
    return `${color} ${position}%`;
  }).join(', ');

  return `linear-gradient(135deg, ${stops})`;
};



export default function ResultadosPage() {
  const [boletas, setBoletas] = useState([]);
  const [departamentosMap, setDepartamentosMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const depSnap = await getDocs(collection(db, 'departamentos'));
        const depMap = {};
        depSnap.forEach(doc => {
          depMap[doc.id] = doc.data().nombre;
        });
        setDepartamentosMap(depMap);

        const q = query(collection(db, 'recepcion'), where('estado', '==', 'aprobado'));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setBoletas(data);
        setLoading(false);
      } catch (e) {
        console.error('Error:', e);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <p>Cargando datos electorales...</p>;

  const departamentos = Object.values(departamentosMap);
  const votosPorDepto = {}, participacionPorDepto = {}, votosTotalesNacionales = {};
  let habTotal = 0, valTotal = 0, nulTotal = 0, blaTotal = 0;

  departamentos.forEach(dep => {
    votosPorDepto[dep] = {};
    participacionPorDepto[dep] = { habilitados: 0, validos: 0, nulos: 0, blancos: 0 };
  });

  boletas.forEach(b => {
    const dep = departamentosMap[b.departamento];
    if (!dep) return;

    Object.entries(b.votosPresidente || {}).forEach(([p, v]) => {
      const votos = parseInt(v) || 0;
      votosPorDepto[dep][p] = (votosPorDepto[dep][p] || 0) + votos;
      votosTotalesNacionales[p] = (votosTotalesNacionales[p] || 0) + votos;
    });

    participacionPorDepto[dep].habilitados += parseInt(b.habilitados || 0) || 0;
    participacionPorDepto[dep].validos += parseInt(b.validosPresidente || 0) || 0;
    participacionPorDepto[dep].nulos += parseInt(b.nulosPresidente || 0) || 0;
    participacionPorDepto[dep].blancos += parseInt(b.blancosPresidente || 0) || 0;

    habTotal += parseInt(b.habilitados || 0) || 0;
    valTotal += parseInt(b.validosPresidente || 0) || 0;
    nulTotal += parseInt(b.nulosPresidente || 0) || 0;
    blaTotal += parseInt(b.blancosPresidente || 0) || 0;
  });

  const aplicarDHondt = (votos, escaños) => {
    const cocientes = [], asignacion = {};
    for (const partido in votos) {
      asignacion[partido] = 0;
      for (let i = 1; i <= escaños; i++) {
        cocientes.push({ partido, valor: votos[partido] / i });
      }
    }
    cocientes.sort((a, b) => b.valor - a.valor);
    cocientes.slice(0, escaños).forEach(({ partido }) => asignacion[partido]++);
    return asignacion;
  };

  const emitTotal = valTotal + nulTotal + blaTotal;
  const totalVotosNacionales = Object.values(votosTotalesNacionales).reduce((a, b) => a + b, 0);
  const partidosUnicos = Object.keys(votosTotalesNacionales);

  const optionParticipacionNacional = {
    title: { text: 'Participación Electoral Nacional' },
    series: [{
      type: 'pie',
      radius: '50%',
      data: [
        { value: valTotal, name: 'Válidos' },
        { value: nulTotal, name: 'Nulos' },
        { value: blaTotal, name: 'Blancos' },
        { value: habTotal - emitTotal, name: 'Abstención' },
      ]
    }]
  };

  const optionPresidenteNacional = {
    title: {
      text: 'Votación Presidencial Nacional (%)',
      left: 'center',
      textStyle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1D3973'
      }
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: '#fff',
      borderColor: '#ccc',
      borderWidth: 1,
      padding: 10,
      textStyle: {
        color: '#333',
        fontSize: 13
      },
      formatter: function (params) {
        const partido = params.name;
        const acr = getAcronimo(partido);
        const votos = votosTotalesNacionales[partido] || 0;
        const porcentaje = ((votos * 100) / totalVotosNacionales).toFixed(2);
        const fondoColor = getGradient(partido);

        return `
        <div style="display: flex; align-items: center;">
          <div style="
            background: ${fondoColor};
            border-radius: 6px;
            padding: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 48px;
            height: 48px;
            margin-right: 12px;
          ">
            <img src="/img/logos/${acr}.png"
                alt="${acr}"
                style="width: 100%; height: 100%; object-fit: contain;"
                onerror="this.style.display='none'" />
          </div>
          <div>
            <strong style="font-size: 14px;">${partido}</strong><br/>
            <span style="color: #555;">Votos:</span> ${votos.toLocaleString()}<br/>
            <span style="color: #555;">Porcentaje:</span> <strong>${porcentaje}%</strong>
          </div>
        </div>
      `;
      }
    },
    xAxis: {
      type: 'category',
      data: partidosUnicos,
      axisLabel: {
        interval: 0,
        formatter: function (value) {
          const acr = getAcronimo(value);
          const acrFinal = (acr || value).toString().trim();
          return `{label|${acrFinal.toUpperCase()}}`;
        },
        rich: {
          label: {
            fontSize: 12,
            fontWeight: 'bold',
            color: '#333',
            padding: [4, 0]
          }
        }
      },
      axisTick: { alignWithLabel: true }
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: {
        formatter: '{value} %'
      }
    },
    series: [{
      name: 'Porcentaje',
      type: 'bar',
      barWidth: '60%',
      data: partidosUnicos.map(p => Number(((votosTotalesNacionales[p] * 100) / totalVotosNacionales).toFixed(2))),
      itemStyle: {
        color: (params) => getColor(partidosUnicos[params.dataIndex])
      },
      label: {
        show: true,
        position: 'top',
        formatter: '{c}%',
        fontSize: 11,
        color: '#444'
      },
      animation: true,
      animationDuration: 2000,
      animationEasing: 'cubicOut',
      animationDelay: (idx) => idx * 100
    }]
  };



  const optionDiputados = {
    title: { text: 'Diputados Uninominales por Departamento' },
    xAxis: { type: 'category', data: departamentos },
    yAxis: { type: 'value' },
    series: partidosUnicos.map(partido => ({
      name: partido,
      type: 'bar',
      stack: 'total',
      data: departamentos.map(dep => aplicarDHondt(votosPorDepto[dep], diputadosUninominales[dep] || 0)[partido] || 0),
      itemStyle: { color: getColor(partido) }
    }))
  };

  return (
    <div className={styles.container}>
      <h1>Resultados Electorales Nacional y por Departamento</h1>
      <ReactECharts option={optionParticipacionNacional} style={{ height: 300 }} />
      <ReactECharts option={optionPresidenteNacional} style={{ height: 400 }} />
      <ReactECharts option={optionDiputados} style={{ height: 400 }} />

      <section>
        <h2>Ganador Presidencial por Departamento</h2>
        <div className={styles.ganadoresGrid}>
          {departamentos.map(dep => {
            const votos = votosPorDepto[dep];
            const totalDepto = Object.values(votos).reduce((a, b) => a + b, 0);
            if (!totalDepto) return null;

            const [partidoGanador, votosGanador] = Object.entries(votos).sort((a, b) => b[1] - a[1])[0];
            const acronimo = getAcronimo(partidoGanador);
            //rutas
            console.log(`Departamento: ${dep}, Partido ganador: ${partidoGanador}, Acrónimo: ${acronimo}`);
            console.log(`Ruta imagen: /img/logos/${acronimo}.png`);
            return (
              <div key={dep} className={styles.ganadorBox}>
                <strong>{dep}</strong>
                <div className={styles.logoRow}>
                  <img
                    src={`/img/logos/${acronimo}.png`}
                    alt={acronimo}
                    className={styles.logoImage}
                    onError={e => (e.target.style.display = 'none')}
                  />
                  <div>
                    {acronimo}<br />
                    {votosGanador.toLocaleString()} votos
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

