'use client';

import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { 
  Settings, 
  Copy, 
  Check, 
  Download, 
  HelpCircle, 
  Cpu, 
  Link as LinkIcon, 
  Key,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

export default function SiiPage() {
  const [config, setConfig] = useState({ url: '', apiKey: '', isCustom: false });
  const [loading, setLoading] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch('/api/sii/config');
        if (res.ok) {
          const data = await res.json();
          setConfig(data);
        }
      } catch (err) {
        console.error('Failed to load SII configuration:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, []);

  const handleCopy = (text: string, type: 'url' | 'key') => {
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  return (
    <Layout title="Integración Servicio de Impuestos Internos (SII)">
      <div className="space-y-6">
        
        {/* Banner header */}
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 p-6 sm:p-8 rounded-2xl text-white shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-10 translate-x-12 -translate-y-6">
            <Cpu className="h-64 w-64" />
          </div>
          <div className="relative z-10 max-w-2xl">
            <span className="bg-indigo-500/30 text-indigo-200 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
              Automatización en Tiempo Real
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold mt-3">Sincronización por Extensión de Chrome</h1>
            <p className="text-indigo-200/90 text-sm mt-2 leading-relaxed">
              Conecta el portal del SII de Chile directamente con FNR Admin. Al emitir o revisar boletas de honorarios en el SII, la extensión registrará los créditos y creará clientes de manera automática.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center text-slate-500">
            Cargando credenciales de integración...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Connection Credentials Card */}
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="h-5 w-5 text-indigo-600" />
                  <h2 className="font-bold text-slate-800 text-base">Credenciales de Enlace</h2>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">
                  Usa estos datos dentro del popup de configuración de tu extensión de Chrome.
                </p>

                {/* Server URL */}
                <div className="space-y-2 mb-5">
                  <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5 uppercase">
                    <LinkIcon className="h-3.5 w-3.5" /> URL del Servidor
                  </label>
                  <div className="flex bg-slate-50 rounded-lg border border-slate-200 overflow-hidden text-sm">
                    <input
                      type="text"
                      readOnly
                      value={config.url}
                      className="bg-transparent flex-1 px-3 py-2 text-slate-700 outline-none select-all"
                    />
                    <button
                      onClick={() => handleCopy(config.url, 'url')}
                      className="px-3 bg-slate-100 hover:bg-slate-200 border-l border-slate-200 transition-all text-slate-500 hover:text-slate-800"
                      title="Copiar URL"
                    >
                      {copiedUrl ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* API Key */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5 uppercase">
                    <Key className="h-3.5 w-3.5" /> Clave API SII
                  </label>
                  <div className="flex bg-slate-50 rounded-lg border border-slate-200 overflow-hidden text-sm">
                    <input
                      type="password"
                      readOnly
                      value={config.apiKey}
                      className="bg-transparent flex-1 px-3 py-2 text-slate-700 outline-none select-all font-mono"
                    />
                    <button
                      onClick={() => handleCopy(config.apiKey, 'key')}
                      className="px-3 bg-slate-100 hover:bg-slate-200 border-l border-slate-200 transition-all text-slate-500 hover:text-slate-800"
                      title="Copiar API Key"
                    >
                      {copiedKey ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Status Banner */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                {!config.isCustom ? (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 flex gap-2.5 items-start">
                    <AlertTriangle className="h-4.5 w-4.5 mt-0.5 text-amber-600 flex-shrink-0" />
                    <div className="text-xs">
                      <span className="font-bold">Clave por Defecto activa.</span>
                      <p className="mt-0.5 text-slate-600">
                        Te recomendamos cambiar la llave secreta en tu archivo `.env.local` configurando la variable `SII_EXTENSION_KEY`.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 flex gap-2.5 items-start">
                    <ShieldCheck className="h-4.5 w-4.5 mt-0.5 text-emerald-600 flex-shrink-0" />
                    <div className="text-xs">
                      <span className="font-bold">Conexión Segura configurada.</span>
                      <p className="mt-0.5 text-slate-600">
                        Tu API Key está configurada correctamente en las variables del sistema.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Instruction Card */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-indigo-600" />
                <h2 className="font-bold text-slate-800 text-base">¿Cómo instalar y usar el capturador (Tampermonkey)?</h2>
              </div>

              <div className="space-y-4">
                
                <div className="flex gap-4">
                  <div className="h-7 w-7 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center font-bold text-xs text-indigo-600 flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-700 text-sm">Instala la extensión Tampermonkey</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Ve a la Chrome Web Store (o tu tienda de extensiones) y descarga <strong>Tampermonkey</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="h-7 w-7 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center font-bold text-xs text-indigo-600 flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-700 text-sm">Crea un Nuevo Script</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Haz clic en el ícono de Tampermonkey en tu barra y selecciona <strong>&quot;Crear nuevo script...&quot;</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="h-7 w-7 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center font-bold text-xs text-indigo-600 flex-shrink-0">
                    3
                  </div>
                  <div className="w-full">
                    <h3 className="font-bold text-slate-700 text-sm">Pega este código fuente</h3>
                    <p className="text-xs text-slate-500 mt-0.5 mb-2">
                      Borra todo el contenido por defecto, pega esto y presiona <strong>Archivo &gt; Guardar</strong> (o Ctrl+S).
                    </p>
                    <div className="relative bg-slate-900 rounded-lg p-4 overflow-x-auto text-xs text-slate-300 font-mono">
                      <pre>
{`// ==UserScript==
// @name         Capturador de Boletas FNR
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Captura boletas del SII y las envía a FNR pidiendo confirmación
// @match        https://*.sii.cl/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // CONFIGURACIÓN DE TU API
    const API_URL = "${typeof window !== 'undefined' ? window.location.origin : 'https://fnr.bastiascid.cl'}/api/sii/boleta";
    const API_KEY = "${config.apiKey}";

    // Función de extracción (Prueba simulada inicial)
    function extraerDatos() {
        return {
            boleta: "999",
            rut_emisor: "12345678-9",
            nombre_emisor: "Juan Pérez de Prueba",
            monto: 50000,
            fecha: new Date().toISOString().split('T')[0],
            detalle: "Servicios profesionales"
        };
    }

    function mostrarVentanaFNR(datos) {
        if(document.getElementById('fnr-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'fnr-panel';
        panel.innerHTML = \`
            <div style="position: fixed; bottom: 20px; right: 20px; width: 320px; background: white; border: 2px solid #000; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 999999; font-family: sans-serif; overflow: hidden; color: #333;">
                <div style="background: #4f46e5; color: white; padding: 10px; font-weight: bold; text-align: center;">
                    Sincronizar con FNR
                </div>
                <div style="padding: 15px; display: flex; flex-direction: column; gap: 10px;">
                    <label style="font-size: 12px; color: #555;">N° Boleta</label>
                    <input type="text" id="fnr-bol" value="\${datos.boleta}" style="padding: 5px; border: 1px solid #ccc; border-radius: 4px; color: #000;">

                    <label style="font-size: 12px; color: #555;">RUT Emisor</label>
                    <input type="text" id="fnr-rut" value="\${datos.rut_emisor}" style="padding: 5px; border: 1px solid #ccc; border-radius: 4px; color: #000;">

                    <label style="font-size: 12px; color: #555;">Nombre Emisor</label>
                    <input type="text" id="fnr-nombre" value="\${datos.nombre_emisor}" style="padding: 5px; border: 1px solid #ccc; border-radius: 4px; color: #000;">

                    <label style="font-size: 12px; color: #555;">Monto Bruto ($)</label>
                    <input type="number" id="fnr-monto" value="\${datos.monto}" style="padding: 5px; border: 1px solid #ccc; border-radius: 4px; color: #000;">
                    
                    <label style="font-size: 12px; color: #555;">Detalle</label>
                    <input type="text" id="fnr-detalle" value="\${datos.detalle}" style="padding: 5px; border: 1px solid #ccc; border-radius: 4px; color: #000;">

                    <button id="fnr-enviar" style="margin-top: 10px; background: #16a34a; color: white; border: none; padding: 10px; border-radius: 4px; cursor: pointer; font-weight: bold;">
                        Confirmar y Enviar
                    </button>
                    <button id="fnr-cerrar" style="background: #dc2626; color: white; border: none; padding: 10px; border-radius: 4px; cursor: pointer; font-weight: bold;">
                        Cancelar
                    </button>
                </div>
            </div>
        \`;
        document.body.appendChild(panel);

        document.getElementById('fnr-cerrar').onclick = () => panel.remove();
        
        document.getElementById('fnr-enviar').onclick = async () => {
            const btn = document.getElementById('fnr-enviar');
            btn.innerText = "Enviando...";
            btn.disabled = true;

            const payload = {
                boleta: document.getElementById('fnr-bol').value,
                rut_emisor: document.getElementById('fnr-rut').value,
                nombre_emisor: document.getElementById('fnr-nombre').value,
                monto: Number(document.getElementById('fnr-monto').value),
                fecha: new Date().toISOString().split('T')[0],
                detalle: document.getElementById('fnr-detalle').value
            };

            try {
                const res = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-sii-extension-key': API_KEY },
                    body: JSON.stringify(payload)
                });
                
                if(res.ok) {
                    alert('¡Boleta guardada en FNR exitosamente!');
                    panel.remove();
                } else {
                    const data = await res.json();
                    alert('Error al guardar: ' + (data.error || 'Desconocido'));
                    btn.innerText = "Reintentar";
                    btn.disabled = false;
                }
            } catch (err) {
                alert('Error de conexión con FNR.');
                btn.innerText = "Reintentar";
                btn.disabled = false;
            }
        };
    }

    setTimeout(() => {
        const datosExtraidos = extraerDatos();
        mostrarVentanaFNR(datosExtraidos);
    }, 1500);

})();`}
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="h-7 w-7 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center font-bold text-xs text-emerald-600 flex-shrink-0">
                    4
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-700 text-sm">¡Pruébalo en el SII!</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Abre la página del SII. El recuadro aparecerá abajo a la derecha simulando una captura. 
                    </p>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

      </div>
    </Layout>
  );
}
