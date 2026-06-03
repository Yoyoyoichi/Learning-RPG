# Deployment & Development Rules

## 1. GitHub Pages Deployment Branch Restriction
- **Issue**: GitHub Actions for GitHub Pages deployment (`deploy.yml`) is restricted by the `github-pages` environment. It will **only succeed when pushed to the `main` branch**.
- **Symptom**: If you push to a working branch (e.g., `card-deck-rpg`), the deployment job will instantly fail in 1-2 seconds with no clear error message because the environment rejects the deployment.
- **Solution**: Always merge changes into the `main` branch to trigger a successful deployment to GitHub Pages. Do not expect deployments to work from feature branches.

## 2. ESLint CI Failures
- **Issue**: GitHub Actions runs `npm run lint` (`eslint .`) as part of the build or CI pipeline. If there are any ESLint errors (even minor ones like `no-unused-vars` or formatting parsing errors), the CI will fail and deployment will stop.
- **Symptom**: Code changes are pushed but do not reflect on the live site because the CI pipeline is failing silently in the background.
- **Solution**: **Always run `npm run lint` locally** before committing and pushing. If using automated code replacements, double-check that you haven't introduced syntax errors or unclosed brackets, as this will trigger parsing errors (`'import' and 'export' may only appear at the top level`).

## 3. CSS Specificity and Theming
- **Issue**: Modifying container backgrounds (e.g., `.tilemap`) does not affect the child elements (e.g., `.tile`) if the children have explicit `background-color` set.
- **Solution**: When applying global themes (like `.stealth-theme`), ensure you override the specific child elements with `!important` to guarantee the colors are reflected.
