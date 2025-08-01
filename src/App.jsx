import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';

import Header from './components/Header';
import HeroSection from './components/HeroSection';
import Footer from './components/Footer';
import Loader from './components/Loader';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import Test from './components/Test';
import RegistroBoletasPage from './components/delegado/RegistroBoletasPage';
import TestUploadExcelv1 from './components/TestUploadExcel';
import TestUploadExcelv2 from './components/TestUploadExcelv2';
import StressTestPage from './components/StressTestPage';
import RevisorPage from './components/revisor/RevisoresPage';
import JefeRPage from './components/jefesR/GestionUsuariosPage';
import ResultadosPage from './components/resultados/ResultadosPage';


function Home() {
  return (
    <>
      <HeroSection />
    </>
  );
}

function AppContent() {
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    // Simulamos carga de página con delay, ajusta si conectas con fetch o Firebase
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, [location]);

  if (loading) return <Loader />;

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/delegado/registro_electoral" element={<RegistroBoletasPage />} />
      <Route path="/revisor/registros_cargados" element={<RevisorPage />} />
      <Route path="/resultados/resultados_graficos" element={<ResultadosPage />} />
      <Route path="/jefesR/GestionUsuariosPage" element={<JefeRPage />} />
      <Route path="/test" element={<Test />} />
      <Route path="/testv1" element={<TestUploadExcelv1 />} />
      <Route path="/testv2" element={<TestUploadExcelv2 />} />
      <Route path="/testEstres" element={<StressTestPage />} />

    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Header />
      <main style={{ minHeight: '80vh' }}>
        <AppContent />
      </main>
      <Footer />
    </BrowserRouter>
  );
}

export default App;
