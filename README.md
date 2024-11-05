# OpenRouter GitHub Action

AI-powered PR reviews using OpenRouter's language models. Get automated code reviews, suggestions, and vulnerability scanning on your pull requests.

## ⚠️ Security First: Managing Secrets

This action requires an OpenRouter API key. **NEVER** commit API keys or sensitive data directly in your workflow files.

### Setting up Secrets

1. Get your OpenRouter API key from [OpenRouter](https://openrouter.ai/keys)
2. Add it to GitHub Secrets:
   - Go to your repository's Settings
   - Navigate to Secrets and variables → Actions
   - Click "New repository secret"
   - Create a secret named `OPEN_ROUTER_KEY`
   - Paste your OpenRouter API key as the value

The `GITHUB_TOKEN` is automatically provided by GitHub Actions - you don't need to set it up manually.

## Quick Start

Create `.github/workflows/pr-review.yml` in your project:

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

      - name: AI PR Review
        uses: jonit-dev/openrouter-github-action@main
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }} # Automatically provided
          open_router_key: ${{ secrets.OPEN_ROUTER_KEY }} # Must be set in repository secrets
          model_id: 'anthropic/claude-2'
```

## Features

- Automated PR code review using AI
- Customizable AI models through OpenRouter
- Vulnerability and bug detection
- Code improvement suggestions
- Custom prompts for specialized analysis
- Performance and security insights

## Configuration Options

| Input             | Description                 | Required | Default               | Security Note                            |
| ----------------- | --------------------------- | -------- | --------------------- | ---------------------------------------- |
| `github_token`    | GitHub token for API access | Yes      | `${{ github.token }}` | Automatically provided by GitHub Actions |
| `open_router_key` | Your OpenRouter API key     | Yes      | -                     | Must be stored in GitHub Secrets         |
| `model_id`        | Model ID to use             | Yes      | anthropic/claude-2    | Safe to include in workflow file         |
| `custom_prompt`   | Custom prompt for analysis  | No       | Default prompt        | Safe to include in workflow file         |
| `max_tokens`      | Maximum tokens in response  | No       | 2048                  | Safe to include in workflow file         |

## Advanced Usage

### Custom Model

```yaml
- uses: jonit-dev/openrouter-github-action@main
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    open_router_key: ${{ secrets.OPEN_ROUTER_KEY }}
    model_id: 'openai/gpt-4' # Safe to customize
```

### Custom Prompt

```yaml
- uses: jonit-dev/openrouter-github-action@main
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    open_router_key: ${{ secrets.OPEN_ROUTER_KEY }}
    model_id: 'anthropic/claude-2'
    custom_prompt: |
      You are a security-focused reviewer. Analyze this PR with emphasis on:
      1. Security vulnerabilities
      2. Authentication issues
      3. Data validation
      4. Input sanitization
      5. Best practices
```

## Available Models

Some recommended models:

- `anthropic/claude-2`: Excellent for detailed code analysis
- `openai/gpt-4`: Strong general-purpose code review
- `anthropic/claude-instant-v1`: Faster, more economical option

## Testing Locally

1. Clone this repository
2. Install dependencies: `npm install`
3. Create a test branch: `git checkout -b test-feature`
4. Make some changes
5. Create a PR
6. **Important**: Add your OpenRouter API key to repository secrets as `OPEN_ROUTER_KEY`
   - Never commit the API key directly
   - Never include it in environment files
   - Always use GitHub Secrets
7. The action will run automatically on your PR

## Security Best Practices

1. Always use GitHub Secrets for sensitive data
2. Never commit API keys or tokens
3. Don't log sensitive information in PR comments
4. Regularly rotate your OpenRouter API key
5. Use the minimum required permissions for the GitHub token

## License

This project is licensed under the MIT License.
