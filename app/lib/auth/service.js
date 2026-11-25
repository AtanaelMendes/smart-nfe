import { authenticateMockUser } from './password.js';

/**
 * Serviço de autenticação isolado.
 *
 * A interface abaixo é o único ponto que as rotas consomem. Para migrar para a
 * futura API PHP basta fornecer outra implementação de `authenticate`, mantendo
 * o mesmo contrato de retorno.
 */
export const authService = {
  async authenticate({ username, password }) {
    return authenticateMockUser(username, password);
  },
};
