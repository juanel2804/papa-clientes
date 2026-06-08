# Despliegue

## 1. Backend en Render

1. Sube este proyecto a GitHub.
2. En Render, crea una base PostgreSQL.
3. Crea un Web Service conectado al repositorio.
4. Usa estos valores:
   - Root directory: `backend`
   - Build command: `npm install`
   - Start command: `npm start`
5. Configura variables:
   - `DATABASE_URL`: URL interna o externa de Postgres.
   - `DATABASE_SSL`: `true`
   - `FRONTEND_ORIGIN`: URL final de Netlify, por ejemplo `https://clientes-papa.netlify.app`
   - `ADMIN_USER`: usuario para entrar.
   - `ADMIN_PASSWORD`: contrasena para entrar.
   - `JWT_SECRET`: texto largo y dificil de adivinar.
6. Cuando el backend este publicado, ejecuta una vez el comando de seed en Render Shell:

```bash
npm run seed
```

Eso crea las tablas e importa los clientes y pagos del Excel.

## 2. Frontend en Netlify

1. En Netlify, crea un sitio desde el mismo repositorio.
2. Configura:
   - Base directory: `frontend`
   - Publish directory: `frontend`
   - Build command: vacio
3. Cambia `frontend/config.js` para apuntar al backend de Render:

```js
window.APP_CONFIG = {
  API_BASE_URL: "https://tu-api.onrender.com",
};
```

4. Publica el sitio.

## Nota de costo

La app esta separada en frontend estatico y API pequena para poder entrar en planes gratuitos o muy baratos. Render y Netlify cambian sus planes con el tiempo, asi que revisa sus paginas de precios antes de prometer que quedara gratis para siempre.
