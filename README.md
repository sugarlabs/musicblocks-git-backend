# musicblocks-backend

Empowering students with Git through Musicblocks

> **This project is being developed as part of Sugar Labs Google Summer of Code (GSoC) 2025.**

## Overview

**Music Blocks backend** is a Node.js and Express service written in TypeScript. It lets the Music Blocks frontend create, edit, fork, and browse projects that are stored as GitHub repositories. The service automates repository creation, manages metadata, and authenticates using a GitHub App installation. It is developed as a potential replacement to the existing `Planet` server in Musicblocks and introduce students with the concept of Git and version control. 

## Key features

- **Create projects**: New GitHub repository per project with initial files, the project data containing the blocks`s Json and metadata containing information about the project created. 
- **Edit projects**: Safe updates to `projectData.json` with commit messages via a `key`. The key serves as an identity of the users, through which they can edit an existing project. 
- **Fork projects**: Fork with complete commit history, developed as a feature to extend on the work of other students. 
- **Browse data**: List repos, fetch commits, retrieve Project data at any commit

## High level project flow

- **Create new project**
  - Frontend prepares `projectData.json`
  - Sends to `POST /api/github/create`
  - Backend creates repo, writes `projectData.json` and `metaData.json`, returns a one time `key`

- **Edit existing project**
  - Frontend sends `repoName`, `key`, `projectData`, and `commitMessage` to `PUT /api/github/edit`
  - Backend verifies owner by hashing the `key` and comparing with `metaData.json`
  - If valid, backend commits update to `projectData.json`

- **View commits or load older version**
  - Frontend fetches list via `GET /api/github/commitHistory?repoName=...`
  - When a commit is selected, frontend calls `GET /api/github/getProjectDataAtCommit?repoName=...&sha=...`

- **Fork existing project**
  - Fork with history: `POST /api/github/forkHistory` clones and pushes full history, updates `metaData.json`.
  - Only this feature requires a `PAT` (Personal access token).

## Tech stack

- Runtime: Node.js 18+
- Framework: Express 5
- Language: TypeScript
- GitHub SDK: `octokit`
- Testing: Jest and Supertest

## Project structure

```
src/
  config/       GitHub App config and private key
  controllers/  Express route handlers
  middleware/   Request middleware such as owner verification
  routes/       Express routers
  services/     GitHub API integration and business logic
  types/        Shared TypeScript types
  utils/        Helpers for auth, hashing, parsing, topics
dist/           Compiled output
```

## Prerequisites

- Node.js 18 or later
- A GitHub App installed on the target organization
- A GitHub organization that will own project repositories

## Configuration

Create a `.env` file at the repository root. The service reads the following variables:

```env
PORT=3000
GITHUB_APP_ID=your_app_id
GITHUB_INSTALLATION_ID=your_installation_id
ORG_NAME=your_org_name
FORKED_ORG_NAME=optional_other_org_for_forks
GITHUB_PAT=personal_access_token_required_for_forkHistory
```

- Place the GitHub App private key file at `src/config/private-key.pem`.
- `GITHUB_PAT` is required only by the fork with history workflow which pushes via HTTPS.

## Setup and run

Clone this repository (or your fork) and install dependencies:

```bash
git clone https://github.com/sugarlabs/musicblocks-git-backend.git
cd musicblocks-git-backend
npm install
npm run build
npm start


The server listens on `PORT` from `.env` default is `5000` in code if unset.

## API reference

Base path: `/api/github`

### Create project

POST `/create`

Body

```json
{
  "repoName": "my-musicblocks-project",        
  "projectData": { "blocks": [] },            
  "theme": "piano,learning",                  
  "description": "Short description"          
}
```

Notes

- If `repoName` or `theme` is missing the backend falls back to a timestamp name and theme `default`.
- Spaces in `repoName` are converted to underscores.
- `theme` supports a comma separated list. Topics are sanitized to GitHub topic rules.

Success response

```json
{
  "success": true,
  "key": "store_this_client_side",
  "repository": "created-repo-name"
}
```

The `key` is hashed and stored in `metaData.json`. Keep the raw value safely on the client to authorize edits.

### Edit project

PUT `/edit`

Body

```json
{
  "repoName": "created-repo-name",
  "key": "the_key_from_create_or_fork",
  "projectData": { "blocks": [1,2,3] },
  "commitMessage": "Update blocks"
}
```

Behavior

- Middleware verifies owner by hashing `key` and comparing with `metaData.json`.
- On success the service updates `projectData.json` using the provided `commitMessage`.

Success response

```json
{ "message": "Project updated successfully" }
```

Possible errors

- `400 Missing key or RepoName`
- `300 Commit message is required`
- `403 Invalid key, permission denied`

### Fork project

POST `/fork`

Body

```json
{ "repositoryName": "source-repo" }
```

Success response

```json
{
  "repoName": "fork-source-repo-<uuid>",
  "key": "new_key_for_fork",
  "projectData": { },
  "description": "Fork of source-repo"
}
```

### Fork project with history

POST `/forkHistory`

Body

```json
{ "sourceRepo": "source-repo" }
```

Success response

```json
{ "success": true, "repoUrl": "https://github.com/<org>/<new-repo>" }
```

Notes

- Requires `GITHUB_PAT` in `.env` to push the cloned history.

### Create pull request from a fork

POST `/create-pr`

Body

```json
{
  "forkRepo": "forked-repo-name",
  "updatedProjectData": { "blocks": [] }
}
```

Behavior

- Reads `forkedFrom` from `metaData.json` in the fork to identify the base repository.
- Creates a new branch on the base repo and commits `projectData.json` with the provided content.
- Opens a pull request to `main`.

Success response

```json
{ "success": true, "prUrl": "https://github.com/<org>/<repo>/pull/<id>" }
```

### List open pull requests with project data

GET `/openPR`

Body

```json
{ "repo": "target-repo" }
```

Response is an array where each item contains the PR metadata and the parsed `projectData.json` from the PR head branch if available.

### Get commit history

GET `/commitHistory?repoName=<name>`

Returns the commit list from the GitHub API for the repository.

### Get project data at specific commit

GET `/getProjectDataAtCommit?repoName=<name>&sha=<commit_sha>`

Success response

```json
{ "success": true, "projectData": { }, "sha": "<commit_sha>" }
```

### Get latest project data

GET `/getProjectData?repoName=<name>`

Success response

```json
{ "content": { "success": true, "projectData": { } } }
```

### List repositories in the organization

GET `/allRepos?page=<number>`

Returns the GitHub API response for repositories. `per_page` is 50 and results are ordered by creation time descending.

## Metadata files

- `projectData.json` holds the serialized Music Blocks program.
- `metaData.json` holds
  - `createdAt` ISO timestamp
  - `theme` topic string
  - `hashedKey` SHA256 of the client key
  - `forkedFrom` set on forks so that PRs can target the base repo

## Development and testing

- Lint

  ```sh
  npx eslint .
  ```

- Build

  ```sh
  npm run build
  ```

- Test

  ```sh
  npm test
  ```

## Security notes

- Never commit `src/config/private-key.pem`.
- Do not expose the raw `key` values in logs or error messages. Only the hash is stored server side.

## Credits
This repository was made under Google summer of code 2025 program by Nikhil bhatt(https://github.com/Benikk)

## License

Music Blocks Git backend is licensed under the [AGPL](https://www.gnu.org/licenses/agpl-3.0.en.html). It is free to copy and modify. The project does not access or share user data beyond what is required to restore sessions.

**Contributions welcome**. Please open issues or pull requests.
