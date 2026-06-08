import { state } from "./app.js";

import {
  renderLogin
} from "./views/login.js";

import {
  renderDashboard
} from "./views/dashboard.js";

function start() {

  if (!state.token) {
    renderLogin();
    return;
  }

  renderDashboard();
}

start();