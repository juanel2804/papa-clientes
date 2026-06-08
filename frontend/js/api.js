const config = window.APP_CONFIG || {};
const apiBase = (config.API_BASE_URL || "").replace(/\/$/, "");

export async function api(path, options = {}) {

  const token =
    localStorage.getItem("clientes_token") || "";

  const response = await fetch(
    `${apiBase}${path}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token
          ? {
              Authorization:
                `Bearer ${token}`
            }
          : {}),
        ...(options.headers || {}),
      },
    }
  );

  const data =
    await response.json()
    .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error ||
      "Error del servidor"
    );
  }

  return data;
}