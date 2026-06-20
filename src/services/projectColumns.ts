// hashedKey is intentionally excluded (secret).
// searchKeywords is intentionally excluded — it is an internal indexing field
// used by the FTS5 table only and should not be leaked to API consumers.
export const PUBLIC_PROJECT_COLUMNS = `
    repoName,
    projectName,
    planetId,
    description,
    theme,
    creatorName,
    createdAt,
    updatedAt,
    likes,
    downloads,
    hasThumbnail,
    isMigrated,
    visible,
    isMusicBlocks
`;
