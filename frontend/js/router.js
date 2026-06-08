import { state } from "./app.js";

export function setView(view){

  state.view = view;

  document.dispatchEvent(
    new CustomEvent(
      "view-change",
      {
        detail:view
      }
    )
  );
}