// HTTP client using native fetch API - compatible with axios API
const apiClient = {
  baseURL: `${process.env.NEXT_PUBLIC_API_URL || ''}/`,

  async request(config) {
    const url = `${this.baseURL.replace(/\/$/, '')}${config.url}`;
    const startTime = new Date().getTime();

    try {
      const response = await fetch(url, {
        method: config.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
        body: config.data ? JSON.stringify(config.data) : undefined,
        credentials: 'include',
      });

      const elapsed = new Date().getTime() - startTime;
      
      let data = null;
      const contentType = response.headers.get('content-type');
      
      try {
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }
      } catch {
        data = null;
      }

      // Log slow requests
      if (elapsed > 10000) {
        console.warn('⚠️ O servidor está demorando para responder. Por favor, aguarde.');
      }

      // Handle successful responses
      if (response.ok) {
        return {
          data,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          config,
        };
      }

      // Handle error responses
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }

      const error = new Error(response.statusText);
      error.response = {
        status: response.status,
        statusText: response.statusText,
        data,
        headers: response.headers,
        config,
      };
      error.config = config;
      throw error;
    } catch (error) {
      throw error;
    }
  },

  get(url, config = {}) {
    return this.request({ ...config, method: 'GET', url });
  },

  post(url, data, config = {}) {
    return this.request({ ...config, method: 'POST', url, data });
  },

  put(url, data, config = {}) {
    return this.request({ ...config, method: 'PUT', url, data });
  },

  patch(url, data, config = {}) {
    return this.request({ ...config, method: 'PATCH', url, data });
  },

  delete(url, config = {}) {
    return this.request({ ...config, method: 'DELETE', url });
  },
};

export default apiClient;