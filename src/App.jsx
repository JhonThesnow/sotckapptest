import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import InventoryPage from './pages/InventoryPage';
import SalesPage from './pages/SalesPage';
import VentasPage from './pages/VentasPage';
import ReportsPage from './pages/ReportsPage';
import AccountPage from './pages/AccountPage'; // 1. Importar la nueva página
import { FiBox, FiTag, FiBarChart2, FiShoppingCart, FiMenu, FiUser } from 'react-icons/fi'; // 2. Añadir ícono

const Navigation = ({ onLinkClick }) => {
  const activeLinkStyle = {
    backgroundColor: '#374151',
    color: 'white'
  };
  return (
    <nav className="bg-gray-800 text-white w-64 h-full p-4 flex flex-col flex-shrink-0">
      <div className="text-2xl font-bold mb-10 text-center">StockManager</div>
      <ul className="space-y-2">
        <li>
          <NavLink to="/cuenta" style={({ isActive }) => isActive ? activeLinkStyle : undefined} onClick={onLinkClick} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-colors">
            <FiUser />
            <span>Cuenta</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/" style={({ isActive }) => isActive ? activeLinkStyle : undefined} onClick={onLinkClick} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-colors">
            <FiBox />
            <span>Inventario</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/sales" style={({ isActive }) => isActive ? activeLinkStyle : undefined} onClick={onLinkClick} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-colors">
            <FiTag />
            <span>Caja</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/ventas" style={({ isActive }) => isActive ? activeLinkStyle : undefined} onClick={onLinkClick} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-colors">
            <FiShoppingCart />
            <span>Ventas</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/reports" style={({ isActive }) => isActive ? activeLinkStyle : undefined} onClick={onLinkClick} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-colors">
            <FiBarChart2 />
            <span>Reportes</span>
          </NavLink>
        </li>
      </ul>
    </nav>
  );
};

const AppLayout = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);
  return (
    <div className="h-screen flex bg-gray-100">
      <div className="hidden md:flex">
        <Navigation />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="md:hidden bg-white shadow-md p-4 flex justify-between items-center z-10">
          <h1 className="text-xl font-bold">StockManager</h1>
          <button onClick={() => setIsMenuOpen(true)}>
            <FiMenu size={24} />
          </button>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Routes>
            {/* 3. AÑADIR NUEVA RUTA */}
            <Route path="/cuenta" element={<AccountPage />} />
            <Route path="/" element={<InventoryPage />} />
            <Route path="/sales" element={<SalesPage />} />
            <Route path="/ventas" element={<VentasPage />} />
            <Route path="/reports" element={<ReportsPage />} />
          </Routes>
        </main>
      </div>
      {isMenuOpen && (
        <>
          <div className="md:hidden fixed inset-0 bg-black z-20 animate-fade-in" onClick={() => setIsMenuOpen(false)}></div>
          <div className="md:hidden fixed top-0 left-0 h-full z-30 animate-slide-in-left">
            <Navigation onLinkClick={() => setIsMenuOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
};

const App = () => (
  <Router>
    <AppLayout />
  </Router>
);

export default App;

