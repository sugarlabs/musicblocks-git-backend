import express from 'express';
import rateLimit from 'express-rate-limit';
import { handleCreateProject } from '../controllers/createProject';
import { verifyOwner } from '../middleware/verifyOwner';
import { handleEditProject } from '../controllers/editProject';
import { handleForkProject } from '../controllers/forkProject';
import { handleCreatePR } from '../controllers/pullRequest';
import { handleGetOpenPullRequests } from '../controllers/getPullRequest';
import { handleForkWithHistory } from '../controllers/forkWithHistory';
import { handleGetCommits } from '../controllers/getCommits';
import { handleGetProjectDataWithCommit } from '../controllers/getProjectDataWithCommit';
import { handleGetProjectData } from '../controllers/getProjectData';
import { handleGetProjects } from '../controllers/getProjects';
import { handleCreateBranch } from '../controllers/createBranch';
import { handleSearchProjects } from '../controllers/searchProjects';
import { handleGetProjectDetails } from '../controllers/getProjectDetails';
import { handleGetLikeCount, handleLikeProject } from '../controllers/likeProject';
import { handleGetThumbnail } from '../controllers/getThumbnail';
import { handleDownloadProject } from '../controllers/downloadProject';
import { handlePublishProject } from '../controllers/publishProject';
import { handleReportProject } from '../controllers/reportProject';

import { handleDeleteProject } from '../controllers/deleteProject';
import { handleSearchProjects } from '../controllers/searchProjects';
import { handleMigratePlanet } from '../controllers/migratePlanet';
import { handleGetTutorials } from '../controllers/getTutorials';
import { handleCompareProjects } from '../controllers/compareProjects';

const projectRouter = express.Router();

// ── Rate limiters ─────────────────────────────────────────────────────────────
// Publish: max 10 per IP per hour to prevent scripted mass-publishing.
const publishLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,   // 1 hour
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many publish requests from this IP. Limit: 10 per hour.' },
});

// Report: max 5 per IP per hour to prevent issue-flood attacks on mb-moderation repo.
const reportLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,   // 1 hour
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many report requests from this IP. Limit: 5 per hour.' },
});

// ── Routes ────────────────────────────────────────────────────────────────────
projectRouter.post('/create', handleCreateProject);
projectRouter.post('/fork', handleForkProject);
projectRouter.post('/forkHistory', handleForkWithHistory);
projectRouter.put('/edit', verifyOwner, handleEditProject);
projectRouter.post('/create-pr', handleCreatePR);
projectRouter.get('/openPR', handleGetOpenPullRequests);
projectRouter.get('/commitHistory', handleGetCommits);
projectRouter.get('/getProjectDataAtCommit', handleGetProjectDataWithCommit);
projectRouter.get('/getProjectData', handleGetProjectData);
projectRouter.get('/allRepos', handleGetProjects);
projectRouter.get('/search', handleSearchProjects);
projectRouter.get('/project/:repoName', handleGetProjectDetails);
projectRouter.post('/like', handleLikeProject);
projectRouter.get('/likes/:repoName', handleGetLikeCount);
projectRouter.post('/createBranch', handleCreateBranch);

projectRouter.delete('/delete', verifyOwner, handleDeleteProject);
projectRouter.get('/search', handleSearchProjects);
projectRouter.post('/migrate-planet', handleMigratePlanet);
projectRouter.get('/tutorials', handleGetTutorials);
projectRouter.get('/compare', handleCompareProjects);
projectRouter.get('/thumbnail/:repoName', handleGetThumbnail);
projectRouter.get('/download/:repoName', handleDownloadProject);
projectRouter.post('/publish', publishLimiter, verifyOwner, handlePublishProject);
projectRouter.post('/report', reportLimiter, handleReportProject);

export default projectRouter;
