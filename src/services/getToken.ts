import { generateAppJWT } from "../utils/generateJwt"
import { config } from "../config/gitConfig";

export const getInstallationToken = async (): Promise<string> => {
    const jwt = generateAppJWT();
    const res = await fetch(`https://api.github.com/app/installations/${config.installationId}/access_tokens`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${jwt}`,
            Accept: 'application/vnd.github+json',
        },
    });
    if (!res.ok) {
        const error = await res.text();
        throw new Error(`Failed to get Installation Access Token: ${res.status} ${error}`);
    }
    const data = await res.json();
    if (!data.token) {
        throw new Error(`Installation token not found in response`);
    }
    return data.token;
}
