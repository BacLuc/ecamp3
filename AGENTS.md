# AGENTS.md

## Dev environment tips

Before you do anything, start the dev environment:
```bash
docker compose up -d
```

### Key Directories

-   `/api/` Contains the api, the place where you will work.

## /api directory

### Development instructions

Think extra hard when developing.
Not just use the easiest way to achieve a goal.
Always ask before you remove assertions or expectations in tests.
Try to achieve the goal with minimal changes.
Explain your changes in the commit message.
If you hit a problem, read the docs to this problem to find the correct solution.

Use composer to run scripts, don't use phpunit directly.

### Testing instructions

> **Note**: PHP test take very long to run, never run them all at once.
> Only run specific tests or tests for one entity when needed

```bash
docker compose exec api composer test

docker compose exec api composer test <path to test from api directory>

# always run cs fix before a commit
docker compose exec api composer cs-fix

# lint
docker compose exec api composer psalm
docker compose exec api composer phpstan
```

## PR instructions

-   Ensure tests are green
-   Ensure code is formatted
-   Ensure code is linted
