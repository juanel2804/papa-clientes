import { state } from "./app.js";
import { renderLogin } from "./views/login.js";

function start() {

  if (!state.token) {
    renderLogin();
    return;
  }

  document.querySelector("#app").innerHTML = `
    <div style="
      padding:40px;
      color:white;
      font-size:30px;
      text-align:center;
    ">
      🚀 Login correcto
    </div>
  `;
}

start();