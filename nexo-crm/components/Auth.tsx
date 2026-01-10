
import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, ShieldCheck, ChevronLeft, XCircle, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useAuth } from '../src/lib/AuthProvider';
import { supabase } from '../src/lib/supabase';

interface AuthProps {
  onLogin: () => void;
}

type AuthMode = 'login' | 'register' | 'recover';

interface ModalState {
  isOpen: boolean;
  type: 'error' | 'success' | 'warning';
  title: string;
  message: string;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');

  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    type: 'error',
    title: '',
    message: ''
  });

  const showModal = (type: ModalState['type'], title: string, message: string) => {
    setModal({ isOpen: true, type, title, message });
  };

  const closeModal = () => {
    setModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === 'login') {
        if (password.length < 6) {
          showModal('warning', 'Senha Insegura', 'Sua senha deve conter pelo menos 6 caracteres para garantir a segurança da sua conta.');
          setIsLoading(false);
          return;
        }

        const { data, error } = await signIn(email, password);

        if (error) {
          console.error('Login error:', error);
          showModal('error', 'Falha no Acesso', error.message || 'E-mail ou senha incorretos. Por favor, verifique suas credenciais e tente novamente.');
          setIsLoading(false);
          return;
        }

        if (data?.user) {
          onLogin();
        }
      } else if (mode === 'register') {
        if (password.length < 6) {
          showModal('warning', 'Senha Insegura', 'Sua senha deve conter pelo menos 6 caracteres para garantir a segurança da sua conta.');
          setIsLoading(false);
          return;
        }

        const { data, error } = await signUp(email, password, name, companyName);

        if (error) {
          console.error('Signup error:', error);
          if (error.message?.includes('already registered') || error.message?.includes('already exists')) {
            showModal('warning', 'E-mail já Cadastrado', 'Este endereço de e-mail já está vinculado a uma conta Nexo. Tente recuperar sua senha.');
          } else {
            showModal('error', 'Erro no Cadastro', error.message || 'Não foi possível criar sua conta. Tente novamente.');
          }
          setIsLoading(false);
          return;
        }

        showModal('success', 'Cadastro Realizado!', 'Sua conta foi criada com sucesso! Verifique seu e-mail para confirmar o cadastro.');
        setMode('login');
      } else if (mode === 'recover') {
        if (!email.includes('@')) {
          showModal('error', 'E-mail Inválido', 'Por favor, insira um endereço de e-mail válido para receber o link de recuperação.');
          setIsLoading(false);
          return;
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
          console.error('Password reset error:', error);
          showModal('error', 'Erro ao Enviar', error.message || 'Não foi possível enviar o e-mail de recuperação.');
          setIsLoading(false);
          return;
        }

        showModal('success', 'E-mail Enviado', 'Se este e-mail estiver cadastrado, você receberá um link de redefinição de senha em instantes.');
        setMode('login');
      }
    } catch (err) {
      console.error('Auth error:', err);
      showModal('error', 'Erro Inesperado', 'Ocorreu um erro inesperado. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderTitle = () => {
    switch (mode) {
      case 'login': return { main: 'Bem-vindo ao Nexo', sub: 'Entre na sua conta para gerenciar seus leads.' };
      case 'register': return { main: 'Criar nova conta', sub: 'Comece a escalar suas vendas hoje mesmo.' };
      case 'recover': return { main: 'Recuperar senha', sub: 'Enviaremos um link de recuperação para o seu e-mail.' };
    }
  };

  const title = renderTitle();

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/5 blur-[120px] rounded-full"></div>

      <div className="w-full max-w-md z-10">
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-2xl shadow-indigo-600/20">
            <ShieldCheck className="text-white" size={28} />
          </div>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800/50 p-8 rounded-[32px] backdrop-blur-xl shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-white mb-2">{title.main}</h1>
            <p className="text-zinc-500 text-sm">{title.sub}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-zinc-500 uppercase px-1">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: João Silva"
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all text-white placeholder:text-zinc-700"
                  />
                </div>
              </div>
            )}

            {mode === 'register' && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-zinc-500 uppercase px-1">Nome da Empresa</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                  <input
                    required
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ex: Nexo Soluções"
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all text-white placeholder:text-zinc-700"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-zinc-500 uppercase px-1">Endereço de E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all text-white placeholder:text-zinc-700"
                />
              </div>
            </div>

            {mode !== 'recover' && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-end">
                  <label className="text-[11px] font-semibold text-zinc-500 uppercase px-1">Sua Senha</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setMode('recover')}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors mb-1.5"
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                  <input
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all text-white placeholder:text-zinc-700"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 mt-6"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span>Aguarde...</span>
                </div>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Entrar no Nexo' : mode === 'register' ? 'Criar Minha Conta' : 'Enviar Link de Acesso'}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-zinc-800/50 text-center">
            {mode === 'login' ? (
              <p className="text-sm text-zinc-500">
                Não tem uma conta?{' '}
                <button onClick={() => setMode('register')} className="text-indigo-400 hover:text-indigo-300 font-medium">Cadastre-se grátis</button>
              </p>
            ) : (
              <button
                onClick={() => setMode('login')}
                className="text-sm text-zinc-400 hover:text-white flex items-center justify-center gap-2 mx-auto transition-colors"
              >
                <ChevronLeft size={16} /> Voltar para o Login
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-[11px] text-zinc-600 mt-8 uppercase tracking-widest font-semibold">
          Nexo CRM &copy; {new Date().getFullYear()} - Segurança de Dados de Ponta a Ponta
        </p>
      </div>

      {/* Modal System */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-all animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#0c0c0e] border border-zinc-800 rounded-[2.5rem] p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200 text-center">
            <div className={`mx-auto w-16 h-16 rounded-3xl mb-6 flex items-center justify-center ${modal.type === 'error' ? 'bg-rose-500/10 text-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.1)]' :
              modal.type === 'warning' ? 'bg-amber-500/10 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.1)]' :
                'bg-emerald-500/10 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
              }`}>
              {modal.type === 'error' && <XCircle size={32} />}
              {modal.type === 'warning' && <AlertCircle size={32} />}
              {modal.type === 'success' && <CheckCircle2 size={32} />}
            </div>

            <h3 className="text-xl font-bold text-white mb-3">{modal.title}</h3>
            <p className="text-sm text-zinc-500 leading-relaxed mb-8 px-2">
              {modal.message}
            </p>

            <button
              onClick={closeModal}
              className={`w-full py-4 rounded-2xl font-bold text-xs transition-all active:scale-95 shadow-lg ${modal.type === 'error' ? 'bg-rose-500 text-white hover:bg-rose-600' :
                modal.type === 'warning' ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400' :
                  'bg-emerald-500 text-white hover:bg-emerald-600'
                }`}
            >
              Confirmar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Auth;
