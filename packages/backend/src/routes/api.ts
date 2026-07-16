// Compatibility shim — HTTP is split under modules/<swc>/routes.ts
// Prefer: import { createApiRouter } from '../modules'
export { createApiRouter as default } from '../modules';
