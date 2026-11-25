'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRightToBracket,
  faMoon,
  faSpinner,
  faSun,
} from '@fortawesome/free-solid-svg-icons';

import Button from '@/components/buttons/Button';
import Checkbox from '@/components/inputs/Checkbox';
import InputPassword from '@/components/inputs/InputPassword';
import InputText from '@/components/inputs/InputText';
import SmartNFeLogo from '@/components/brand/SmartNFeLogo';
import { useAppContext } from '@/context/AppContext';
import LoginIllustration from './LoginIllustration';

export default function LoginPage() {
  const router = useRouter();
  const { darkMode, toggleDarkMode, mounted } = useAppContext();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isDark = mounted ? Boolean(darkMode) : false;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isLoading) return;

    setError('');

    if (!username.trim() || !password) {
      setError('Informe usuário e senha para continuar.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, remember }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data?.error || 'Não foi possível entrar. Verifique suas credenciais.');
        return;
      }

      router.replace('/dashboard');
      router.refresh();
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 lg:grid lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary px-12 py-12 text-white lg:flex xl:px-16">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/5" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-28 h-[28rem] w-[28rem] rounded-full bg-white/5" />

        <SmartNFeLogo variant="white" priority className="relative h-11 w-auto self-start" />

        <div className="relative max-w-lg">
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight xl:text-5xl">
            Simplifique sua
            <br />
            gestão fiscal.
          </h1>
          <div className="mt-6 h-1 w-16 rounded-full bg-secondary" />
          <p className="mt-6 max-w-md text-base leading-relaxed text-blue-50/95 xl:text-lg">
            Importe, confira, divida e agrupe suas notas fiscais com mais controle,
            segurança e conformidade para o seu negócio.
          </p>
          <LoginIllustration className="mt-8 w-full max-w-sm" />
        </div>

        <p className="relative text-xs text-blue-100/80">
          Emissão • Conferência • Divisão e agrupamento de NF-e
        </p>
      </aside>

      <section className="relative flex min-h-screen flex-col">
        <div className="flex justify-end p-4">
          <Button
            type="button"
            buttonType="ghost"
            onClick={toggleDarkMode}
            title={isDark ? 'Modo claro' : 'Modo escuro'}
            aria-label={isDark ? 'Alternar para modo claro' : 'Alternar para modo escuro'}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <FontAwesomeIcon icon={isDark ? faSun : faMoon} className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 pb-12 sm:px-8">
          <div className="w-full max-w-md">
            <div className="mb-8 flex justify-center lg:hidden">
              <SmartNFeLogo className="h-9 w-auto" />
            </div>
            <div className="mb-8 hidden justify-center lg:flex">
              <SmartNFeLogo className="h-12 w-auto" />
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Acesse sua conta
              </h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Informe seus dados para entrar no sistema.
              </p>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
              {error && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
                >
                  {error}
                </div>
              )}

              <InputText
                id="username"
                name="username"
                label="Usuário"
                placeholder="Digite seu usuário"
                autoComplete="username"
                value={username}
                onChange={(id, value) => setUsername(value)}
                required
                disabled={isLoading}
              />

              <InputPassword
                id="password"
                name="password"
                label="Senha"
                placeholder="Digite sua senha"
                autoComplete="current-password"
                value={password}
                onChange={(id, value) => setPassword(value)}
                required
                disabled={isLoading}
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <Checkbox
                  id="remember"
                  label="Manter conectado"
                  checked={remember}
                  onChange={(id, checked) => setRemember(checked)}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  buttonType="ghost"
                  size="small"
                  disabled
                  title="Recuperação de senha indisponível no momento"
                  className="text-primary dark:text-blue-400"
                >
                  Esqueci minha senha
                </Button>
              </div>

              <Button
                type="submit"
                buttonType="primary"
                size="large"
                block
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin className="h-4 w-4" />
                    <span>Entrando...</span>
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faArrowRightToBracket} className="h-4 w-4" />
                    <span>Entrar</span>
                  </>
                )}
              </Button>
            </form>

            <div className="mt-10 border-t border-slate-200 pt-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              SmartNFe — Gestão de NF-e
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
