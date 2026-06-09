window.APP_CONFIG = {
  API_BASE_URL:
    ["", "localhost", "127.0.0.1"].includes(window.location.hostname)
      ? "http://localhost:4000"
      : "https://papa-clientes.onrender.com",
};
