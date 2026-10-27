export const environment = {
  /** API root. Production builds call the NestJS backend on Render directly (CORS is allowed via CORS_ORIGIN). */
  apiUrl: 'https://smit-final-hackathon-backend-6k54.onrender.com/api',
  /** Where the face-api models are served from (copied from node_modules at build time). */
  faceModelsUrl: 'models/face-api',
};
