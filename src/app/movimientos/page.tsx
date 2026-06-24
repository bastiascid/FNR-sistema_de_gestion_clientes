'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeftRight, 
  Search, 
  Plus, 
  Download, 
  Edit2, 
  Trash2, 
  Calendar,
  Filter,
  User,
  TrendingUp,
  DollarSign,
  ArrowUpRight
} from 'lucide-react';
import Layout from '@/components/Layout';
import MovementFormModal from '@/components/MovementFormModal';
import { Client, Movement } from '@/lib/db';

interface MovementWithClientName extends Movement {
  cliente_nombre: string;
}

export default function MovementsLog() {
  const [movements, setMovements] = useState<MovementWithClientName[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters state
  const [selectedClientId, setSelectedClientId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal state
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [selectedMovementForEdit, setSelectedMovementForEdit] = useState<Movement | null>(null);

  const fetchClientsDropdown = async () => {
    try {
      const res = await fetch('/api/clients');
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (err) {
      console.error('Error fetching clients for filter:', err);
    }
  };

  const fetchMovements = async () => {
    setLoading(true);
    try {
      let queryParams = [];
      if (selectedClientId) queryParams.push(`clientId=${selectedClientId}`);
      if (startDate) queryParams.push(`startDate=${startDate}`);
      if (endDate) queryParams.push(`endDate=${endDate}`);
      
      const queryStr = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
      const res = await fetch(`/api/movements${queryStr}`);
      if (res.ok) {
        const data = await res.json();
        setMovements(data);
      }
    } catch (err) {
      console.error('Error fetching movements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientsDropdown();
  }, []);

  useEffect(() => {
    fetchMovements();
  }, [selectedClientId, startDate, endDate]);

  const handleEditMovement = (mv: Movement) => {
    setSelectedMovementForEdit(mv);
    setIsMovementModalOpen(true);
  };

  const handleDeleteMovement = async (id: number) => {
    if (confirm('¿Está seguro de que desea eliminar este movimiento de forma permanente?')) {
      try {
        const res = await fetch(`/api/movements/${id}`, { method: 'DELETE' });
        if (res.ok) {
          fetchMovements();
        } else {
          const errData = await res.json();
          alert(`Error: ${errData.error}`);
        }
      } catch (err) {
        alert('Error de conexión.');
      }
    }
  };

  // Filtered stats
  const totalBilled = movements.reduce((acc, m) => acc + m.credito, 0);
  const totalPaid = movements.reduce((acc, m) => acc + m.abono, 0);
  const netBalance = totalBilled - totalPaid;

  const handleToggleStatus = async (mv: Movement, field: 'registrado' | 'pagado', value: boolean) => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const updated = {
        fecha: mv.fecha,
        detalle: mv.detalle,
        banco: mv.banco,
        boleta: mv.boleta,
        credito: mv.credito,
        abono: mv.abono,
        registrado: field === 'registrado' ? value : !!mv.registrado,
        pagado: field === 'pagado' ? value : !!mv.pagado,
        fecha_registrado: field === 'registrado' 
          ? (value ? (mv.fecha_registrado || todayStr) : null) 
          : (mv.registrado ? (mv.fecha_registrado || null) : null),
        fecha_pagado: field === 'pagado' 
          ? (value ? (mv.fecha_pagado || todayStr) : null) 
          : (mv.pagado ? (mv.fecha_pagado || null) : null)
      };

      const res = await fetch(`/api/movements/${mv.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });

      if (res.ok) {
        fetchMovements();
      } else {
        const errData = await res.json();
        alert(`Error al actualizar estado: ${errData.error}`);
      }
    } catch (err) {
      alert('Error de conexión al actualizar estado.');
    }
  };

  const handleDateChange = async (mv: Movement, field: 'fecha_registrado' | 'fecha_pagado', value: string) => {
    try {
      const updated = {
        fecha: mv.fecha,
        detalle: mv.detalle,
        banco: mv.banco,
        boleta: mv.boleta,
        credito: mv.credito,
        abono: mv.abono,
        registrado: !!mv.registrado,
        pagado: !!mv.pagado,
        fecha_registrado: field === 'fecha_registrado' ? (value || null) : (mv.fecha_registrado || null),
        fecha_pagado: field === 'fecha_pagado' ? (value || null) : (mv.fecha_pagado || null)
      };

      const res = await fetch(`/api/movements/${mv.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });

      if (res.ok) {
        fetchMovements();
      } else {
        const errData = await res.json();
        alert(`Error al actualizar fecha: ${errData.error}`);
      }
    } catch (err) {
      alert('Error de conexión al actualizar fecha.');
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Fecha', 'Cliente ID', 'Cliente', 'Detalle/Glosa', 'Banco', 'Boleta', 
      'Registrado', 'Fecha Registro', 'Pagado', 'Fecha Pago', 'Cargos (Debe)', 'Abonos (Haber)'
    ];
    const rows = movements.map(m => [
      m.fecha,
      m.id_cliente,
      m.cliente_nombre,
      m.detalle,
      m.banco || '',
      m.boleta || '',
      m.registrado ? 'Sí' : 'No',
      m.fecha_registrado || '',
      m.pagado ? 'Sí' : 'No',
      m.fecha_pagado || '',
      m.credito,
      m.abono
    ]);

    const csvContent = "\uFEFF" + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Bitacora_Movimientos_FNR_25_08.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearFilters = () => {
    setSelectedClientId('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <Layout title="Bitácora de Movimientos">
      <div className="space-y-6">
        
        {/* Statistics of the filtered query */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Facturación en Rango</p>
              <h3 className="text-2xl font-extrabold text-slate-800 mt-1">
                ${totalBilled.toLocaleString('es-CL')}
              </h3>
            </div>
            <div className="p-3 bg-indigo-50 rounded-xl">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cobros en Rango</p>
              <h3 className="text-2xl font-extrabold text-slate-800 mt-1">
                ${totalPaid.toLocaleString('es-CL')}
              </h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Diferencia Neta</p>
              <h3 className="text-2xl font-extrabold text-slate-800 mt-1">
                ${netBalance.toLocaleString('es-CL')}
              </h3>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl">
              <ArrowUpRight className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
            <Filter className="h-4.5 w-4.5 text-slate-400" />
            Filtrar Movimientos
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Client Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Filtrar por Cliente
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-semibold"
              >
                <option value="">Todos los clientes...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Fecha Desde
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-semibold"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Fecha Hasta
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-semibold"
              />
            </div>

            {/* Reset & Actions */}
            <div className="flex items-end gap-2.5">
              <button
                onClick={handleClearFilters}
                className="flex-1 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-250 transition-all"
              >
                Limpiar Filtros
              </button>
              <button
                onClick={handleExportCSV}
                title="Exportar listado actual a Excel"
                className="p-2 border border-slate-200 hover:bg-slate-100 text-slate-650 rounded-lg transition-all"
              >
                <Download className="h-4.5 w-4.5" />
              </button>
              <button
                onClick={() => {
                  setSelectedMovementForEdit(null);
                  setIsMovementModalOpen(true);
                }}
                className="flex-1 py-2 bg-indigo-650 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs transition-all shadow-sm flex items-center justify-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Registrar
              </button>
            </div>
          </div>
        </div>

        {/* Movements Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-150 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-4 px-6 w-32">Fecha</th>
                  <th className="py-4 px-6 w-52">Cliente</th>
                  <th className="py-4 px-6">Detalle / Glosa</th>
                  <th className="py-4 px-6 w-24">Banco</th>
                  <th className="py-4 px-6 w-24">Boleta</th>
                  <th className="py-4 px-6 text-center w-20">Reg.</th>
                  <th className="py-4 px-6 text-center w-20">Pag.</th>
                  <th className="py-4 px-6 text-right w-36">Cargo (+)</th>
                  <th className="py-4 px-6 text-right w-36">Abono (-)</th>
                  <th className="py-4 px-6 text-center w-24">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400 font-medium">
                      Cargando registros...
                    </td>
                  </tr>
                ) : movements.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400 font-medium">
                      No se registraron movimientos en el rango/filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => (
                    <tr 
                      key={m.id}
                      className="hover:bg-slate-50/50 transition-all group"
                    >
                      <td className="py-3 px-6 font-semibold text-slate-500">
                        {m.fecha}
                      </td>
                      <td className="py-3 px-6 font-bold text-indigo-700 hover:text-indigo-800">
                        <Link href={`/clientes/${m.id_cliente}`} className="hover:underline block">
                          {m.cliente_nombre}
                        </Link>
                      </td>
                      <td className="py-3 px-6 font-bold text-slate-800">
                        {m.detalle}
                      </td>
                      <td className="py-3 px-6 text-slate-500 font-medium uppercase text-xs">
                        {m.banco || '—'}
                      </td>
                      <td className="py-3 px-6 font-mono text-slate-500">
                        {m.boleta || '—'}
                      </td>
                      <td className="py-3 px-6 text-center">
                        <div className="flex flex-col items-center">
                          <input
                            type="checkbox"
                            checked={!!m.registrado}
                            onChange={(e) => handleToggleStatus(m, 'registrado', e.target.checked)}
                            className="h-4.5 w-4.5 rounded border-slate-300 text-indigo-650 accent-indigo-600 cursor-pointer print:hidden"
                          />
                          {m.registrado && (
                            <input
                              type="date"
                              value={m.fecha_registrado ? m.fecha_registrado.split('T')[0] : ''}
                              onChange={(e) => handleDateChange(m, 'fecha_registrado', e.target.value)}
                              className="mt-1 text-[10px] text-slate-500 border border-slate-250 rounded px-1 py-0.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-[95px] text-center print:hidden"
                            />
                          )}
                          <span className="hidden print:inline text-xs font-semibold text-slate-700">
                            {m.registrado ? (m.fecha_registrado ? `Sí (${m.fecha_registrado.split('T')[0].split('-').reverse().join('/')})` : 'Sí') : 'No'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-6 text-center">
                        <div className="flex flex-col items-center">
                          <input
                            type="checkbox"
                            checked={!!m.pagado}
                            onChange={(e) => handleToggleStatus(m, 'pagado', e.target.checked)}
                            className="h-4.5 w-4.5 rounded border-slate-300 text-emerald-650 accent-emerald-600 cursor-pointer print:hidden"
                          />
                          {m.pagado && (
                            <input
                              type="date"
                              value={m.fecha_pagado ? m.fecha_pagado.split('T')[0] : ''}
                              onChange={(e) => handleDateChange(m, 'fecha_pagado', e.target.value)}
                              className="mt-1 text-[10px] text-slate-500 border border-slate-250 rounded px-1 py-0.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-[95px] text-center print:hidden"
                            />
                          )}
                          <span className="hidden print:inline text-xs font-semibold text-slate-700">
                            {m.pagado ? (m.fecha_pagado ? `Sí (${m.fecha_pagado.split('T')[0].split('-').reverse().join('/')})` : 'Sí') : 'No'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-6 text-right font-semibold text-slate-700">
                        {m.credito > 0 ? `$${m.credito.toLocaleString('es-CL')}` : '—'}
                      </td>
                      <td className="py-3 px-6 text-right font-semibold text-slate-700">
                        {m.abono > 0 ? `$${m.abono.toLocaleString('es-CL')}` : '—'}
                      </td>
                      <td className="py-3 px-6 text-center">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={() => handleEditMovement(m)}
                            className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded transition-all"
                            title="Editar Movimiento"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteMovement(m.id)}
                            className="p-1 hover:bg-rose-50 text-rose-650 hover:text-rose-600 rounded transition-all"
                            title="Eliminar Movimiento"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              
              {/* Table footer with filtered sums */}
              <tfoot className="border-t-2 border-slate-200 bg-slate-50/50 font-bold text-slate-700">
                <tr>
                  <td colSpan={7} className="py-4 px-6 text-right">TOTAL FILTRADO:</td>
                  <td className="py-4 px-6 text-right text-slate-800">
                    ${totalBilled.toLocaleString('es-CL')}
                  </td>
                  <td className="py-4 px-6 text-right text-slate-800">
                    ${totalPaid.toLocaleString('es-CL')}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-extrabold ${
                      netBalance > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      ${netBalance.toLocaleString('es-CL')}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </div>

      <MovementFormModal
        isOpen={isMovementModalOpen}
        onClose={() => {
          setIsMovementModalOpen(false);
          setSelectedMovementForEdit(null);
        }}
        onSuccess={fetchMovements}
        movement={selectedMovementForEdit}
      />
    </Layout>
  );
}
