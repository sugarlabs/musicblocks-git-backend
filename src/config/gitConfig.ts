import dotenv from 'dotenv';
import fs from "fs";
import path from 'path';

dotenv.config();

let privateKey = "";
try {
  privateKey = fs.readFileSync(path.resolve(__dirname,'../../src/config', './private-key.pem'), "utf-8");
} catch(err) {
  console.warn("Warning: private-key.pem not found. GitHub integrations will fail.");
}

export const config = {
  appId: process.env.GITHUB_APP_ID,
  org: process.env.ORG_NAME,
  privateKey,
  installationId: process.env.GITHUB_INSTALLATION_ID,
  forkedOrg: process.env.FORKED_ORG_NAME,
  pat: process.env.GITHUB_PAT
};
