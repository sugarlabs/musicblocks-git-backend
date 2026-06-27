import crypto from 'crypto';

export const generateKey = (): string => {
    return crypto.randomBytes(32).toString('hex');
}

export const hashKey = (key: string): string => {
    return crypto.createHash('sha256').update(key).digest('hex');
}

export const createMetaData = (
    hash: string, 
    theme: string, 
    projectName?: string, 
    creatorName?: string
) => {
    const date = new Date().toISOString();
    return {
        projectName: projectName || "",
        createdAt: date,
        updatedAt: date,
        theme: theme || "default",
        originalCreator: creatorName || "anonymous",
        isMigrated: false,
        isMusicBlocks: true,
        hashedKey: hash
    }
}

