export const environment = {
  /** API root. The dev server proxies `/api` to the NestJS backend (see proxy.conf.json). */
  apiUrl: '/api',
  /** Where the face-api models are served from (copied from node_modules at build time). */
  faceModelsUrl: 'models/face-api',
};
