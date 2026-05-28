'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Client, Movement } from '@/lib/db';

interface MovementFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientId?: number | null; // If provided, pre-select this client
  movement?: Movement | null; // If provided, we are editing
}

export default function MovementFormModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  clientId, 
  movement 
}: MovementFormModalProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [formData, setFormData] = useState({
    id_cliente: '',
    fecha: '',
    detalle: '',
    banco: '',
    boleta: '',
    tipo: 'credito', // 'credito' (Cargo) or 'abono' (Pago)
    monto: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch client list for dropdown if not restricted or pre-selected
  useEffect(() => {
    if (isOpen) {
      fetch('/api/clients')
        .then(res => res.json())
        .then(data => setClients(data))
        .catch(err => console.error('Error fetching clients for dropdown:', err));
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (movement) {
        setFormData({
          id_cliente: String(movement.id_cliente),
          fecha: movement.fecha.split('T')[0],
          detalle: movement.detalle || '',
          banco: movement.banco || '',
          boleta: movement.boleta || '',
          tipo: movement.credito > 0 ? 'credito' : 'abono',
          monto: String(movement.credito > 0 ? movement.credito : movement.abono)
        });
      } else {
        // Create mode: pre-fill date with current date (2026-05-28)
        const defaultDate = new Date().toISOString().split('T')[0];
        setFormData({
          id_cliente: clientId ? String(clientId) : '',
          fecha: defaultDate,
          detalle: '',
          banco: '',
          boleta: '',
          tipo: 'credito',
          monto: ''
        });
      }
      setError('');
    }
  }, [movement, clientId, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Auto-fill common descriptions for convenience
    let updatedFormData = { ...formData, [name]: value };
    if (name === 'tipo') {
      if (value === 'credito' && !formData.detalle) {
        updatedFormData.detalle = 'Honorarios mes ' + getMonthName();
      } else if (value === 'abono' && !formData.detalle) {
        updatedFormData.detalle = 'Honor. Pagados';
      }
    }
    
    setFormData(updatedFormData);
  };

  const getMonthName = () => {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const currentMonth = new Date().getMonth();
    return months[currentMonth];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { id_cliente, fecha, detalle, monto, tipo } = formData;

    if (!id_cliente) {
      setError('Debe seleccionar un cliente.');
      return;
    }
    if (!fecha) {
      setError('La fecha es obligatoria.');
      return;
    }
    if (!detalle.trim()) {
      setError('El detalle es obligatorio.');
      return;
    }
    if (!monto || isNaN(Number(monto)) || Number(monto) <= 0) {
      setError('El monto debe ser un número mayor a cero.');
      return;
    }

    setLoading(true);
    setError('');

    const submissionData = {
      id_cliente: parseInt(id_cliente),
      fecha,
      detalle,
      banco: formData.banco || null,
      boleta: formData.boleta || null,
      credito: tipo === 'credito' ? Number(monto) : 0,
      abono: tipo === 'abono' ? Number(monto) : 0
    };

    try {
      const url = movement ? `/api/movements/${movement.id}` : '/api/movements';
      const method = movement ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ocurrió un error al registrar el movimiento.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full z-10 overflow-hidden transform transition-all duration-300 scale-100">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-150 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-bold text-lg text-slate-800">
            {movement ? 'Editar Movimiento' : 'Registrar Movimiento'}
          </h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {error && (
              <div className="p-3.5 bg-rose-50 text-rose-700 text-sm font-medium rounded-lg border border-rose-100">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              {/* Client Selection (only if not pre-selected or in edit mode) */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Cliente *
                </label>
                {movement || clientId ? (
                  <div className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-semibold text-sm">
                    {clients.find(c => String(c.id) === String(formData.id_cliente))?.nombre || 'Cargando cliente...'}
                  </div>
                ) : (
                  <select
                    name="id_cliente"
                    value={formData.id_cliente}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-semibold"
                    required
                  >
                    <option value="">Seleccione un cliente...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Date & Type Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Fecha de Movimiento *
                  </label>
                  <input
                    type="date"
                    name="fecha"
                    value={formData.fecha}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Tipo de Movimiento *
                  </label>
                  <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setFormData({ 
                        ...formData, 
                        tipo: 'credito',
                        detalle: formData.detalle === 'Honor. Pagados' ? 'Honorarios mes ' + getMonthName() : formData.detalle 
                      })}
                      className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                        formData.tipo === 'credito'
                          ? 'bg-indigo-650 bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Cargo (Honorario)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ 
                        ...formData, 
                        tipo: 'abono',
                        detalle: formData.detalle.startsWith('Honorarios mes') ? 'Honor. Pagados' : formData.detalle 
                      })}
                      className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                        formData.tipo === 'abono'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Abono (Pago)
                    </button>
                  </div>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Monto ($ CLP) *
                </label>
                <input
                  type="number"
                  name="monto"
                  value={formData.monto}
                  onChange={handleChange}
                  placeholder="Ej: 75000"
                  min="1"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-semibold"
                  required
                />
              </div>

              {/* Description / Detalle */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Detalle / Glosa *
                </label>
                <input
                  type="text"
                  name="detalle"
                  value={formData.detalle}
                  onChange={handleChange}
                  placeholder="Ej: Honorarios mes Enero 2026"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                  required
                />
              </div>

              {/* Bank & Reference (only visual helper fields if required) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Banco (opcional)
                  </label>
                  <input
                    type="text"
                    name="banco"
                    value={formData.banco}
                    onChange={handleChange}
                    placeholder="Ej: chile, estado, bci"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Nº Boleta / Documento (opcional)
                  </label>
                  <input
                    type="text"
                    name="boleta"
                    value={formData.boleta}
                    onChange={handleChange}
                    placeholder="Ej: 11599"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 border-t border-slate-150 flex items-center justify-end gap-3 bg-slate-50/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-250 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg transition-all text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-lg transition-all shadow-sm text-sm"
            >
              {loading ? 'Registrando...' : movement ? 'Guardar Cambios' : 'Registrar Movimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
