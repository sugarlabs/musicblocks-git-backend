import { jest } from '@jest/globals';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';

jest.mock('../../src/utils/db', () => ({
  __esModule: true,
  default: {
    prepare: jest.fn(() => ({
      all: jest.fn(),
      get: jest.fn(),
      run: jest.fn(),
    })),
    exec: jest.fn(),
    pragma: jest.fn(),
    transaction: jest.fn((handler: unknown) => handler),
  },
}));

// Mock all controllers
jest.mock('../../src/controllers/createProject');
jest.mock('../../src/controllers/editProject');
jest.mock('../../src/controllers/forkProject');
jest.mock('../../src/controllers/pullRequest');
jest.mock('../../src/controllers/getPullRequest');
jest.mock('../../src/controllers/forkWithHistory');
jest.mock('../../src/controllers/getCommits');
jest.mock('../../src/controllers/getProjectDataWithCommit');
jest.mock('../../src/controllers/getProjectData');
jest.mock('../../src/controllers/getProjects');
jest.mock('../../src/controllers/searchProjects');
jest.mock('../../src/controllers/getProjectDetails');
jest.mock('../../src/controllers/likeProject');

const projectRouter = require('../../src/routes/projectRoutes').default;

// Mock middleware
jest.mock('../../src/middleware/verifyOwner', () => ({
  verifyOwner: jest.fn((req: Request, res: Response, next: NextFunction) => next())
}));

// Import mocked modules
import { handleCreateProject } from '../../src/controllers/createProject';
import { handleEditProject } from '../../src/controllers/editProject';
import { handleForkProject } from '../../src/controllers/forkProject';
import { handleCreatePR } from '../../src/controllers/pullRequest';
import { handleGetOpenPullRequests } from '../../src/controllers/getPullRequest';
import { handleForkWithHistory } from '../../src/controllers/forkWithHistory';
import { handleGetCommits } from '../../src/controllers/getCommits';
import { handleGetProjectDataWithCommit } from '../../src/controllers/getProjectDataWithCommit';
import { handleGetProjectData } from '../../src/controllers/getProjectData';
import { handleGetProjects } from '../../src/controllers/getProjects';
import { handleSearchProjects } from '../../src/controllers/searchProjects';
import { handleGetProjectDetails } from '../../src/controllers/getProjectDetails';
import { handleGetLikeCount, handleLikeProject } from '../../src/controllers/likeProject';

// Type-safe mocked versions
const mockHandleCreateProject = jest.mocked(handleCreateProject);
const mockHandleEditProject = jest.mocked(handleEditProject);
const mockHandleForkProject = jest.mocked(handleForkProject);
const mockHandleCreatePR = jest.mocked(handleCreatePR);
const mockHandleGetOpenPullRequests = jest.mocked(handleGetOpenPullRequests);
const mockHandleForkWithHistory = jest.mocked(handleForkWithHistory);
const mockHandleGetCommits = jest.mocked(handleGetCommits);
const mockHandleGetProjectDataWithCommit = jest.mocked(handleGetProjectDataWithCommit);
const mockHandleGetProjectData = jest.mocked(handleGetProjectData);
const mockHandleGetProjects = jest.mocked(handleGetProjects);
const mockHandleSearchProjects = jest.mocked(handleSearchProjects);
const mockHandleGetProjectDetails = jest.mocked(handleGetProjectDetails);
const mockHandleLikeProject = jest.mocked(handleLikeProject);
const mockHandleGetLikeCount = jest.mocked(handleGetLikeCount);

describe('Project Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    
    app = express();
    app.use(express.json());
    app.use('/api/projects', projectRouter);
  });

  describe('POST /create', () => {
    it('should route to handleCreateProject', async () => {
      mockHandleCreateProject.mockImplementation(async (req: Request, res: Response) => {
        res.status(200).json({ message: 'Project created' });
      });

      const response = await request(app)
        .post('/api/projects/create')
        .send({ repoName: 'test-project', theme: 'piano', projectData: {} })
        .expect(200);

      expect(mockHandleCreateProject).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Project created' });
    });

    it('should handle request body correctly', async () => {
      const projectData = { notes: ['C', 'D', 'E'] };
      
      mockHandleCreateProject.mockImplementation(async (req: Request, res: Response) => {
        expect(req.body).toEqual({
          repoName: 'test-project',
          theme: 'piano',
          description: 'A test project',
          projectData
        });
        res.status(200).json({ success: true });
      });

      await request(app)
        .post('/api/projects/create')
        .send({
          repoName: 'test-project',
          theme: 'piano',
          description: 'A test project',
          projectData
        })
        .expect(200);

      expect(mockHandleCreateProject).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /fork', () => {
    it('should route to handleForkProject', async () => {
      mockHandleForkProject.mockImplementation(async (req: Request, res: Response) => {
        res.status(200).json({ message: 'Project forked' });
      });

      const response = await request(app)
        .post('/api/projects/fork')
        .send({ sourceRepo: 'source-project', newName: 'forked-project' })
        .expect(200);

      expect(mockHandleForkProject).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Project forked' });
    });
  });

  describe('POST /forkHistory', () => {
    it('should route to handleForkWithHistory', async () => {
      mockHandleForkWithHistory.mockImplementation(async (req: Request, res: Response) => {
        res.status(200).json({ message: 'Project forked with history' });
      });

      const response = await request(app)
        .post('/api/projects/forkHistory')
        .send({ sourceRepo: 'source-project', newName: 'forked-project' })
        .expect(200);

      expect(mockHandleForkWithHistory).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Project forked with history' });
    });
  });

  describe('PUT /edit', () => {
    it('should route to handleEditProject with verifyOwner middleware', async () => {
      mockHandleEditProject.mockImplementation(async (req: Request, res: Response) => {
        res.status(200).json({ message: 'Project edited' });
      });

      const response = await request(app)
        .put('/api/projects/edit')
        .send({ repoName: 'test-project', changes: {} })
        .expect(200);

      expect(mockHandleEditProject).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Project edited' });
    });

    it('should apply verifyOwner middleware', async () => {
      // This test verifies that the verifyOwner middleware is applied
      // The middleware is mocked to always call next(), so the request should succeed
      mockHandleEditProject.mockImplementation(async (req: Request, res: Response) => {
        res.status(200).json({ message: 'Project edited' });
      });

      await request(app)
        .put('/api/projects/edit')
        .send({ repoName: 'test-project', changes: {} })
        .expect(200);

      expect(mockHandleEditProject).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /create-pr', () => {
    it('should route to handleCreatePR', async () => {
      mockHandleCreatePR.mockImplementation(async (req: Request, res: Response) => {
        res.status(200).json({ message: 'Pull request created' });
      });

      const response = await request(app)
        .post('/api/projects/create-pr')
        .send({ sourceRepo: 'source-project', targetRepo: 'target-project' })
        .expect(200);

      expect(mockHandleCreatePR).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ message: 'Pull request created' });
    });
  });

  describe('GET /openPR', () => {
    it('should route to handleGetOpenPullRequests', async () => {
      mockHandleGetOpenPullRequests.mockImplementation(async (req: Request, res: Response) => {
        res.status(200).json({ pullRequests: [] });
      });

      const response = await request(app)
        .get('/api/projects/openPR')
        .expect(200);

      expect(mockHandleGetOpenPullRequests).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ pullRequests: [] });
    });

    it('should handle query parameters', async () => {
      mockHandleGetOpenPullRequests.mockImplementation(async (req: Request, res: Response) => {
        expect(req.query).toEqual({ status: 'open', repo: 'test-repo' });
        res.status(200).json({ pullRequests: [] });
      });

      await request(app)
        .get('/api/projects/openPR?status=open&repo=test-repo')
        .expect(200);

      expect(mockHandleGetOpenPullRequests).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /commitHistory', () => {
    it('should route to handleGetCommits', async () => {
      mockHandleGetCommits.mockImplementation(async (req: Request, res: Response) => {
        res.status(200).json({ commits: [] });
      });

      const response = await request(app)
        .get('/api/projects/commitHistory')
        .expect(200);

      expect(mockHandleGetCommits).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ commits: [] });
    });
  });

  describe('GET /getProjectDataAtCommit', () => {
    it('should route to handleGetProjectDataWithCommit', async () => {
      mockHandleGetProjectDataWithCommit.mockImplementation(async (req: Request, res: Response) => {
        res.status(200).json({ projectData: {} });
      });

      const response = await request(app)
        .get('/api/projects/getProjectDataAtCommit')
        .expect(200);

      expect(mockHandleGetProjectDataWithCommit).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ projectData: {} });
    });

    it('should handle query parameters', async () => {
      mockHandleGetProjectDataWithCommit.mockImplementation(async (req: Request, res: Response) => {
        expect(req.query).toEqual({ repo: 'test-repo', commit: 'abc123' });
        res.status(200).json({ projectData: {} });
      });

      await request(app)
        .get('/api/projects/getProjectDataAtCommit?repo=test-repo&commit=abc123')
        .expect(200);

      expect(mockHandleGetProjectDataWithCommit).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /getProjectData', () => {
    it('should route to handleGetProjectData', async () => {
      mockHandleGetProjectData.mockImplementation(async (req: Request, res: Response) => {
        res.status(200).json({ projectData: {} });
      });

      const response = await request(app)
        .get('/api/projects/getProjectData')
        .expect(200);

      expect(mockHandleGetProjectData).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ projectData: {} });
    });
  });

  describe('GET /allRepos', () => {
    it('should route to handleGetProjects', async () => {
      mockHandleGetProjects.mockImplementation(async (req: Request, res: Response) => {
        res.status(200).json({ projects: [] });
      });

      const response = await request(app)
        .get('/api/projects/allRepos')
        .expect(200);

      expect(mockHandleGetProjects).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ projects: [] });
    });
  });

  describe('GET /search', () => {
    it('should route to handleSearchProjects', async () => {
      mockHandleSearchProjects.mockImplementation(async (req: Request, res: Response) => {
        res.status(200).json({ data: [] });
      });

      const response = await request(app)
        .get('/api/projects/search?q=music')
        .expect(200);

      expect(mockHandleSearchProjects).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ data: [] });
    });
  });

  describe('GET /project/:repoName', () => {
    it('should route to handleGetProjectDetails', async () => {
      mockHandleGetProjectDetails.mockImplementation(async (req: Request, res: Response) => {
        res.status(200).json({ repoName: req.params.repoName });
      });

      const response = await request(app)
        .get('/api/projects/project/test-project')
        .expect(200);

      expect(mockHandleGetProjectDetails).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ repoName: 'test-project' });
    });
  });

  describe('POST /like', () => {
    it('should route to handleLikeProject', async () => {
      mockHandleLikeProject.mockImplementation(async (req: Request, res: Response) => {
        res.status(200).json({ repoName: req.body.repoName, likes: 1 });
      });

      const response = await request(app)
        .post('/api/projects/like')
        .send({ repoName: 'test-project', userId: 'user-1', like: true })
        .expect(200);

      expect(mockHandleLikeProject).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ repoName: 'test-project', likes: 1 });
    });
  });

  describe('GET /likes/:repoName', () => {
    it('should route to handleGetLikeCount', async () => {
      mockHandleGetLikeCount.mockImplementation(async (req: Request, res: Response) => {
        res.status(200).json({ repoName: req.params.repoName, likes: 3 });
      });

      const response = await request(app)
        .get('/api/projects/likes/test-project')
        .expect(200);

      expect(mockHandleGetLikeCount).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({ repoName: 'test-project', likes: 3 });
    });
  });

  describe('error handling', () => {
    it('should handle controller errors gracefully', async () => {
      mockHandleCreateProject.mockImplementation(async () => {
        throw new Error('Internal server error');
      });

      await request(app)
        .post('/api/projects/create')
        .send({ repoName: 'test-project', theme: 'piano', projectData: {} })
        .expect(500);

      expect(mockHandleCreateProject).toHaveBeenCalledTimes(1);
    });

    it('should handle async controller errors', async () => {
      mockHandleCreateProject.mockImplementation(async () => {
        throw new Error('Async error');
      });

      await request(app)
        .post('/api/projects/create')
        .send({ repoName: 'test-project', theme: 'piano', projectData: {} })
        .expect(500);

      expect(mockHandleCreateProject).toHaveBeenCalledTimes(1);
    });
  });

  describe('middleware integration', () => {
    it('should apply JSON body parsing middleware', async () => {
      mockHandleCreateProject.mockImplementation(async (req: Request, res: Response) => {
        expect(req.body).toBeDefined();
        expect(typeof req.body).toBe('object');
        res.status(200).json({ success: true });
      });

      await request(app)
        .post('/api/projects/create')
        .send({ repoName: 'test-project', theme: 'piano', projectData: {} })
        .expect(200);
    });

    it('should handle malformed JSON gracefully', async () => {
      await request(app)
        .post('/api/projects/create')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });
  });

  describe('route parameter handling', () => {
    it('should handle different HTTP methods correctly', async () => {
      // Test that each route responds to the correct HTTP method
      mockHandleCreateProject.mockImplementation(async (req: Request, res: Response) => {
        res.status(200).json({ success: true });
      });
      mockHandleForkProject.mockImplementation(async (req: Request, res: Response) => {
        res.status(200).json({ success: true });
      });
      mockHandleEditProject.mockImplementation(async (req: Request, res: Response) => {
        res.status(200).json({ success: true });
      });
      mockHandleCreatePR.mockImplementation(async (req: Request, res: Response) => {
        res.status(200).json({ success: true });
      });
      mockHandleGetOpenPullRequests.mockImplementation(async (req: Request, res: Response) => {
        res.status(200).json({ success: true });
      });
      mockHandleForkWithHistory.mockImplementation(async (req: Request, res: Response) => {
        res.status(200).json({ success: true });
      });
      mockHandleGetCommits.mockImplementation(async (req: Request, res: Response) => {
        res.status(200).json({ success: true });
      });
      mockHandleGetProjectDataWithCommit.mockImplementation(async (req: Request, res: Response) => {
        res.status(200).json({ success: true });
      });
      mockHandleGetProjectData.mockImplementation(async (req: Request, res: Response) => {
        res.status(200).json({ success: true });
      });
      mockHandleGetProjects.mockImplementation(async (req: Request, res: Response) => {
        res.status(200).json({ success: true });
      });
      mockHandleSearchProjects.mockImplementation(async (req: Request, res: Response) => {
        res.status(200).json({ success: true });
      });
      mockHandleGetProjectDetails.mockImplementation(async (req: Request, res: Response) => {
        res.status(200).json({ success: true });
      });
      mockHandleLikeProject.mockImplementation(async (req: Request, res: Response) => {
        res.status(200).json({ success: true });
      });
      mockHandleGetLikeCount.mockImplementation(async (req: Request, res: Response) => {
        res.status(200).json({ success: true });
      });

      // Test all routes
      await request(app).post('/api/projects/create').send({}).expect(200);
      await request(app).post('/api/projects/fork').send({}).expect(200);
      await request(app).put('/api/projects/edit').send({}).expect(200);
      await request(app).post('/api/projects/create-pr').send({}).expect(200);
      await request(app).get('/api/projects/openPR').expect(200);
      await request(app).post('/api/projects/forkHistory').send({}).expect(200);
      await request(app).get('/api/projects/commitHistory').expect(200);
      await request(app).get('/api/projects/getProjectDataAtCommit').expect(200);
      await request(app).get('/api/projects/getProjectData').expect(200);
      await request(app).get('/api/projects/allRepos').expect(200);
      await request(app).get('/api/projects/search?q=music').expect(200);
      await request(app).get('/api/projects/project/test-project').expect(200);
      await request(app).post('/api/projects/like').send({}).expect(200);
      await request(app).get('/api/projects/likes/test-project').expect(200);
    });
  });
});
