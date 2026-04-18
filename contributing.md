# Contribution Guidelines

## Pull Requests
- Update PR branch with **rebase** (no merge commits) to maintain a linear history
- Close PR only by merging (this should be the only option enabled anyway)

## Branches
### Names
- Groups:
   - `feat` - New features
   - `fix` - Bug fixes
   - `update` - Updates to packages (e.g. Nix or Node)
   - `docs` - Documentation changes (e.g. readme)

- `<Group>/<Branch Description>`
  - Branch Description shall only contain lower case words separated with `-`
  - Keep it short and descriptive
  - e.g. `feat/map-style`

### Lifetime
- Branches should be short-lived

## Commits
- Should only contain small changes to make them reviewable and trace what changed when

## Changes to packages
- e.g. package.json, flake.lock ...
- Packages should only be updated in dedicated branches (e.g. `update/node-packages`)

## Testing
- Add tests for new features and bug fixes
- Ensure tests are passing