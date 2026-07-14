# Contributing

Thanks for your interest in improving AutoDeploy. Whether you want to open a pull request, fix a bug, or extend a feature, this document explains the project's conventions before you touch anything — so your work fits in with the rest and doesn't get sent back for reasons a few minutes of reading would have avoided.

## Repository philosophy

Three principles drive every technical decision. If a proposal breaks them, it probably won't get in.

- **The simplest solution that works wins.** Three clear lines beat a clever abstraction. We don't pre-design for hypothetical future needs; when they arrive, we refactor.
- **The code is written in Spanish.** Classes, methods, variables, branches, commits, endpoints, and CSS selectors. The exception is technical terms with no reasonable translation (`signal`, `WebSocket`, `JWT`, `cron`).
- **The name tells the "what". The comment tells the "why".** If a comment explains the same thing the identifier already says, it's noise. If it explains a non-obvious decision, it stays.

## Before opening a pull request

Don't start coding blind. For any non-trivial change:

1. **Check whether an issue exists** describing what you want to do. If it doesn't, open one first using the appropriate template.
2. **Comment on the issue** saying you're taking it, so we avoid duplicate work.
3. **Agree on the approach** if the change touches the architecture, several modules, or anything sensitive (auth, encryption, the SSH layer). A comment proposing your plan saves entire refactors later.
4. **If you're going to break compatibility** (API change, data migration, endpoint removal), flag it explicitly and propose a transition strategy.

## Setting up your local environment

After forking and cloning your copy, get the environment ready in three steps:

```bash
# 1. Environment variables (not versioned)
cp .env.example .env
# Edit .env with your own test credentials

# 2. Database in Docker
docker compose up mongodb

# 3. Backend and frontend in parallel (two terminals)
cd backend && ./mvnw spring-boot:run        # → :8080
cd autodeploy && npm install && npm start    # → :4200
```

If everything starts without errors, open `http://localhost:4200` and you have the application running against your local Mongo and backend. If something fails, see the Quick start and Troubleshooting sections in the [`README`](./README.md#quick-start).

## Branch naming

The branch name is the first thing anyone reads about your work. Make it say something.

| Prefix | For what kind of change | Real example |
|--------|-------------------------|--------------|
| `feature/` | New functionality | `feature/reconexion-automatica-servidores` |
| `fix/` | Fix for an existing bug | `fix/onboarding-textarea-clave-ssh` |
| `refactor/` | Reorganization with no functional change | `refactor/itcss-bem-estados` |
| `docs/` | Documentation only | `docs/snippet-nginx-letsencrypt` |
| `chore/` | Maintenance, dependencies, CI | `chore/bump-spring-boot-3.4.1` |

Avoid generic names like `feature/cambios`, `fix/varios`, `update`. If you need to touch two unrelated things, that's two branches.

## Commit format

The project follows [Conventional Commits](https://www.conventionalcommits.org/) without exceptions. The commit subject (the first line) has this shape:

```
type(area): imperative lowercase description
```

The allowed **types** are the usual ones from the standard:

`feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `ci`, `style`, `perf`, `build`, `revert`.

The **area** is optional but recommended so the `git log` is readable at a glance. Some areas alive in the repo: `backend`, `onboarding`, `styles`, `terminal`, `firewall`, `i18n`, `deploy`.

Real examples from the project history:

```
feat(backend): reconexión automática de servidores tras arrancar (#225)
fix(onboarding): añadir textarea para pegar la clave SSH privada (#223)
refactor(styles): anidamiento BEM con & + estados :hover/:focus en componentes
docs(deploy): mover Custom Properties CSS de Settings a 02-generic
```

If the change deserves extra explanation (a technical decision, alternatives that were discarded, a reference to a previous commit), leave a blank line after the subject and write it in the body. Make the commit body useful to *your future self* reading `git blame` a year from now.

## Anatomy of a pull request that gets merged on the first pass

Your PR is closer to being merged if it meets these criteria — they're not mechanical rules, they're patterns that have proven to work:

- **It's small.** Ideally under 300 lines of diff. If you need more, split the work into a chain of PRs.
- **It does one thing.** If you need the conjunction "and" to describe it, it's two PRs.
- **It brings its tests.** If you touch the Java backend, there's JUnit. If you touch the frontend, there's Karma/Jasmine. If it's a fix, there's a test that reproduced the bug *before* your change.
- **CI is green.** Don't open the PR waiting for CI to tell you what's wrong; run the tests locally first (`./mvnw test` and `npm run test:unit`).
- **The description reads without opening the files.** Summary → motivation → how to test manually. If you touched UI, a screenshot. If you touched the API, a `curl` example.
- **It doesn't mix cosmetic refactors** (renames, import reordering, reformatting) with functional changes. Separate PR for that.

An automatic template is available at [`.github/PULL_REQUEST_TEMPLATE.md`](./.github/PULL_REQUEST_TEMPLATE.md).

## Technical conventions per layer

The style rules are not arbitrary: each one exists because its opposite caused a concrete problem at some point in the project. If you think a rule is wrong, open an issue *before* skipping it.

### Backend (Java 21 + Spring Boot 3.4)

- **DTOs as `record`s**, never POJO classes with hand-written getters/setters.
- **Constructor injection**, not field injection (`@Autowired` on fields is forbidden).
- **Method-level authorization** with `@PreAuthorize("hasRole('ADMIN') or #id == authentication.principal")` where applicable. Don't filter permissions by hand in the controller.
- **Uniform response wrapper**: `ApiResponse<T>` with fields `success`, `message`, `data`. Three fields. Always.
- **Business exceptions** extend `RuntimeException`. The global `@RestControllerAdvice` maps them to HTTP.
- **Environment variables** for everything sensitive. No defaults in `application.properties` — the backend *fails fast* if they're missing.

### Frontend (Angular 20)

- **Signals** for all reactive state. No `BehaviorSubject` except when integrating with legacy RxJS APIs.
- **Standalone components with `inject()`** in the class body. No constructor-based DI.
- **`async/await`** in services and components. Chained `.then()` only if you run into it in legacy code and are touching it minimally.
- **Double quotes** in TypeScript strings (enforced by Prettier).
- **`const` by default**, `let` when reassigning, **never `var`**.
- **Methods instead of arrow functions** as class properties. Arrow functions are reserved for inline callbacks.
- **Authenticated routes** under `/app/*` with `authGuard`. Pages are loaded with `loadComponent` (lazy).

### Styles (Sass + ITCSS + BEM)

- **Strict ITCSS layers**: `00-settings`, `01-tools`, `02-generic`, `03-elements`, `04-layout`, `05-components`, `06-utilities`. Never imported in reverse order.
- **BEM with Sass nesting**: `.bloque { &__elemento { &--modificador {} } }`. Three levels maximum.
- **Centralized CSS Custom Properties** in `_variables.scss`. If you add a variable, it goes there — not wherever you first use it.
- **No `!important`.** If you need it, the specificity is badly designed.
- **Flexbox by default.** Grid only when Flexbox can't do it.
- **`:hover` and `:focus-visible` states** are mandatory on everything interactive. No accessibility exceptions.
- **No Tailwind**, no CSS-in-JS, no inline `style="..."`.

## The authorship rule

The project is signed with **a single author name: `Kruhale`**. This restriction is not cosmetic — a single, unambiguous author keeps the history traceable: every line in `git blame` maps to one accountable identity.

Practical implications:

- Do not add `Co-Authored-By:` at the end of commit messages, even when a tool proposes it automatically.
- If it slips through by mistake (it happens with GitHub PR templates and some AI assistants), rewrite the commit with `git commit --amend` **before pushing**. If it's already pushed but not merged, `git push --force-with-lease` on the topic branch.
- If the commit is already on `main`, **it is not redone**. Own it and document it in the body of the next commit. Rewriting shared history is worse than the original mistake.

## When you break something

It happens, and it's handled like any other problem:

- **Broken tests on `main` from your merge** → open an immediate revert PR, then a second PR with the fix.
- **Secret committed by accident** → rotate the real credential *before* rewriting history. The credential is already exposed; the repo gets cleaned up afterwards.
- **Force push to `main`** → should never happen. If it does, open an issue describing what was lost and rebuild it.
- **Massive merge conflicts** → better to close the PR, rebase the branch onto `main`, and open a clean new one.

## Where to look if you're lost

| You need to know… | Look at… |
|---|---|
| How to bring up the whole project | [`README`](./README.md#quick-start) |
| How the code is organized | [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) |
| Which tests exist and how to run them | [`README`](./README.md#local-development) |
| How production deployment works | [`docs/DEPLOY.md`](./docs/DEPLOY.md) |
| Which security rules the code enforces | [`SECURITY.md`](./SECURITY.md) |
| REST API conventions | [`docs/API.md`](./docs/API.md) or Swagger UI at `/swagger-ui.html` |

If after reading all this you still have a concrete question, open an issue with the `question` label. It's a valid label — not everything has to be a bug or a feature.
