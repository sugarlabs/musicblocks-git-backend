import { Request, Response } from 'express';
import { createRepo } from '../services/createRepo';
import { createMetaData, generateKey, hashKey } from '../utils/hash';
import { getRepoName } from '../utils/getRepoName';

export const handleCreateProject = async (req: Request, res: Response) => {
    console.log("handling create project");
    let { repoName, theme, description } = req.body;
    const { projectData } = req.body;
    if (!repoName || !theme || repoName === '' || theme === '') {
        repoName = (new Date()).toISOString();
        theme = 'default';
    }
    if (!description) {
        description = "Musicblocks project";
    }
    if (!projectData) {
        res.status(400).json({ message: "No project data" });
        return;
    }
    const key = generateKey();
    const hashedKey = hashKey(key);
    const metadata = createMetaData(hashedKey, theme);
    const trimRepoName = repoName.replaceAll(' ', '_');

    try {
        const repoUrl = await createRepo(trimRepoName, projectData, metadata, description, theme);
        const repository = getRepoName(repoUrl);
        res.json({ success: true, key: key, repository });
        return;
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Something went wrong.' });
        return;
    }
};
