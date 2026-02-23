import jwt from "jsonwebtoken";
import { config } from "../config/gitConfig";

export const generateAppJWT = async (): Promise<string> => {
  const payload = {
    iat: Math.floor(Date.now() / 1000) - 60,
    exp: Math.floor(Date.now() / 1000) + 10 * 60,
    iss: config.appId,
  };

  const privateKey = await config.privateKeyPromise;
  return jwt.sign(payload, privateKey, { algorithm: "RS256" });
};