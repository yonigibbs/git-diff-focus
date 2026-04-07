# git-diff-focus

A diff review tool that helps you focus on the changes that matter.

## The problem

Large pull requests are hard to review. When a PR contains a rename, a dependency upgrade, or a mechanical refactor alongside meaningful logic changes, you end up scrolling through hundreds of repetitive diffs just to find the interesting ones. You can't see the wood for the trees.

## The solution

git-diff-focus lets you define regex-based filters to hide diffs you don't care about. For example:

- **Import changes**: hide all diffs where the only change is to import statements.
- **Renames**: hide diffs where `oldName` was replaced with `newName`.
- **Mechanical changes**: hide diffs where removing `!!` from both sides makes the old and new code identical.

Once the noise is filtered out, you can review only the diffs that need your attention. File and change counts update to reflect what's left, and files with no remaining visible changes are hidden entirely.

## Features

- Load diffs from any GitHub pull request
- Unified and side-by-side diff views
- Regex-based diff filtering with three match types:
  - **Old code**: match against removed lines
  - **New code**: match against added lines
  - **Diff**: strip a pattern from both sides and hide if they become identical
- Filters combine with AND/OR logic
- Built-in filter presets for common languages (Kotlin, TypeScript, Python, Go, Rust, Swift)
- Keyboard navigation between files and changes
- File list with flat and tree views
- Add review comments directly to GitHub PRs
- Resizable panels

## Running locally

```sh
npm install
npm run dev
```

Then open the URL shown in the terminal (usually http://localhost:5173).

To use the app, you'll need a GitHub personal access token with `repo` scope. You can create one at GitHub Settings > Developer settings > Personal access tokens. The app gives you the option to store the token in your browser's localStorage or keep it in memory only (lost on page reload).

## Running tests

```sh
npm test
```

## Building for production

```sh
npm run build
```

The output is a static site in `dist/` that can be deployed anywhere.

## Disclaimer

This project was entirely vibe-coded with [Claude Code](https://docs.anthropic.com/en/docs/claude-code).
