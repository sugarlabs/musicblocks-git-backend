import express from 'express';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// __dirname resolves to dist/ at runtime (after tsc).
// The build script copies src/openapi.yaml → dist/openapi.yaml so this works
// in Docker and in any compiled deployment. process.cwd()+'src/' only works
// in ts-node local dev mode.
const swaggerFilePath = path.resolve(__dirname, 'openapi.yaml');

if (!fs.existsSync(swaggerFilePath)) {
  throw new Error(`Swagger file not found at ${swaggerFilePath}`);
}


export const setupSwagger = (app: express.Express) => {
  const swaggerDocument = yaml.load(fs.readFileSync(swaggerFilePath, 'utf8'));
  if (!swaggerDocument) {
    console.log("no swagger document");
    return;
  }
  console.log('Setting up Swagger UI...');
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
};

