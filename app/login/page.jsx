'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import Button from '@/components/buttons/Button';
import InputEmail from '@/components/inputs/InputEmail';
import InputPassword from '@/components/inputs/InputPassword';
import Checkbox from '@/components/inputs/Checkbox';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleFieldChange = (field) => (id, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRememberMeChange = (id, checked) => {
    setFormData(prev => ({
      ...prev,
      rememberMe: checked
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Simulação de autenticação (substitua pela sua lógica real)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (formData.email === 'admin@teste.com' && formData.password === '123456') {
        // Salvar token ou estado de autenticação aqui
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('user', JSON.stringify({ email: formData.email }));
        router.push('/dashboard');
      } else {
        setError('Email ou senha inválidos');
      }
    } catch (err) {
      setError('Erro ao fazer login. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Entre na sua conta
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Ou{' '}
            <Link href="/" className="font-medium text-indigo-600 hover:text-indigo-500">
              volte para a página inicial
            </Link>
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow-xl rounded-lg">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <InputEmail
                id="email"
                name="email"
                label="Endereço de email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={handleFieldChange('email')}
              />
            </div>

            <div>
              <InputPassword
                id="password"
                label="Senha"
                value={formData.password}
                onChange={handleFieldChange('password')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Checkbox
                  id="rememberMe"
                  label="Lembrar de mim"
                  checked={formData.rememberMe}
                  onChange={handleRememberMeChange}
                />
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">
                  Esqueceu sua senha?
                </a>
              </div>
            </div>

            <div>
              <Button
                type="submit"
                buttonType="primary"
                block
                disabled={isLoading}
                className="flex justify-center items-center"
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Dados para teste</span>
              </div>
            </div>
            <div className="mt-2 text-center text-sm text-gray-600">
              <p><strong>Email:</strong> admin@teste.com</p>
              <p><strong>Senha:</strong> 123456</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}