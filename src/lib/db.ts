export type Client = {
  id: number;
  nombre: string;
  rut: string | null;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  observaciones: string | null;
  created_at: string;
};

export type Movement = {
  id: number;
  id_cliente: number;
  fecha: string;
  detalle: string;
  banco: string | null;
  boleta: string | null;
  credito: number;
  abono: number;
  registrado?: boolean;
  pagado?: boolean;
  fecha_registrado?: string | null;
  fecha_pagado?: string | null;
  created_at: string;
};
