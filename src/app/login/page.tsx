'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { LogIn, Mail, Lock, ShieldAlert, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();
  const supabase = getSupabaseBrowser();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-radial from-slate-900 via-slate-950 to-black px-4 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 -left-4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 -right-4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mb-4 shadow-lg shadow-indigo-500/5">
            <LogIn size={32} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            FNR Administrativo
          </h1>
          <p className="text-sm text-slate-400">
            Control de Honorarios y Clientes
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl shadow-2xl p-8 relative">
          <h2 className="text-xl font-bold text-white mb-6">Iniciar Sesión</h2>

          <form onSubmit={handleLogin} className="space-y-6">
            {errorMsg && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-950/30 border border-red-500/30 text-red-200 text-sm">
                <ShieldAlert className="shrink-0 text-red-400 mt-0.5" size={18} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Email field */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="email"
                  required
                  placeholder="ejemplo@clubdeleones.cl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-800 focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/10 rounded-2xl text-white placeholder-slate-600 outline-none transition-all duration-200"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Contraseña
                </label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-800 focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/10 rounded-2xl text-white placeholder-slate-600 outline-none transition-all duration-200"
                />
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white font-semibold rounded-2xl cursor-pointer hover:shadow-lg hover:shadow-indigo-500/10 active:scale-[0.99] transition-all duration-200 outline-none"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Validando credenciales...</span>
                </>
              ) : (
                <span>Ingresar al Sistema</span>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-600 mt-8">
          © {new Date().getFullYear()} FNR Contable • Club de Leones
        </p>
      </div>
    </div>
  );
}
