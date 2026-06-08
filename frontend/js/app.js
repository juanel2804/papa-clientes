const app = document.querySelector("#app");

const state = {
  token: localStorage.getItem("clientes_token") || "",
  view: "dashboard",
  clients: [],
  dashboard: null,
  payments: [],
  editingClient: null,
  search: "",
  month: new Date().toISOString().slice(0, 7),
  error: "",
};

export { app, state };