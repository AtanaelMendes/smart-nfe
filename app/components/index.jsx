import Link from 'next/link';

export default function Index() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Bem-vindo ao Meu App
          </h1>
          <p className="text-xl text-gray-600">
            Sua aplicação Next.js está funcionando!
          </p>
          <div className="mt-6 flex justify-center space-x-4">
            <Link 
              href="/login" 
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
            >
              Ir para Login
            </Link>
            <Link 
              href="/dashboard" 
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
            >
              Ver Dashboard
            </Link>
          </div>
        </header>
        
        <main className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                Sobre o Projeto
              </h2>
              <p className="text-gray-600 mb-4">
                Este é um projeto Next.js configurado com Tailwind CSS e convertido para JavaScript.
              </p>
              <ul className="list-disc list-inside text-gray-600">
                <li>Componentes em JavaScript</li>
                <li>Sistema de rotas</li>
                <li>Autenticação simples</li>
                <li>Dashboard funcional</li>
              </ul>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                Páginas Disponíveis
              </h2>
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 rounded border-l-4 border-blue-500">
                  <strong className="text-blue-800">Página de Login</strong>
                  <p className="text-blue-600 text-sm">
                    Acesse em <code className="bg-blue-100 px-1 rounded">/login</code>
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded border-l-4 border-green-500">
                  <strong className="text-green-800">Dashboard</strong>
                  <p className="text-green-600 text-sm">
                    Acesse em <code className="bg-green-100 px-1 rounded">/dashboard</code>
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 text-center">
              Navegar pelo App
            </h2>
            <p className="text-center text-gray-600 mb-4">
              Clique nos botões acima ou use os links de navegação para explorar as funcionalidades.
            </p>
            <div className="text-center text-sm text-gray-500">
              <p><strong>Credenciais de teste:</strong></p>
              <p>Email: <code className="bg-gray-100 px-1 rounded">admin@teste.com</code></p>
              <p>Senha: <code className="bg-gray-100 px-1 rounded">123456</code></p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}