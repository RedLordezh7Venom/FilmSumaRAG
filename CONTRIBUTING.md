# Contributing to FilmSumaRAG

Thanks for your interest in contributing! This document explains how to clone and build the project, the coding style we follow, and the steps to submit a pull request so your changes can be reviewed and merged quickly.

Table of contents
- Prerequisites
- Clone the repository
- Install dependencies & build
- Run the project & run tests
- Coding style and linters
- Writing good commits
- Branching & pull request process
- PR checklist
- Reporting issues & asking for help
- Contributor agreement / IP & license notes

---

## Prerequisites
- Node.js LTS (recommended >= 18)
- A package manager: npm, yarn, or pnpm
- Python 3.8+ (used by tooling or small scripts; 3.10+ recommended)
- Git

Optional but recommended:
- VS Code (or your preferred editor) with ESLint/Prettier plugins
- A terminal with Unix-like tools (macOS, Linux, WSL on Windows)

---

## Clone the repository
Fork the repository (if you plan to submit changes via a fork) or clone directly if you have push permission.

Clone:
git clone https://github.com/RedLordezh7Venom/FilmSumaRAG.git
cd FilmSumaRAG

If you use a fork, set the upstream remote:
git remote add upstream https://github.com/RedLordezh7Venom/FilmSumaRAG.git

Fetch and keep your fork up to date:
git fetch upstream
git checkout main
git merge upstream/main

---

## Install dependencies & build
The repo is primarily TypeScript with some Python tooling. Check package.json for exact scripts.

Install JS dependencies (choose one):
- npm:
  npm install
- pnpm:
  pnpm install
- yarn:
  yarn install

If there are Python requirements:
python -m venv .venv
source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements.txt

Build (if applicable — check package.json scripts):
- npm run build
- or: pnpm build
- or: yarn build

Start the dev server (if available):
- npm run dev
- or: pnpm dev
- or: yarn dev

If no script exists, check the README or package.json to find the correct commands.

---

## Run tests & linters
Run tests (if present):
- npm test
- or: pnpm test
- or: yarn test

Run linter/formatter:
- ESLint:
  npx eslint . --ext .ts,.tsx --fix
- Prettier:
  npx prettier --write .

Python formatting/lint:
- black .
- isort .
- flake8 .

If the repo includes GitHub Actions or npm scripts for linting/tests, prefer those scripts (e.g., npm run lint, npm run test).

---

## Coding style guidelines

General
- Keep changes small and focused. Small PRs are reviewed faster.
- Add tests for new features or bug fixes where reasonable.
- Use meaningful commit messages and PR titles.
- Keep accessibility and internationalization in mind for UI changes.

TypeScript (primary language)
- Follow the repo ESLint and tsconfig rules. If ESLint/Prettier configs exist, use them.
- Prefer explicit types for exported functions; avoid unsafe `any`.
- Use async/await for async code; handle errors explicitly.
- Keep modules small and single-purpose.
- Exported APIs should be stable and documented with comments or README updates.

Python
- Follow PEP8 conventions.
- Use type hints where practical.
- Format with black and sort imports with isort.

CSS
- Keep selectors specific and avoid global side effects.
- Prefer CSS modules or scoped styles if used in the project.
- Respect existing naming conventions (BEM-style or project-specific).

Formatting & automated tools
- Run Prettier and ESLint autofix before committing.
- If the repo uses Husky/pre-commit hooks, install them and follow them.

Line length & other minor rules
- Prefer a 100-character soft limit if not enforced by config.
- Use LF line endings.
- Keep whitespace and indentation consistent with repo settings.

---

## Writing good commits
- Use the Conventional Commits style when possible:
  - [feat]: add a new feature
  - [fix]: bug fix
  - [docs]: documentation only changes
  - [style]: formatting, missing semi-colons, etc
  - [refactor]: code change that neither fixes a bug nor adds a feature
  - [test]: adding missing tests
  - [chore]: changes to the build process or auxiliary tools
- Example:
  feat(api): return extended metadata for summarizer

- Keep each commit focused and include tests when applicable.
- Squash related small fixup commits before creating a PR (or ask the maintainer whether they prefer squash merges).

---

## Branching & pull request process

Recommended branch workflow:
1. Update your local main and create a branch:
   git checkout main
   git pull upstream main   # or `origin` if you push directly
   git checkout -b feature/short-description

2. Make small, focused commits. Run linters/tests locally.

3. Push to your fork or origin:
   git push -u origin feature/short-description

4. Open a pull request against `main` in this repository.

How to prepare the PR:
- Title: concise, follows commit/subject format (e.g., "feat: improve summary ranking")
- Description:
  - Brief summary of what changed and why.
  - Link to any related issue (e.g., closes #123).
  - Notes about migration, performance, or compatibility if relevant.
  - Screenshots or GIFs for UI changes.
- Add reviewers or mention maintainers if appropriate.
- Set the PR to draft if it's a work in progress.

Branch naming suggestions:
- feature/short-desc
- fix/short-desc
- docs/short-desc
- chore/short-desc

---

## PR checklist (please check before requesting review)
- [ ] My code follows the project's coding style.
- [ ] I ran the linting and formatting tools (ESLint / Prettier / black) and fixed issues.
- [ ] I added or updated tests where needed and they pass locally.
- [ ] I updated documentation or README if necessary.
- [ ] The PR description explains the motivation and implementation.
- [ ] I linked any related issues and used "closes #N" when resolving an issue.
- [ ] No sensitive data (keys, passwords) are included in the PR.

Maintainers may request changes; please respond to review comments and update the PR. If requested, rebase your branch onto the latest main or merge main into your branch.

Merging strategy
- Maintainers will handle merging. Common strategies: "Squash and merge" for small features, or "Rebase and merge" when preserving commit history.
- If your PR is large or breaking, include migration notes.

---

## Reporting issues & asking for help
- Open an issue with a clear title and reproduction steps.
- Include:
  - Version or commit SHA
  - Steps to reproduce
  - Expected vs actual behavior
  - Relevant logs, stack traces, or screenshots

If you're unsure how to proceed with a change, open an issue or a draft PR to discuss the approach before investing lots of time.

---

## Contributor agreement / IP & license notes
- This repository is published under the LICENSE file in this repository. By contributing you agree that your contributions will be licensed under the same terms (unless otherwise stated).
- The project may ask contributors to sign a Contributor License Agreement (CLA) or add a DCO sign-off; maintainers will notify if that is required.

---

Thank you for helping improve FilmSumaRAG — contributions of all kinds are welcome. If you'd like help getting started, check open issues labeled `good first issue` or ask in an issue or discussion.
