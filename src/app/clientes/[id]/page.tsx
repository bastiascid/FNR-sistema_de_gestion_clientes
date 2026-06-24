'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Plus, 
  Printer, 
  Download, 
  Edit2, 
  Trash2, 
  Phone, 
  Mail, 
  MapPin, 
  FileText,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  Info
} from 'lucide-react';
import Layout from '@/components/Layout';
import ClientFormModal from '@/components/ClientFormModal';
import MovementFormModal from '@/components/MovementFormModal';
import { Client, Movement } from '@/lib/db';

interface StatementReport {
  client: Client;
  movements: (Movement & { saldoAcumulado: number })[];
  summary: {
    totalDebe: number;
    totalHaber: number;
    finalSaldo: number;
  };
}

export default function ClientStatement() {
  const params = useParams();
  const router = useRouter();
  const clientIdStr = params.id as string;
  const clientId = parseInt(clientIdStr);

  const [data, setData] = useState<StatementReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [selectedMovementForEdit, setSelectedMovementForEdit] = useState<Movement | null>(null);

  const fetchStatement = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/reports/statement?clientId=${clientId}`);
      if (res.ok) {
        const reportData = await res.json();
        setData(reportData);
      } else {
        const errData = await res.json();
        setError(errData.error || 'No se pudo cargar el estado de cuenta.');
      }
    } catch (err) {
      setError('Error de red al cargar el informe.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchStatement();
    }
  }, [clientId]);

  if (loading) {
    return (
      <Layout title="Cargando...">
        <div className="py-12 text-center text-slate-400 font-medium">
          Generando Estado de Cuenta del Cliente...
        </div>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout title="Error">
        <div className="max-w-xl mx-auto py-12 space-y-4 text-center">
          <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 font-medium">
            {error || 'El cliente solicitado no existe o fue eliminado.'}
          </div>
          <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 transition-all text-sm">
            <ArrowLeft className="h-4 w-4" />
            Volver al Portal
          </Link>
        </div>
      </Layout>
    );
  }

  const { client, movements, summary } = data;

  // Actions
  const handleEditClientSuccess = () => {
    fetchStatement();
  };

  const handleEditMovement = (mv: Movement) => {
    setSelectedMovementForEdit(mv);
    setIsMovementModalOpen(true);
  };

  const handleDeleteMovement = async (id: number) => {
    if (confirm('¿Está seguro de que desea eliminar este movimiento de forma permanente? El saldo acumulado se recalculará automáticamente.')) {
      try {
        const res = await fetch(`/api/movements/${id}`, { method: 'DELETE' });
        if (res.ok) {
          fetchStatement();
        } else {
          const errData = await res.json();
          alert(`Error: ${errData.error}`);
        }
      } catch (err) {
        alert('Error de conexión.');
      }
    }
  };

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
        fetchStatement();
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
        fetchStatement();
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
      'Fecha', 'Detalle/Glosa', 'Banco', 'Boleta/Documento', 
      'Registrado', 'Fecha Registro', 'Pagado', 'Fecha Pago', 
      'Cargo (Debe)', 'Abono (Haber)', 'Saldo Acumulado'
    ];
    const rows = movements.map(m => [
      m.fecha,
      m.detalle,
      m.banco || '',
      m.boleta || '',
      m.registrado ? 'Sí' : 'No',
      m.fecha_registrado || '',
      m.pagado ? 'Sí' : 'No',
      m.fecha_pagado || '',
      m.credito,
      m.abono,
      m.saldoAcumulado
    ]);
    
    // Add BOM for Excel and semicolon separator
    const csvContent = "\uFEFF" + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const sanitizedClientName = client.nombre.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.setAttribute("download", `Estado_De_Cuenta_${sanitizedClientName}_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Layout title={`Estado de Cuenta: ${client.nombre}`}>
      <div className="space-y-6">
        
        {/* Navigation Breadcrumb (Hidden on Print) */}
        <div className="no-print flex items-center justify-between">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-semibold text-sm transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al Portal Principal
          </Link>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsClientModalOpen(true)}
              className="px-3.5 py-2 border border-slate-250 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg transition-all text-xs"
            >
              Editar Cliente
            </button>
            <button
              onClick={() => {
                setSelectedMovementForEdit(null);
                setIsMovementModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all shadow-sm text-xs"
            >
              <Plus className="h-4 w-4" />
              Registrar Movimiento
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold rounded-lg transition-all text-xs"
              title="Exportar a Excel"
            >
              <Download className="h-4 w-4" />
              Exportar Excel
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold rounded-lg transition-all text-xs"
              title="Imprimir Estado de Cuenta"
            >
              <Printer className="h-4 w-4" />
              Imprimir Reporte
            </button>
          </div>
        </div>

        {/* Print Title Header (Only visible on print) */}
        <div className="hidden print:block mb-8">
          <div className="flex items-center justify-between border-b pb-4 border-slate-300">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 uppercase">FNR CONTABLE — ESTADO DE CUENTA INDIVIDUAL</h1>
              <p className="text-xs text-slate-500 mt-1">Historial Auxiliar Detallado de Transacciones Contables</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block font-bold">FNR CONTABILIDAD</span>
              <span className="text-[10px] text-slate-400 block">SANTIAGO, CHILE</span>
            </div>
          </div>
        </div>

        {/* Client details card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 print-card grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cliente</span>
              <h2 className="text-2xl font-extrabold text-slate-800 mt-0.5">{client.nombre}</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 text-sm text-slate-650">
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-16 shrink-0">RUT:</span>
                <span className="font-semibold text-slate-700">{client.rut || 'No registrado'}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-16 shrink-0">Teléfono:</span>
                <span className="font-semibold text-slate-700 flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-slate-400 no-print" /> {client.telefono || 'No registrado'}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-16 shrink-0">Correo:</span>
                <span className="font-semibold text-slate-700 flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-slate-400 no-print" /> {client.correo || 'No registrado'}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-16 shrink-0">Dirección:</span>
                <span className="font-semibold text-slate-700 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 no-print" /> {client.direccion || 'No registrado'}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t md:border-t-0 md:border-l border-slate-150 pt-4 md:pt-0 md:pl-6 space-y-4 bg-slate-50/30 p-4 rounded-xl">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="h-4 w-4 text-slate-400" />
              Observaciones Internas
            </h4>
            <p className="text-sm text-slate-600 leading-relaxed italic">
              {client.observaciones || 'Sin observaciones registradas para este cliente.'}
            </p>
          </div>
        </div>

        {/* Mini Report Cards */}
        <div className="grid grid-cols-3 gap-5">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 text-center print-card">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Cargos (Debe)</span>
            <span className="text-xl sm:text-2xl font-extrabold text-slate-800 mt-1 block">
              ${summary.totalDebe.toLocaleString('es-CL')}
            </span>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 text-center print-card">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Abonos (Haber)</span>
            <span className="text-xl sm:text-2xl font-extrabold text-slate-800 mt-1 block">
              ${summary.totalHaber.toLocaleString('es-CL')}
            </span>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 text-center print-card">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Saldo Pendiente</span>
            <span className={`text-xl sm:text-2xl font-extrabold mt-1 block ${summary.finalSaldo > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
              ${summary.finalSaldo.toLocaleString('es-CL')}
            </span>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden print-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-150 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-4 px-6 w-32">Fecha</th>
                  <th className="py-4 px-6">Detalle / Glosa</th>
                  <th className="py-4 px-6 w-28">Banco</th>
                  <th className="py-4 px-6 w-28">Boleta Nº</th>
                  <th className="py-4 px-6 text-center w-20">Reg.</th>
                  <th className="py-4 px-6 text-center w-20">Pag.</th>
                  <th className="py-4 px-6 text-right w-36">Cargos (+)</th>
                  <th className="py-4 px-6 text-right w-36">Abonos (-)</th>
                  <th className="py-4 px-6 text-right w-36">Saldo Acum.</th>
                  <th className="py-4 px-6 text-center no-print w-24">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400 font-medium">
                      No se registran movimientos para este cliente en el año actual.
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
                            className="h-4.5 w-4.5 rounded border-slate-300 text-indigo-605 accent-indigo-600 cursor-pointer print:hidden"
                          />
                          {m.registrado && (
                            <input
                              type="date"
                              value={m.fecha_registrado ? m.fecha_registrado.split('T')[0] : ''}
                              onChange={(e) => handleDateChange(m, 'fecha_registrado', e.target.value)}
                              className="mt-1 text-[10px] text-slate-500 border border-slate-250 rounded px-1 py-0.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-[95px] text-center print:hidden"
                            />
                          )}
                          <span className="hidden print:inline text-xs">
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
                          <span className="hidden print:inline text-xs">
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
                      <td className="py-3 px-6 text-right">
                        <span className={`font-bold ${m.saldoAcumulado > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                          ${m.saldoAcumulado.toLocaleString('es-CL')}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-center no-print">
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
                            className="p-1 hover:bg-rose-50 text-slate-500 hover:text-rose-650 text-rose-600 rounded transition-all"
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
              
              {/* Grand Totals */}
              <tfoot className="border-t-2 border-slate-200 bg-slate-50/50 font-bold text-slate-700">
                <tr>
                  <td colSpan={6} className="py-4 px-6 text-right">TOTAL GENERAL:</td>
                  <td className="py-4 px-6 text-right text-slate-800">
                    ${summary.totalDebe.toLocaleString('es-CL')}
                  </td>
                  <td className="py-4 px-6 text-right text-slate-800">
                    ${summary.totalHaber.toLocaleString('es-CL')}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span className={`px-2.5 py-1 rounded-lg text-sm font-extrabold ${
                      summary.finalSaldo > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      ${summary.finalSaldo.toLocaleString('es-CL')}
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
        onClose={() => setIsClientModalOpen(false)}
        onSuccess={fetchStatement}
        client={client}
      />

      <MovementFormModal
        isOpen={isMovementModalOpen}
        onClose={() => {
          setIsMovementModalOpen(false);
          setSelectedMovementForEdit(null);
        }}
        onSuccess={fetchStatement}
        clientId={client.id}
        movement={selectedMovementForEdit}
      />
    </Layout>
  );
}
