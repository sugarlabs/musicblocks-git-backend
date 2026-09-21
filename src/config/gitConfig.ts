import dotenv from 'dotenv';
import fs from "fs";
import path from 'path';

dotenv.config();

let privateKey = "";
// In production, set GITHUB_APP_PRIVATE_KEY_PATH to wherever the key is mounted
// (e.g. /etc/musicblocks/private-key.pem inside the container).
// Falls back to dist/config/private-key.pem for local dev.
const pemPath =
  process.env.GITHUB_APP_PRIVATE_KEY_PATH ??
  path.resolve(__dirname, 'private-key.pem');
try {
  privateKey = fs.readFileSync(pemPath, "utf-8");
} catch(err) {
  console.warn(`Warning: private-key.pem not found at "${pemPath}". GitHub App auth will fail.`);
}

export const config = {
  appId: process.env.GITHUB_APP_ID,
  org: process.env.ORG_NAME,
  privateKey,
  installationId: process.env.GITHUB_INSTALLATION_ID,
  forkedOrg: process.env.FORKED_ORG_NAME,
  pat: process.env.GITHUB_PAT
};
