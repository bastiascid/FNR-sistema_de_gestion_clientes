'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  ArrowUpRight, 
  Plus, 
  Search, 
  FileText, 
  Edit2, 
  Trash2, 
  Download, 
  Printer,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import Layout from '@/components/Layout';
import ClientFormModal from '@/components/ClientFormModal';
import MovementFormModal from '@/components/MovementFormModal';
import { Client } from '@/lib/db';

interface ClientWithBalance extends Client {
  debe: number;
  haber: number;
  saldo: number;
}

export default function Dashboard() {
  const [clients, setClients] = useState<ClientWithBalance[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [selectedClientForEdit, setSelectedClientForEdit] = useState<Client | null>(null);
  
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [preSelectedClientId, setPreSelectedClientId] = useState<number | null>(null);

  // Fetch clients from API
  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients?search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (err) {
      console.error('Error loading clients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [search]);

  // Aggregate stats
  const totalClients = clients.length;
  const totalDebe = clients.reduce((acc, c) => acc + c.debe, 0);
  const totalHaber = clients.reduce((acc, c) => acc + c.haber, 0);
  const outstandingBalance = totalDebe - totalHaber;

  // Actions handlers
  const handleEditClient = (client: Client, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedClientForEdit(client);
    setIsClientModalOpen(true);
  };

  const handleDeleteClient = async (id: number, name: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (confirm(`¿Está seguro de que desea eliminar a "${name}"?\nEsta acción eliminará de forma permanente al cliente y TODOS sus movimientos y estados de cuenta.`)) {
      try {
        const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
        if (res.ok) {
          fetchClients();
        } else {
          const data = await res.json();
          alert(`Error: ${data.error}`);
        }
      } catch (err) {
        alert('Error de conexión.');
      }
    }
  };

  const handleOpenMovementModal = (clientId?: number) => {
    setPreSelectedClientId(clientId || null);
    setIsMovementModalOpen(true);
  };

  // Export Client List to Excel (CSV)
  const handleExportCSV = () => {
    const headers = ['ID_CLIENTE', 'Nombre Cliente', 'RUT', 'Total Billed (Debe)', 'Total Paid (Haber)', 'Outstanding Balance (Saldo)'];
    const rows = clients.map(c => [
      c.id, 
      c.nombre, 
      c.rut || 'No registrado', 
      c.debe, 
      c.haber, 
      c.saldo
    ]);
    
    // Semicolon separator + UTF-8 Byte Order Mark for Spanish Excel compatibility
    const csvContent = "\uFEFF" + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Resumen_Clientes_FNR_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print client list summary
  const handlePrint = () => {
    window.print();
  };

  return (
    <Layout title="Portal Principal FNR">
      <div className="space-y-6">
        
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 no-print">
          
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Clientes Activos</p>
              <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{totalClients}</h3>
            </div>
            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-650">
              <Users className="h-6 w-6 text-indigo-600" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Facturado</p>
              <h3 className="text-3xl font-extrabold text-slate-800 mt-1">
                ${totalDebe.toLocaleString('es-CL')}
              </h3>
            </div>
            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-650">
              <TrendingUp className="h-6 w-6 text-indigo-600" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Recaudado</p>
              <h3 className="text-3xl font-extrabold text-slate-800 mt-1">
                ${totalHaber.toLocaleString('es-CL')}
              </h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-650">
              <DollarSign className="h-6 w-6 text-emerald-600" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Saldo por Cobrar</p>
              <h3 className={`text-3xl font-extrabold mt-1 ${outstandingBalance > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                ${outstandingBalance.toLocaleString('es-CL')}
              </h3>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl text-amber-650">
              <ArrowUpRight className="h-6 w-6 text-amber-600" />
            </div>
          </div>

        </div>

        {/* Action Header Panel */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between no-print">
          {/* Search Box */}
          <div className="relative w-full md:max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder="Buscar por cliente o RUT..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <button
              onClick={() => {
                setSelectedClientForEdit(null);
                setIsClientModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all shadow-sm text-sm"
            >
              <Plus className="h-4.5 w-4.5" />
              Nuevo Cliente
            </button>
            
            <button
              onClick={() => handleOpenMovementModal()}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg transition-all text-sm"
            >
              <Plus className="h-4.5 w-4.5" />
              Registrar Movimiento
            </button>

            <div className="flex items-center border-l border-slate-200 pl-2.5 gap-2">
              <button
                onClick={handleExportCSV}
                title="Exportar a Excel"
                className="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-all"
              >
                <Download className="h-4.5 w-4.5" />
              </button>
              <button
                onClick={handlePrint}
                title="Imprimir Resumen"
                className="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-all"
              >
                <Printer className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Print Only Header (Visible during print) */}
        <div className="hidden print:block mb-6">
          <div className="flex items-center justify-between border-b pb-4 border-slate-300">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 uppercase">FNR CONTABLE — CONTROL DE HONORARIOS</h1>
              <p className="text-xs text-slate-500 mt-1">Resumen General de Cuentas y Balances al {new Date().toLocaleDateString('es-CL')}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block font-semibold">FNR CONTABILIDAD</span>
              <span className="text-[10px] text-slate-400 block">SANTIAGO, CHILE</span>
            </div>
          </div>
          
          {/* Summary values for printing */}
          <div className="grid grid-cols-4 gap-4 mt-6 text-center border-b pb-4 border-slate-200">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Clientes</span>
              <span className="text-lg font-bold text-slate-800">{totalClients}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Debe (Billed)</span>
              <span className="text-lg font-bold text-slate-800">${totalDebe.toLocaleString('es-CL')}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Haber (Paid)</span>
              <span className="text-lg font-bold text-slate-800">${totalHaber.toLocaleString('es-CL')}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Saldo Pendiente</span>
              <span className="text-lg font-bold text-indigo-750 font-extrabold">${outstandingBalance.toLocaleString('es-CL')}</span>
            </div>
          </div>
        </div>

        {/* Clients Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden print-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-150 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-4 px-6 w-16 text-center">ID</th>
                  <th className="py-4 px-6">Cliente</th>
                  <th className="py-4 px-6">RUT</th>
                  <th className="py-4 px-6 text-right">Créditos (Debe)</th>
                  <th className="py-4 px-6 text-right">Abonos (Haber)</th>
                  <th className="py-4 px-6 text-right">Saldo</th>
                  <th className="py-4 px-6 text-center no-print w-48">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                      Cargando listado de clientes...
                    </td>
                  </tr>
                ) : clients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                      No se encontraron clientes coincidentes.
                    </td>
                  </tr>
                ) : (
                  clients.map((client) => (
                    <tr 
                      key={client.id}
                      className="hover:bg-slate-50/50 transition-all cursor-pointer group"
                    >
                      <td className="py-3 px-6 text-center font-bold text-slate-400">
                        {client.id}
                      </td>
                      <td className="py-3 px-6 font-bold text-slate-800">
                        <Link href={`/clientes/${client.id}`} className="hover:text-indigo-600 transition-all block">
                          {client.nombre}
                        </Link>
                      </td>
                      <td className="py-3 px-6 font-medium text-slate-500">
                        {client.rut || '—'}
                      </td>
                      <td className="py-3 px-6 text-right font-semibold text-slate-700">
                        ${client.debe.toLocaleString('es-CL')}
                      </td>
                      <td className="py-3 px-6 text-right font-semibold text-slate-700">
                        ${client.haber.toLocaleString('es-CL')}
                      </td>
                      <td className="py-3 px-6 text-right">
                        <span className={`font-bold inline-block px-2.5 py-1 rounded-full text-xs ${
                          client.saldo > 0 
                            ? 'bg-amber-50 text-amber-700' 
                            : client.saldo < 0
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          ${client.saldo.toLocaleString('es-CL')}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-center no-print">
                        <div className="flex items-center justify-center gap-1.5 opacity-80 group-hover:opacity-100 transition-all">
                          <Link
                            href={`/clientes/${client.id}`}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 rounded-lg text-xs font-bold transition-all"
                            title="Ver Estado de Cuenta"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Ver Estado
                          </Link>
                          
                          <button
                            onClick={(e) => handleEditClient(client, e)}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-lg transition-all"
                            title="Editar Datos"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={(e) => handleDeleteClient(client.id, client.nombre, e)}
                            className="p-1.5 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg transition-all"
                            title="Eliminar Cliente"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              
              {/* Grand Total Row */}
              <tfoot className="border-t-2 border-slate-200 bg-slate-50/50 font-bold text-slate-700">
                <tr>
                  <td colSpan={3} className="py-4 px-6 text-right">TOTAL GENERAL:</td>
                  <td className="py-4 px-6 text-right text-slate-800">
                    ${totalDebe.toLocaleString('es-CL')}
                  </td>
                  <td className="py-4 px-6 text-right text-slate-800">
                    ${totalHaber.toLocaleString('es-CL')}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span className={`px-2.5 py-1.5 rounded-lg text-sm font-extrabold ${
                      outstandingBalance > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      ${outstandingBalance.toLocaleString('es-CL')}
                    </span>
                  </td>
                  <td className="no-print"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </div>

      {/* Forms Modals */}
      <ClientFormModal
        isOpen={isClientModalOpen}
        onClose={() => {
          setIsClientModalOpen(false);
          setSelectedClientForEdit(null);
        }}
        onSuccess={fetchClients}
        client={selectedClientForEdit}
      />

      <MovementFormModal
        isOpen={isMovementModalOpen}
        onClose={() => {
          setIsMovementModalOpen(false);
          setPreSelectedClientId(null);
        }}
        onSuccess={fetchClients}
        clientId={preSelectedClientId}
      />
    </Layout>
  );
}
