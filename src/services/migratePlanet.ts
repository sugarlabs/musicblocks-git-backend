import { createRepo } from './createRepo';
import { generateKey, hashKey, createMetaData } from '../utils/hash';
import { getRepoName } from '../utils/getRepoName';

export const migratePlanetProject = async (
  planetProjectUrl: string,
  repoName?: string,
  description?: string
) => {
  // Fetch project data from Planet
  const response = await fetch(planetProjectUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch Planet project: ${response.status}`);
  }

  const projectData = await response.json();

  // Generate key exactly like createProject does
  const key = generateKey();
  const hashedKey = hashKey(key);
  const metadata = createMetaData(hashedKey, 'migrated');

  const name = repoName
    ? repoName.replace(/ /g, '_')
    : `migrated-planet-${Date.now()}`;

  const repoUrl = await createRepo(
    name,
    projectData,
    metadata,
    description || 'Migrated from Planet',
    'migrated'
  );

  const repository = getRepoName(repoUrl);

  return {
    success: true,
    key,
    repository,
    migratedFrom: planetProjectUrl,
  };
};