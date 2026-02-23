# Workflows

**Publish to npm** (`publish.yml`) – Single workflow that uses [Turborepo](https://turbo.build/repo) to build and publish only packages with changes since the last commit. Trigger manually (Actions → Run workflow) or when a release is published.

**Secrets:** Configure `NPM_TOKEN` in the repository settings (Settings → Secrets and variables → Actions).

**First-time setup:** From the repo root run `npm install`, then commit `package-lock.json`. You can then switch the workflow to `npm ci` for faster, reproducible installs.
