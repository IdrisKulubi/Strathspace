# GitHub Actions Workflows

This directory contains GitHub Actions workflows for automating CI/CD processes for the demo-site project.

## Workflows

### 1. Run Tests (`tests.yml`)

This workflow runs on every push to any branch and on pull requests to the main branch. It:
- Sets up the Node.js environment with pnpm
- Installs dependencies
- Runs ESLint checks
- Performs TypeScript type checking

### 2. Auto Deploy and Merge (`auto-deploy-merge.yml`)

This workflow runs on pushes to any branch except main. It:
- Sets up the Node.js environment with pnpm
- Installs dependencies
- Runs ESLint checks
- Performs TypeScript type checking
- Deploys to Vercel's preview environment
- Creates a pull request to merge the branch into main
- Enables auto-merge for the pull request that was made

## Required Secrets

To use these workflows, you need to set up the following secrets in your GitHub repository:

- `VERCEL_TOKEN`: An API token from Vercel
- `VERCEL_ORG_ID`: Your Vercel organization ID
- `VERCEL_PROJECT_ID`: Your Vercel project ID get it from the project settings 

## How It Works

1. When you push to a feature branch, the `auto-deploy-merge.yml` workflow will run.
2. If all tests pass and the deployment succeeds, it will create a PR to merge your branch into main.
3. The PR will be set to auto-merge once all required checks pass.

