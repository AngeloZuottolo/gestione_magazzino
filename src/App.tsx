/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  Settings, 
  FileText,
  Users,
  Plus,
  Search,
  Filter,
  Download,
  Trash2,
  Edit2,
  Printer,
  ChevronRight,
  Menu,
  X,
  LogOut,
  Lock
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { Movement, InventoryItem, MovementType, User } from './types';
import { STORAGE_KEYS, INITIAL_PRODUCT_TYPES, INITIAL_BRANDS, INITIAL_LOCATIONS, exportToCSV } from './constants';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'movements' | 'reports' | 'admin' | 'users'>('dashboard');
  const [movements, setMovements] = useState<Movement[]>([]);
  const [productTypes, setProductTypes] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Form states
  const [showMovementModal, setShowMovementModal] = useState<{ show: boolean; type: MovementType | null; editId?: string }>({ show: false, type: null });
  const [showAssignmentDoc, setShowAssignmentDoc] = useState<{ show: boolean; assignee: string; date: string; items: Movement[] } | null>(null);

  // Load data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [movRes, typeRes, brandRes, supplierRes, userRes, locRes] = await Promise.all([
          fetch('/api/movements'),
          fetch('/api/product_types'),
          fetch('/api/brands'),
          fetch('/api/suppliers'),
          fetch('/api/users'),
          fetch('/api/locations')
        ]);

        const [movData, typeData, brandData, supplierData, userData, locData] = await Promise.all([
          movRes.json(),
          typeRes.json(),
          brandRes.json(),
          supplierRes.json(),
          userRes.json(),
          locRes.json()
        ]);

        setMovements(Array.isArray(movData) ? movData : []);
        setSuppliers(Array.isArray(supplierData) ? supplierData : []);
        if (Array.isArray(locData) && locData.length > 0) {
          setLocations(locData);
        } else {
          for (const loc of INITIAL_LOCATIONS) {
            await fetch('/api/locations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: loc })
            });
          }
          setLocations(INITIAL_LOCATIONS);
        }
        
        if (Array.isArray(typeData) && typeData.length > 0) {
          setProductTypes(typeData);
        } else {
          // Initialize with defaults if empty
          for (const type of INITIAL_PRODUCT_TYPES) {
            await fetch('/api/product_types', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: type })
            });
          }
          setProductTypes(INITIAL_PRODUCT_TYPES);
        }

        if (Array.isArray(brandData) && brandData.length > 0) {
          setBrands(brandData);
        } else {
          for (const brand of INITIAL_BRANDS) {
            await fetch('/api/brands', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: brand })
            });
          }
          setBrands(INITIAL_BRANDS);
        }

        if (Array.isArray(userData) && userData.length > 0) {
          setUsers(userData);
        } else {
          const initialUsers: User[] = [
            { id: 'U-1', firstName: 'Mario', lastName: 'Rossi', location: 'Milano' },
            { id: 'U-2', firstName: 'Giulia', lastName: 'Bianchi', location: 'Roma' },
          ];
          for (const user of initialUsers) {
            await fetch('/api/users', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(user)
            });
          }
          setUsers(initialUsers);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  // Removed localStorage effects

  // Derived State: Inventory
  const inventory = useMemo(() => {
    const items: Record<string, InventoryItem> = {};

    movements.forEach(m => {
      const key = `${m.productName}-${m.brand}`;
      if (!items[key]) {
        items[key] = {
          productName: m.productName,
          brand: m.brand,
          total: 0,
          newCount: 0,
          usedCount: 0
        };
      }

      const qty = m.type === 'Carico' ? m.quantity : -m.quantity;
      items[key].total += qty;
      
      if (m.isNew) {
        items[key].newCount += qty;
      } else {
        items[key].usedCount += qty;
      }
    });

    return Object.values(items).filter(item => item.total !== 0);
  }, [movements]);

  const addMovement = async (m: Omit<Movement, 'id'>) => {
    const prefix = m.type === 'Carico' ? 'C' : 'S';
    const typeMovements = movements.filter(mov => mov.type === m.type);
    const nextId = typeMovements.length > 0 
      ? Math.max(...typeMovements.map(mov => parseInt(mov.id.split('-')[1]))) + 1 
      : 1;
    
    const newMovement: Movement = {
      ...m,
      id: `${prefix}-${nextId}`
    };

    try {
      await fetch('/api/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMovement)
      });

      // Auto-populate lists if new values are provided
      if (m.productName && !productTypes.includes(m.productName)) {
        await fetch('/api/product_types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: m.productName })
        });
        setProductTypes(prev => [...prev, m.productName]);
      }
      if (m.brand && !brands.includes(m.brand)) {
        await fetch('/api/brands', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: m.brand })
        });
        setBrands(prev => [...prev, m.brand]);
      }
      if (m.supplier && !suppliers.includes(m.supplier)) {
        await fetch('/api/suppliers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: m.supplier })
        });
        setSuppliers(prev => [...prev, m.supplier]);
      }

      setMovements(prev => [newMovement, ...prev]);
      setShowMovementModal({ show: false, type: null });
    } catch (error) {
      console.error("Error adding movement:", error);
    }
  };

  const updateMovement = async (id: string, updated: Partial<Movement>) => {
    const existing = movements.find(m => m.id === id);
    if (!existing) return;
    const fullMovement = { ...existing, ...updated };

    try {
      await fetch(`/api/movements/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullMovement)
      });
      setMovements(prev => prev.map(m => m.id === id ? fullMovement : m));
      setShowMovementModal({ show: false, type: null });
    } catch (error) {
      console.error("Error updating movement:", error);
    }
  };

  const deleteMovement = async (id: string) => {
    if (confirm('Sei sicuro di voler eliminare questo movimento?')) {
      try {
        await fetch(`/api/movements/${id}`, { method: 'DELETE' });
        setMovements(prev => prev.filter(m => m.id !== id));
      } catch (error) {
        console.error("Error deleting movement:", error);
      }
    }
  };

  const addProductType = async (name: string) => {
    if (name && !productTypes.includes(name)) {
      try {
        await fetch('/api/product_types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
        setProductTypes(prev => [...prev, name].sort());
      } catch (error) {
        console.error("Error adding product type:", error);
      }
    }
  };

  const removeProductType = async (name: string) => {
    try {
      await fetch(`/api/product_types/${encodeURIComponent(name)}`, { method: 'DELETE' });
      setProductTypes(prev => prev.filter(t => t !== name));
    } catch (error) {
      console.error("Error removing product type:", error);
    }
  };

  const addBrand = async (name: string) => {
    if (name && !brands.includes(name)) {
      try {
        await fetch('/api/brands', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
        setBrands(prev => [...prev, name].sort());
      } catch (error) {
        console.error("Error adding brand:", error);
      }
    }
  };

  const removeBrand = async (name: string) => {
    try {
      await fetch(`/api/brands/${encodeURIComponent(name)}`, { method: 'DELETE' });
      setBrands(prev => prev.filter(b => b !== name));
    } catch (error) {
      console.error("Error removing brand:", error);
    }
  };

  const addSupplier = async (name: string) => {
    if (name && !suppliers.includes(name)) {
      try {
        await fetch('/api/suppliers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
        setSuppliers(prev => [...prev, name].sort());
      } catch (error) {
        console.error("Error adding supplier:", error);
      }
    }
  };

  const removeSupplier = async (name: string) => {
    try {
      await fetch(`/api/suppliers/${encodeURIComponent(name)}`, { method: 'DELETE' });
      setSuppliers(prev => prev.filter(s => s !== name));
    } catch (error) {
      console.error("Error removing supplier:", error);
    }
  };

  const addLocation = async (name: string) => {
    if (name && !locations.includes(name)) {
      try {
        await fetch('/api/locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
        setLocations(prev => [...prev, name].sort());
      } catch (error) {
        console.error("Error adding location:", error);
      }
    }
  };

  const removeLocation = async (name: string) => {
    try {
      await fetch(`/api/locations/${encodeURIComponent(name)}`, { method: 'DELETE' });
      setLocations(prev => prev.filter(l => l !== name));
    } catch (error) {
      console.error("Error removing location:", error);
    }
  };

  const addUser = async (u: Omit<User, 'id'>) => {
    const nextId = users.length > 0 
      ? Math.max(...users.map(user => parseInt(user.id.split('-')[1]))) + 1 
      : 1;
    const newUser: User = { ...u, id: `U-${nextId}` };
    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      setUsers(prev => [...prev, newUser]);
    } catch (error) {
      console.error("Error adding user:", error);
    }
  };

  const deleteUser = async (id: string) => {
    if (confirm('Sei sicuro di voler eliminare questo utente?')) {
      try {
        await fetch(`/api/users/${id}`, { method: 'DELETE' });
        setUsers(prev => prev.filter(u => u.id !== id));
      } catch (error) {
        console.error("Error deleting user:", error);
      }
    }
  };

  return (
    <div className="flex h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        "bg-white border-r border-gray-200 transition-all duration-300 flex flex-col",
        isSidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="p-6 flex flex-col gap-4">
          <div className={cn(
            "flex items-center justify-center bg-indigo-50 rounded-2xl transition-all duration-300",
            isSidebarOpen ? "h-24 w-full" : "h-12 w-12"
          )}>
            {isSidebarOpen ? (
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                  <Package size={24} />
                </div>
                <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">Your Logo Here</span>
              </div>
            ) : (
              <Package size={20} className="text-indigo-600" />
            )}
          </div>
          <div className="flex items-center justify-between">
            {isSidebarOpen && <h1 className="text-xl font-bold tracking-tight text-indigo-600">Magazzino IT</h1>}
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg">
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <NavItem 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
            collapsed={!isSidebarOpen}
          />
          <NavItem 
            icon={<Package size={20} />} 
            label="Magazzino" 
            active={activeTab === 'inventory'} 
            onClick={() => setActiveTab('inventory')} 
            collapsed={!isSidebarOpen}
          />
          <NavItem 
            icon={<History size={20} />} 
            label="Movimenti" 
            active={activeTab === 'movements'} 
            onClick={() => setActiveTab('movements')} 
            collapsed={!isSidebarOpen}
          />
          <NavItem 
            icon={<FileText size={20} />} 
            label="Report Utenti" 
            active={activeTab === 'reports'} 
            onClick={() => setActiveTab('reports')} 
            collapsed={!isSidebarOpen}
          />
          <NavItem 
            icon={<Users size={20} />} 
            label="Database Utenti" 
            active={activeTab === 'users'} 
            onClick={() => setActiveTab('users')} 
            collapsed={!isSidebarOpen}
          />
          <NavItem 
            icon={<Settings size={20} />} 
            label="Amministrazione" 
            active={activeTab === 'admin'} 
            onClick={() => setActiveTab('admin')} 
            collapsed={!isSidebarOpen}
          />
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className={cn("flex items-center gap-3", !isSidebarOpen && "justify-center")}>
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
              AD
            </div>
            {isSidebarOpen && (
              <div>
                <p className="text-sm font-medium">Admin User</p>
                <p className="text-xs text-gray-500">IT Department</p>
              </div>
            )}
          </div>
          {isSidebarOpen && (
            <div className="mt-4 text-center text-xs text-gray-400">
              v1.0
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <header className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                  <p className="text-gray-500">Panoramica dello stato attuale del magazzino.</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowMovementModal({ show: true, type: 'Carico' })}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    <ArrowUpRight size={18} />
                    Nuovo Carico
                  </button>
                  <button 
                    onClick={() => setShowMovementModal({ show: true, type: 'Scarico' })}
                    className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    <ArrowDownLeft size={18} />
                    Nuovo Scarico
                  </button>
                </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                  title="Totale Dispositivi" 
                  value={inventory.reduce((acc, curr) => acc + curr.total, 0)} 
                  icon={<Package className="text-indigo-600" />}
                  trend="+12% vs mese scorso"
                />
                <StatCard 
                  title="Nuovi" 
                  value={inventory.reduce((acc, curr) => acc + curr.newCount, 0)} 
                  icon={<ArrowUpRight className="text-emerald-600" />}
                  trend="In stock"
                />
                <StatCard 
                  title="Usati" 
                  value={inventory.reduce((acc, curr) => acc + curr.usedCount, 0)} 
                  icon={<History className="text-amber-600" />}
                  trend="Disponibili"
                />
                <StatCard 
                  title="Movimenti Oggi" 
                  value={movements.filter(m => m.date === format(new Date(), 'yyyy-MM-dd')).length} 
                  icon={<History className="text-blue-600" />}
                  trend="Ultime 24h"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="text-lg font-bold mb-4">Ultimi Movimenti</h3>
                  <div className="space-y-4">
                    {movements.slice(0, 5).map(m => (
                      <div key={m.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center",
                            m.type === 'Carico' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                          )}>
                            {m.type === 'Carico' ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                          </div>
                          <div>
                            <p className="font-medium">{m.productName} - {m.brand}</p>
                            <p className="text-xs text-gray-500">{m.type} • {m.date}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={cn("font-bold", m.type === 'Carico' ? "text-emerald-600" : "text-amber-600")}>
                            {m.type === 'Carico' ? '+' : '-'}{m.quantity}
                          </p>
                          <p className="text-xs text-gray-400">{m.id}</p>
                        </div>
                      </div>
                    ))}
                    {movements.length === 0 && <p className="text-center text-gray-400 py-8">Nessun movimento registrato.</p>}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="text-lg font-bold mb-4">Disponibilità Critica</h3>
                  <div className="space-y-4">
                    {inventory.filter(i => i.total < 5).slice(0, 5).map(i => (
                      <div key={`${i.productName}-${i.brand}`} className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                            <Package size={20} />
                          </div>
                          <div>
                            <p className="font-medium">{i.productName}</p>
                            <p className="text-xs text-gray-500">{i.brand}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-red-600">{i.total}</p>
                          <p className="text-xs text-gray-400">Rimanenti</p>
                        </div>
                      </div>
                    ))}
                    {inventory.filter(i => i.total < 5).length === 0 && <p className="text-center text-gray-400 py-8">Tutte le scorte sono ottimali.</p>}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'inventory' && (
            <InventoryView inventory={inventory} />
          )}

          {activeTab === 'movements' && (
            <MovementsView 
              movements={movements} 
              onDelete={deleteMovement} 
              onEdit={(m) => setShowMovementModal({ show: true, type: m.type, editId: m.id })}
              onPrintAssignment={(assignee, date, items) => setShowAssignmentDoc({ show: true, assignee, date, items })}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView movements={movements} users={users} />
          )}

          {activeTab === 'users' && (
            <UsersView users={users} locations={locations} onAdd={addUser} onDelete={deleteUser} />
          )}

          {activeTab === 'admin' && (
            <AdminView 
              productTypes={productTypes} 
              onAddType={addProductType} 
              onRemoveType={removeProductType}
              brands={brands}
              onAddBrand={addBrand}
              onRemoveBrand={removeBrand}
              suppliers={suppliers}
              onAddSupplier={addSupplier}
              onRemoveSupplier={removeSupplier}
              locations={locations}
              onAddLocation={addLocation}
              onRemoveLocation={removeLocation}
              movements={movements}
              onEdit={(m) => setShowMovementModal({ show: true, type: m.type, editId: m.id })}
              onDelete={deleteMovement}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Modals */}
      {showMovementModal.show && (
        <MovementModal 
          type={showMovementModal.type!} 
          onClose={() => setShowMovementModal({ show: false, type: null })}
          onSubmit={showMovementModal.editId ? (m) => updateMovement(showMovementModal.editId!, m) : addMovement}
          productTypes={productTypes}
          brands={brands}
          suppliers={suppliers}
          users={users}
          initialData={showMovementModal.editId ? movements.find(m => m.id === showMovementModal.editId) : undefined}
        />
      )}

      {showAssignmentDoc && (
        <AssignmentModal 
          {...showAssignmentDoc} 
          onClose={() => setShowAssignmentDoc(null)} 
        />
      )}
    </div>
  );
}

// --- Sub-Components ---

function NavItem({ icon, label, active, onClick, collapsed }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, collapsed: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
        active 
          ? "bg-indigo-50 text-indigo-600 shadow-sm" 
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
      )}
    >
      <span className={cn("transition-transform duration-200", active && "scale-110")}>{icon}</span>
      {!collapsed && <span className="font-medium text-sm">{label}</span>}
      {!collapsed && active && <ChevronRight size={16} className="ml-auto" />}
    </button>
  );
}

function StatCard({ title, value, icon, trend }: { title: string, value: number, icon: React.ReactNode, trend: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">{trend}</span>
      </div>
      <h4 className="text-sm text-gray-500 mb-1">{title}</h4>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

// --- Views ---

function InventoryView({ inventory }: { inventory: InventoryItem[] }) {
  const [search, setSearch] = useState('');
  const [filterBrand, setFilterBrand] = useState('All');

  const brands = useMemo(() => ['All', ...Array.from(new Set(inventory.map(i => i.brand)))], [inventory]);

  const filtered = inventory.filter(i => {
    const matchesSearch = i.productName.toLowerCase().includes(search.toLowerCase()) || i.brand.toLowerCase().includes(search.toLowerCase());
    const matchesBrand = filterBrand === 'All' || i.brand === filterBrand;
    return matchesSearch && matchesBrand;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <header>
        <h2 className="text-3xl font-bold tracking-tight">Magazzino</h2>
        <p className="text-gray-500">Stato attuale delle scorte raggruppato per prodotto e marca.</p>
      </header>

      <div className="flex flex-col md:flex-row gap-4 justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Cerca prodotto o marca..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <select 
            className="bg-gray-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
            value={filterBrand}
            onChange={(e) => setFilterBrand(e.target.value)}
          >
            {brands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <button 
            onClick={() => exportToCSV(filtered, 'magazzino')}
            className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Download size={18} />
            Esporta CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-bottom border-gray-100">
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Prodotto</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Marca</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Disponibilità</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Nuovi</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Usati</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium">{item.productName}</td>
                <td className="px-6 py-4 text-gray-600">{item.brand}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold",
                    item.total > 10 ? "bg-emerald-50 text-emerald-700" : item.total > 0 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
                  )}>
                    {item.total}
                  </span>
                </td>
                <td className="px-6 py-4 text-emerald-600 font-medium">{item.newCount}</td>
                <td className="px-6 py-4 text-amber-600 font-medium">{item.usedCount}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-400">Nessun prodotto trovato.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function MovementsView({ movements, onDelete, onEdit, onPrintAssignment }: { 
  movements: Movement[], 
  onDelete: (id: string) => void, 
  onEdit: (m: Movement) => void,
  onPrintAssignment: (assignee: string, date: string, items: Movement[]) => void
}) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'Carico' | 'Scarico'>('All');

  const filtered = movements.filter(m => {
    const matchesSearch = 
      m.productName.toLowerCase().includes(search.toLowerCase()) || 
      m.brand.toLowerCase().includes(search.toLowerCase()) ||
      (m.assignee?.toLowerCase().includes(search.toLowerCase())) ||
      (m.supplier?.toLowerCase().includes(search.toLowerCase()));
    const matchesType = filterType === 'All' || m.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Movimenti</h2>
          <p className="text-gray-500">Storico completo di tutti i carichi e scarichi effettuati.</p>
        </div>
        <button 
          onClick={() => exportToCSV(filtered, 'movimenti')}
          className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
        >
          <Download size={18} />
          Esporta CSV
        </button>
      </header>

      <div className="flex flex-col md:flex-row gap-4 justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Cerca per prodotto, marca, utente..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <select 
            className="bg-gray-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
          >
            <option value="All">Tutti i tipi</option>
            <option value="Carico">Carico</option>
            <option value="Scarico">Scarico</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-bottom border-gray-100">
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">ID</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Data</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Tipo</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Prodotto</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Quantità</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Dettagli</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-6 py-4 text-xs font-mono text-gray-400">{m.id}</td>
                <td className="px-6 py-4 text-sm">{m.date}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                    m.type === 'Carico' ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                  )}>
                    {m.type}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <p className="font-medium text-sm">{m.productName}</p>
                  <p className="text-xs text-gray-500">{m.brand} • {m.isNew ? 'Nuovo' : 'Usato'}</p>
                </td>
                <td className="px-6 py-4 font-bold text-sm">{m.quantity}</td>
                <td className="px-6 py-4 text-xs text-gray-600">
                  {m.type === 'Carico' ? (
                    <p><span className="font-medium">Fornitore:</span> {m.supplier}</p>
                  ) : (
                    <p><span className="font-medium">Assegnatario:</span> {m.assignee}</p>
                  )}
                  {m.notes && <p className="italic text-gray-400 mt-1 truncate max-w-[150px]">{m.notes}</p>}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {m.type === 'Scarico' && (
                      <button 
                        onClick={() => onPrintAssignment(m.assignee!, m.date, [m])}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Stampa Assegnazione"
                      >
                        <Printer size={16} />
                      </button>
                    )}
                    <button 
                      onClick={() => onEdit(m)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      title="Modifica"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => onDelete(m.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Elimina"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-400">Nessun movimento trovato.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function ReportsView({ movements, users }: { movements: Movement[], users: User[] }) {
  const [selectedUser, setSelectedUser] = useState('');
  
  const userList = useMemo(() => 
    users.map(u => `${u.firstName} ${u.lastName}`).sort()
  , [users]);

  const userItems = useMemo(() => 
    movements.filter(m => m.type === 'Scarico' && m.assignee === selectedUser)
  , [movements, selectedUser]);

  const totalAssets = useMemo(() => 
    userItems.reduce((acc, item) => acc + item.quantity, 0)
  , [userItems]);

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Report Asset - ${selectedUser}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            .header { border-bottom: 2px solid #4f46e5; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; color: #4f46e5; }
            .meta { margin-bottom: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .meta p { margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
            th { background-color: #f9fafb; color: #6b7280; font-size: 12px; text-transform: uppercase; }
            .total-box { margin-top: 30px; padding: 20px; background-color: #f3f4f6; border-radius: 12px; text-align: right; }
            .total-label { font-size: 14px; color: #6b7280; }
            .total-value { font-size: 24px; font-weight: bold; color: #111827; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">REPORT ASSET ASSEGNATI</h1>
            <p>Magazzino IT - Riepilogo dotazioni dipendente</p>
          </div>
          <div class="meta">
            <div>
              <p><strong>Dipendente:</strong> ${selectedUser}</p>
              <p><strong>Data Report:</strong> ${format(new Date(), 'dd/MM/yyyy')}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Prodotto</th>
                <th>Marca</th>
                <th>Quantità</th>
                <th>Data Assegnazione</th>
                <th>Stato</th>
              </tr>
            </thead>
            <tbody>
              ${userItems.map(item => `
                <tr>
                  <td>${item.productName}</td>
                  <td>${item.brand}</td>
                  <td>${item.quantity}</td>
                  <td>${item.date}</td>
                  <td>In Uso</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total-box">
            <p class="total-label">Totale Asset Assegnati</p>
            <p class="total-value">${totalAssets}</p>
          </div>
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <header>
        <h2 className="text-3xl font-bold tracking-tight">Report Utenti</h2>
        <p className="text-gray-500">Visualizza e scarica i dispositivi assegnati a un dipendente specifico.</p>
      </header>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
        <div className="max-w-md">
          <label className="block text-sm font-medium text-gray-700 mb-2">Seleziona Utente</label>
          <select 
            className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500"
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
          >
            <option value="">-- Scegli un utente --</option>
            {userList.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>

        {selectedUser && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-bold">Dispositivi assegnati a {selectedUser}</h3>
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">
                  {totalAssets} Asset Totali
                </span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => exportToCSV(userItems, `report_${selectedUser}`)}
                  className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <Download size={18} />
                  CSV
                </button>
                <button 
                  onClick={handlePrintReport}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <Printer size={18} />
                  Scarica PDF
                </button>
              </div>
            </div>

            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Prodotto</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Marca</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Quantità</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Data Assegnazione</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Stato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {userItems.map((m, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 text-sm font-medium">{m.productName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{m.brand}</td>
                      <td className="px-4 py-3 text-sm font-bold">{m.quantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{m.date}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded uppercase">In Uso</span>
                      </td>
                    </tr>
                  ))}
                  {userItems.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nessun dispositivo assegnato.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function AdminView({ productTypes, onAddType, onRemoveType, brands, onAddBrand, onRemoveBrand, suppliers, onAddSupplier, onRemoveSupplier, locations, onAddLocation, onRemoveLocation, movements, onEdit, onDelete }: { 
  productTypes: string[], 
  onAddType: (name: string) => void, 
  onRemoveType: (name: string) => void,
  brands: string[],
  onAddBrand: (name: string) => void,
  onRemoveBrand: (name: string) => void,
  suppliers: string[],
  onAddSupplier: (name: string) => void,
  onRemoveSupplier: (name: string) => void,
  locations: string[],
  onAddLocation: (name: string) => void,
  onRemoveLocation: (name: string) => void,
  movements: Movement[],
  onEdit: (m: Movement) => void,
  onDelete: (id: string) => void
}) {
  const [newType, setNewType] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newSupplier, setNewSupplier] = useState('');
  const [newLocation, setNewLocation] = useState('');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <header>
        <h2 className="text-3xl font-bold tracking-tight">Amministrazione</h2>
        <p className="text-gray-500">Gestisci i prodotti, le marche, i fornitori, le sedi e correggi eventuali errori nei movimenti.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold mb-4">Prodotti</h3>
          <div className="flex gap-2 mb-4">
            <input 
              type="text" 
              placeholder="Nuovo prodotto..." 
              className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
            />
            <button 
              onClick={() => { onAddType(newType); setNewType(''); }}
              className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2">
            {productTypes.map(t => (
              <div key={t} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl group">
                <span className="font-medium text-sm truncate">{t}</span>
                <button 
                  onClick={() => onRemoveType(t)}
                  className="p-1 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold mb-4">Marche</h3>
          <div className="flex gap-2 mb-4">
            <input 
              type="text" 
              placeholder="Nuova marca..." 
              className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
              value={newBrand}
              onChange={(e) => setNewBrand(e.target.value)}
            />
            <button 
              onClick={() => { onAddBrand(newBrand); setNewBrand(''); }}
              className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2">
            {brands.map(b => (
              <div key={b} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl group">
                <span className="font-medium text-sm truncate">{b}</span>
                <button 
                  onClick={() => onRemoveBrand(b)}
                  className="p-1 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold mb-4">Fornitori</h3>
          <div className="flex gap-2 mb-4">
            <input 
              type="text" 
              placeholder="Nuovo fornitore..." 
              className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
              value={newSupplier}
              onChange={(e) => setNewSupplier(e.target.value)}
            />
            <button 
              onClick={() => { onAddSupplier(newSupplier); setNewSupplier(''); }}
              className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2">
            {suppliers.map(s => (
              <div key={s} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl group">
                <span className="font-medium text-sm truncate">{s}</span>
                <button 
                  onClick={() => onRemoveSupplier(s)}
                  className="p-1 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold mb-4">Sedi</h3>
          <div className="flex gap-2 mb-4">
            <input 
              type="text" 
              placeholder="Nuova sede..." 
              className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
            />
            <button 
              onClick={() => { onAddLocation(newLocation); setNewLocation(''); }}
              className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2">
            {locations.map(l => (
              <div key={l} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl group">
                <span className="font-medium text-sm truncate">{l}</span>
                <button 
                  onClick={() => onRemoveLocation(l)}
                  className="p-1 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="text-lg font-bold mb-4">Gestione Errori Movimenti</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-bottom border-gray-100">
                <th className="px-4 py-3 text-xs font-bold uppercase text-gray-500">ID</th>
                <th className="px-4 py-3 text-xs font-bold uppercase text-gray-500">Prodotto</th>
                <th className="px-4 py-3 text-xs font-bold uppercase text-gray-500">Data</th>
                <th className="px-4 py-3 text-xs font-bold uppercase text-gray-500 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {movements.slice(0, 10).map(m => (
                <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-xs font-mono text-gray-400">{m.id}</td>
                  <td className="px-4 py-3 text-sm font-medium">{m.productName}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{m.date}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => onEdit(m)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit2 size={14} /></button>
                      <button onClick={() => onDelete(m.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 mt-4 italic">* Mostrati solo gli ultimi 10 movimenti. Usa la pagina Movimenti per la ricerca completa.</p>
        </div>
      </div>
    </motion.div>
  );
}

function UsersView({ users, locations, onAdd, onDelete }: { users: User[], locations: string[], onAdd: (u: Omit<User, 'id'>) => void, onDelete: (id: string) => void }) {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState<Omit<User, 'id'>>({ firstName: '', lastName: '', location: locations[0] || '' });

  const filtered = users.filter(u => 
    u.firstName.toLowerCase().includes(search.toLowerCase()) || 
    u.lastName.toLowerCase().includes(search.toLowerCase()) ||
    u.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Database Utenti</h2>
          <p className="text-gray-500">Gestisci l'anagrafica dei dipendenti per le assegnazioni.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus size={18} />
          Nuovo Utente
        </button>
      </header>

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Cerca utente o sede..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-bottom border-gray-100">
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Nome</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Cognome</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Sede</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-6 py-4 font-medium">{u.firstName}</td>
                <td className="px-6 py-4 font-medium">{u.lastName}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg">{u.location}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => onDelete(u.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 bg-indigo-600 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold">Aggiungi Utente</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-white/20 rounded-lg"><X size={24} /></button>
            </div>
            <form className="p-8 space-y-4" onSubmit={(e) => { e.preventDefault(); onAdd(newUser); setShowAddModal(false); }}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Nome</label>
                <input 
                  type="text" 
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                  value={newUser.firstName}
                  onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Cognome</label>
                <input 
                  type="text" 
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                  value={newUser.lastName}
                  onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Sede</label>
                <select 
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                  value={newUser.location}
                  onChange={(e) => setNewUser({ ...newUser, location: e.target.value })}
                  required
                >
                  {locations.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl">Annulla</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold">Salva</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

// --- Modals ---

function MovementModal({ type, onClose, onSubmit, productTypes, brands, suppliers, users, initialData }: { 
  type: MovementType, 
  onClose: () => void, 
  onSubmit: (m: Omit<Movement, 'id'>) => void,
  productTypes: string[],
  brands: string[],
  suppliers: string[],
  users: User[],
  initialData?: Movement
}) {
  const [formData, setFormData] = useState<Omit<Movement, 'id'>>(initialData ? { ...initialData } : {
    type,
    productName: productTypes[0] || '',
    brand: brands[0] || '',
    quantity: 1,
    isNew: true,
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
    supplier: type === 'Carico' ? (suppliers[0] || '') : undefined,
    assignee: type === 'Scarico' ? (users.length > 0 ? `${users[0].firstName} ${users[0].lastName}` : '') : undefined,
  });

  const [isAddingNewType, setIsAddingNewType] = useState(false);
  const [isAddingNewBrand, setIsAddingNewBrand] = useState(false);
  const [isAddingNewSupplier, setIsAddingNewSupplier] = useState(false);
  const [newType, setNewType] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newSupplier, setNewSupplier] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className={cn(
          "p-6 text-white flex justify-between items-center",
          type === 'Carico' ? "bg-emerald-600" : "bg-amber-600"
        )}>
          <h3 className="text-xl font-bold">{initialData ? 'Modifica' : 'Registra'} {type}</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg"><X size={24} /></button>
        </div>

        <form className="p-8 space-y-6" onSubmit={(e) => { 
          e.preventDefault(); 
          const finalData = { ...formData };
          if (isAddingNewType && newType) finalData.productName = newType;
          if (isAddingNewBrand && newBrand) finalData.brand = newBrand;
          if (isAddingNewSupplier && newSupplier) finalData.supplier = newSupplier;
          onSubmit(finalData); 
        }}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700">Prodotto</label>
                <button 
                  type="button" 
                  onClick={() => setIsAddingNewType(!isAddingNewType)}
                  className="text-[10px] text-indigo-600 hover:underline"
                >
                  {isAddingNewType ? 'Seleziona esistente' : '+ Aggiungi nuovo'}
                </button>
              </div>
              {isAddingNewType ? (
                <input 
                  type="text" 
                  placeholder="Inserisci nuovo prodotto..."
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  required
                />
              ) : (
                <select 
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  required
                >
                  {productTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700">Marca</label>
                <button 
                  type="button" 
                  onClick={() => setIsAddingNewBrand(!isAddingNewBrand)}
                  className="text-[10px] text-indigo-600 hover:underline"
                >
                  {isAddingNewBrand ? 'Seleziona esistente' : '+ Aggiungi nuova'}
                </button>
              </div>
              {isAddingNewBrand ? (
                <input 
                  type="text" 
                  placeholder="Inserisci nuova marca..."
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                  required
                />
              ) : (
                <select 
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  required
                >
                  {brands.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Quantità</label>
              <input 
                type="number" 
                min="1"
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Data</label>
              <input 
                type="date" 
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex gap-8 items-center bg-gray-50 p-4 rounded-xl">
            <label className="text-sm font-medium text-gray-700">Condizione:</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  checked={formData.isNew} 
                  onChange={() => setFormData({ ...formData, isNew: true })}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm">Nuovo</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  checked={!formData.isNew} 
                  onChange={() => setFormData({ ...formData, isNew: false })}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm">Usato</span>
              </label>
            </div>
          </div>

          {type === 'Carico' ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700">Fornitore / Origine</label>
                <button 
                  type="button" 
                  onClick={() => setIsAddingNewSupplier(!isAddingNewSupplier)}
                  className="text-[10px] text-indigo-600 hover:underline"
                >
                  {isAddingNewSupplier ? 'Seleziona esistente' : '+ Aggiungi nuovo'}
                </button>
              </div>
              {isAddingNewSupplier ? (
                <input 
                  type="text" 
                  placeholder="es. Amazon, Rientro Aziendale..."
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                  value={newSupplier}
                  onChange={(e) => setNewSupplier(e.target.value)}
                  required
                />
              ) : (
                <select 
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  required
                >
                  <option value="">-- Seleziona Fornitore --</option>
                  {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Assegnatario (Dipendente)</label>
              <select 
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                value={formData.assignee}
                onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                required
              >
                <option value="">-- Seleziona Utente --</option>
                {users.map(u => (
                  <option key={u.id} value={`${u.firstName} ${u.lastName}`}>
                    {u.firstName} {u.lastName} ({u.location})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Note</label>
            <textarea 
              className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 font-medium transition-colors"
            >
              Annulla
            </button>
            <button 
              type="submit" 
              className={cn(
                "flex-1 px-4 py-3 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95",
                type === 'Carico' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700"
              )}
            >
              {initialData ? 'Salva Modifiche' : 'Conferma'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function AssignmentModal({ assignee, date, items, onClose }: { assignee: string, date: string, items: Movement[], onClose: () => void }) {
  const printRef = React.useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Documento di Assegnazione</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 24px; font-bold: true; }
            .meta { margin-bottom: 30px; }
            .meta p { margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { bg-color: #f5f5f5; }
            .footer { margin-top: 60px; display: flex; justify-content: space-between; }
            .signature { border-top: 1px solid #333; width: 200px; padding-top: 10px; text-align: center; font-size: 12px; }
          </style>
        </head>
        <body>
          ${content.innerHTML}
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 bg-indigo-600 text-white flex justify-between items-center">
          <h3 className="text-xl font-bold">Documento di Assegnazione</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <div ref={printRef} className="bg-white">
            <div className="header">
              <h1 className="title">VERBALE DI CONSEGNA ATTREZZATURA IT</h1>
              <p className="text-gray-500">Documento interno di affidamento beni aziendali</p>
            </div>

            <div className="meta">
              <p><strong>Data di inizio affidamento:</strong> {date}</p>
              <p><strong>Assegnatario:</strong> {assignee}</p>
              <p><strong>Dipartimento:</strong> Aziendale</p>
            </div>

            <p className="mb-4">Si dichiara di aver consegnato in data odierna i seguenti dispositivi:</p>

            <table>
              <thead>
                <tr>
                  <th>Dispositivo</th>
                  <th>Marca</th>
                  <th>Quantità</th>
                  <th>Stato</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.productName}</td>
                    <td>{item.brand}</td>
                    <td>{item.quantity}</td>
                    <td>{item.isNew ? 'Nuovo' : 'Usato'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-8 text-sm text-gray-600 italic">
              <p>Il dipendente si impegna a custodire con diligenza l'attrezzatura ricevuta e a restituirla al termine del rapporto di lavoro o su richiesta dell'azienda.</p>
            </div>

            <div className="footer">
              <div className="signature">
                <p>Firma per Ricevuta (Il Dipendente)</p>
              </div>
              <div className="signature">
                <p>Firma Aziendale (IT Manager)</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 font-medium transition-colors"
          >
            Chiudi
          </button>
          <button 
            onClick={handlePrint}
            className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
          >
            <Printer size={20} />
            Stampa Documento
          </button>
        </div>
      </motion.div>
    </div>
  );
}
