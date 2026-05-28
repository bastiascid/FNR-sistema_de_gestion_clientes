'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  MapPin, 
  Edit2, 
  Trash2, 
  FileText,
  Info
} from 'lucide-react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import ClientFormModal from '@/components/ClientFormModal';
import { Client } from '@/lib/db';

export default function ClientsManager() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClientForEdit, setSelectedClientForEdit] = useState<Client | null>(null);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients?search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [search]);

  const handleEditClient = (client: Client) => {
    setSelectedClientForEdit(client);
    setIsModalOpen(true);
  };

  const handleDeleteClient = async (id: number, name: string) => {
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

  return (
    <Layout title="Gestión de Clientes">
      <div className="space-y-6">
        
        {/* Actions panel */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder="Buscar cliente por nombre o RUT..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
            />
          </div>

          <button
            onClick={() => {
              setSelectedClientForEdit(null);
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all shadow-sm text-sm w-full sm:w-auto"
          >
            <Plus className="h-4.5 w-4.5" />
            Nuevo Cliente
          </button>
        </div>

        {/* Clients Directory Cards */}
        {loading ? (
          <div className="py-12 text-center text-slate-400 font-medium bg-white rounded-2xl border border-slate-100">
            Cargando directorio de clientes...
          </div>
        ) : clients.length === 0 ? (
          <div className="py-12 text-center text-slate-400 font-medium bg-white rounded-2xl border border-slate-100">
            No se encontraron clientes coincidentes.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {clients.map((client) => (
              <div 
                key={client.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Top section: ID & name */}
                  <div className="flex items-start justify-between border-b pb-3 border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ID: {client.id}</span>
                      <h3 className="font-bold text-lg text-slate-800 leading-tight mt-0.5">{client.nombre}</h3>
                    </div>
                    {client.rut && (
                      <span className="px-2.5 py-0.5 bg-slate-100 rounded text-xs font-bold text-slate-500">
                        {client.rut}
                      </span>
                    )}
                  </div>

                  {/* Body contact details */}
                  <div className="py-4 space-y-2.5 text-sm text-slate-650 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-700">{client.telefono || '—'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-700 break-all">{client.correo || '—'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-700 leading-snug">{client.direccion || '—'}</span>
                    </div>
                  </div>

                  {/* Internal observations */}
                  <div className="py-3 text-xs flex gap-2 text-slate-500">
                    <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <p className="italic leading-relaxed">{client.observaciones || 'Sin observaciones registradas.'}</p>
                  </div>
                </div>

                {/* Card actions */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 mt-2 bg-slate-50/20 p-2 rounded-xl">
                  <Link
                    href={`/clientes/${client.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs transition-all"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Estado de Cuenta
                  </Link>

                  <button
                    onClick={() => handleEditClient(client)}
                    className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold transition-all"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Editar
                  </button>

                  <button
                    onClick={() => handleDeleteClient(client.id, client.nombre)}
                    className="flex items-center gap-1 px-3 py-1.5 border border-rose-100 hover:bg-rose-50 text-rose-600 rounded-lg text-xs font-semibold transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      <ClientFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedClientForEdit(null);
        }}
        onSuccess={fetchClients}
        client={selectedClientForEdit}
      />
    </Layout>
  );
}
