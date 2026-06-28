import { generateAppJWT } from "../utils/generateJwt"
import { config } from "../config/gitConfig";

/**
 * Fetches a short-lived GitHub App Installation Access Token.
 *
 * The JWT is signed server-side with the App's private key and exchanged for
 * an installation token that grants org-level API access (15 k req/hr).
 * This token is valid for 1 hour; callers should obtain a fresh one per
 * request — the overhead is negligible compared to the GitHub API call that
 * follows.
 *
 * @throws If the GitHub API call fails or the response contains no token.
 */
export const getInstallationToken = async (): Promise<string> => {
    const jwt = generateAppJWT();
    const res = await fetch(`https://api.github.com/app/installations/${config.installationId}/access_tokens`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${jwt}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
        },
    });
    if (!res.ok) {
        // res.text() is async — must be awaited so the error message is useful.
        const body = await res.text();
        throw new Error(`Failed to get Installation Access Token: ${res.status} ${body}`);
    }
    const data = await res.json();
    if (!data.token) {
        throw new Error(`Installation token not found in response`);
    }
    return data.token;
}
