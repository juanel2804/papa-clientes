export function toast(message, type = "success") {
  const host = getToastHost();
  const item = document.createElement("div");
  item.className = `toast ${type}`;
  item.textContent = message;
  host.appendChild(item);

  window.setTimeout(() => {
    item.classList.add("leaving");
    window.setTimeout(() => item.remove(), 240);
  }, 2600);
}

export function confirmDialog({
  title = "Confirmar accion",
  message = "Deseas continuar?",
  confirmText = "Si, continuar",
  cancelText = "Cancelar",
  danger = false,
} = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <section class="dialog-box" role="dialog" aria-modal="true">
        <h3>${title}</h3>
        <p>${message}</p>
        <div class="dialog-actions">
          <button class="ghost" data-cancel type="button">${cancelText}</button>
          <button class="${danger ? "danger" : "primary"}" data-confirm type="button">${confirmText}</button>
        </div>
      </section>
    `;

    const close = (result) => {
      overlay.remove();
      resolve(result);
    };

    overlay.querySelector("[data-cancel]").addEventListener("click", () => close(false));
    overlay.querySelector("[data-confirm]").addEventListener("click", () => close(true));
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close(false);
    });
    document.addEventListener("keydown", function onKey(event) {
      if (event.key !== "Escape") return;
      document.removeEventListener("keydown", onKey);
      close(false);
    });

    document.body.appendChild(overlay);
  });
}

export function openModal(html, onReady) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = html;

  const close = () => overlay.remove();
  overlay.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", close);
  });
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  document.addEventListener("keydown", function onKey(event) {
    if (event.key !== "Escape") return;
    document.removeEventListener("keydown", onKey);
    close();
  });

  document.body.appendChild(overlay);
  onReady?.(overlay, close);
  return close;
}

function getToastHost() {
  let host = document.querySelector("#toastHost");
  if (!host) {
    host = document.createElement("div");
    host.id = "toastHost";
    host.className = "toast-host";
    document.body.appendChild(host);
  }
  return host;
}
