// The session lives in an httpOnly cookie, which fetch only sends when asked.
export default defineNuxtPlugin(() => {
  useGqlCors({ mode: 'cors', credentials: 'include' });
});
