# OpenRouter PR Review Action

This GitHub Action integrates with OpenRouter to review pull request diffs, suggest improvements, and scan for vulnerabilities using AI models of your choice.

## Features

- Automated PR code review using AI
- Customizable AI models through OpenRouter
- Vulnerability and bug detection
- Code improvement suggestions
- Custom prompts for specialized analysis
- Performance and security insights

## Inputs

| Input             | Description                                | Required | Default                    |
| ----------------- | ------------------------------------------ | -------- | -------------------------- |
| `github_token`    | GitHub token for API access                | Yes      | `${{ github.token }}`      |
| `open_router_key` | Your OpenRouter API key                    | Yes      | -                          |
| `model_id`        | Model ID to use (e.g., anthropic/claude-2) | Yes      | anthropic/claude-2         |
| `custom_prompt`   | Custom prompt for specialized analysis     | No       | Default code review prompt |
| `max_tokens`      | Maximum tokens in response                 | No       | 2048                       |

## Usage

1. Create a new workflow file (e.g., `.github/workflows/pr-review.yml`):

```yaml
name: PR Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v2

      - name: OpenRouter PR Review
        uses: your-username/openrouter-pr-review@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          open_router_key: ${{ secrets.OPEN_ROUTER_KEY }}
          model_id: 'anthropic/claude-2'
```

### Custom Prompt Example

You can customize the analysis by providing your own prompt:

```yaml
- name: OpenRouter PR Review
  uses: your-username/openrouter-pr-review@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    open_router_key: ${{ secrets.OPEN_ROUTER_KEY }}
    model_id: 'openai/gpt-4'
    custom_prompt: |
      You are a security-focused code reviewer. Please analyze this code diff with emphasis on:
      1. Security vulnerabilities
      2. Authentication/authorization issues
      3. Data validation
      4. Input sanitization
      5. Secure coding practices
```

## Publishing and Testing Guide

### Local Testing

1. Clone this repository
2. Create a new branch for testing:
   ```bash
   git checkout -b test-action
   ```
3. Make some changes to test
4. Create a pull request
5. Add your OpenRouter API key to repository secrets as `OPEN_ROUTER_KEY`
6. The action will automatically run on your PR

### Publishing to GitHub Marketplace

1. Push your code to GitHub:

   ```bash
   git add .
   git commit -m "Initial release"
   git push origin main
   ```

2. Create a new release:

   - Go to your repository on GitHub
   - Click "Releases"
   - Click "Create a new release"
   - Choose a tag (e.g., "v1.0.0")
   - Title the release (e.g., "Initial Release")
   - Publish the release

3. Update in Other Repositories:
   ```yaml
   - uses: your-username/openrouter-pr-review@v1
   ```
   Replace `your-username` with your GitHub username

### Testing in Other Repositories

1. Add the action to your repository's workflow:

   ```yaml
   name: PR Review
   on:
     pull_request:
       types: [opened, synchronize]

   jobs:
     review:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: your-username/openrouter-pr-review@v1
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             open_router_key: ${{ secrets.OPEN_ROUTER_KEY }}
             model_id: 'anthropic/claude-2'
   ```

2. Add your OpenRouter API key:

   - Go to repository Settings
   - Select Secrets and variables → Actions
   - Create a new secret named `OPEN_ROUTER_KEY`
   - Add your OpenRouter API key as the value

3. Create a test PR to verify the action works

## Models

Some recommended models:

- `anthropic/claude-2`: Excellent for detailed code analysis
- `openai/gpt-4`: Strong general-purpose code review
- `anthropic/claude-instant-v1`: Faster, more economical option

## License

This project is licensed under the MIT License.
