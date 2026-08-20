const API_BASE_URL = "http://localhost:8000";

const api = {
  get: async (endpoint) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);

    if (!response.ok) {
      throw new Error(`GET ${endpoint} failed: ${response.status}`);
    }

    return response.json();
  },

  post: async (endpoint, body, isFormData = false) => {
    const options = {
      method: "POST",
    };

    if (isFormData) {
      // For file uploads, send FormData directly.
      // Do NOT set Content-Type manually.
      options.body = body;
    } else {
      options.headers = {
        "Content-Type": "application/json",
      };

      options.body = JSON.stringify(body);
    }

    const response = await fetch(
      `${API_BASE_URL}${endpoint}`,
      options
    );

    if (!response.ok) {
      throw new Error(
        `POST ${endpoint} failed: ${response.status}`
      );
    }

    return response.json();
  },
};

export default api;