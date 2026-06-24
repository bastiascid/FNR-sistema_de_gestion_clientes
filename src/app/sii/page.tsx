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
                <h2 className="font-bold text-slate-800 text-base">¿Cómo instalar y usar la extensión?</h2>
              </div>

              <div className="space-y-4">
                
                <div className="flex gap-4">
                  <div className="h-7 w-7 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center font-bold text-xs text-indigo-600 flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-700 text-sm">Obtén la extensión</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      La extensión se encuentra en la carpeta `sii-chrome-extension` de tu proyecto. También puedes descargar la carpeta o comprimido directamente.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="h-7 w-7 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center font-bold text-xs text-indigo-600 flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-700 text-sm">Abre las Extensiones de Chrome</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      En Google Chrome, navega a <code className="bg-slate-100 text-indigo-600 px-1 py-0.5 rounded font-mono select-all">chrome://extensions/</code> o abre el menú de Chrome &gt; Extensiones &gt; Gestionar Extensiones.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="h-7 w-7 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center font-bold text-xs text-indigo-600 flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-700 text-sm">Activa el &quot;Modo de desarrollador&quot;</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      En la esquina superior derecha, activa el interruptor que dice <span className="font-semibold text-slate-600">Modo de desarrollador</span>.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="h-7 w-7 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center font-bold text-xs text-indigo-600 flex-shrink-0">
                    4
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-700 text-sm">Carga la carpeta</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Haz clic en el botón <span className="font-semibold text-slate-600">Cargar descomprimida</span> (Load unpacked) arriba a la izquierda. Selecciona la carpeta <code className="bg-slate-100 text-indigo-600 px-1 py-0.5 rounded font-mono">sii-chrome-extension</code> en los archivos de tu computador.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="h-7 w-7 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center font-bold text-xs text-indigo-600 flex-shrink-0">
                    5
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-700 text-sm">Configura la extensión</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Haz clic en el ícono del rompecabezas en tu barra del navegador, selecciona <span className="font-semibold text-slate-600">FNR SII Integration</span> e ingresa las credenciales de enlace mostradas en esta pantalla. Haz clic en &quot;Guardar configuración&quot;.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="h-7 w-7 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center font-bold text-xs text-emerald-600 flex-shrink-0">
                    6
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-700 text-sm">¡Listo para usar!</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Abre el portal del SII. Cuando veas cualquier boleta electrónica de honorarios recibida, verás un botón flotante con el texto <span className="font-bold text-indigo-600">&quot;Sincronizar con FNR&quot;</span> en la esquina del documento para registrarlo automáticamente en un clic.
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
