import { state } from "./app.js";

import {
  renderLogin
} from "./views/login.js";

import {
  renderDashboard
} from "./views/dashboard.js";

async function start() {

  if (!state.token) {
    renderLogin();
    return;
  }

  await renderDashboard();
}

start();