import { getInstallationToken } from './getToken';
import { config } from '../config/gitConfig';

export const deleteRepo = async (repoName: string): Promise<{ message: string }> => {
    const token = await getInstallationToken();

    const res = await fetch(`https://api.github.com/repos/${config.org}/${repoName}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
        },
    });

    if (!res.ok) {
        const error = await res.text();
        throw new Error(`Failed to delete repository: ${res.status} ${error}`);
    }

    return { message: `Repository ${repoName} deleted successfully` };
};