# OpenRouter GitHub Action

AI-powered PR reviews using OpenRouter's language models. Get automated code reviews, suggestions, and vulnerability scanning on your pull requests.

## How It Works

1. When a PR is opened, updated, or a label is added/removed, the action automatically runs
2. It analyzes the PR's diff using your chosen AI model
3. Posts a detailed analysis as a PR comment, including:
   - Potential bugs and vulnerabilities
   - Code improvement suggestions
   - Performance implications
   - Security concerns
   - Best practices violations
   - Overall score and final comments

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

## Complete Workflow Example

Create `.github/workflows/pr-review.yml` in your project with all available options:

```yaml
name: PR Review
on:
  pull_request:
    types: [opened, synchronize, labeled, unlabeled]

# Required permissions
permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: AI PR Review
        uses: jonit-dev/openrouter-github-action@main
        with:
          # Required inputs
          github_token: ${{ secrets.GITHUB_TOKEN }} # Automatically provided
          open_router_key: ${{ secrets.OPEN_ROUTER_KEY }} # Must be set in repository secrets

          # Optional inputs with defaults
          model_id: 'anthropic/claude-2' # Default model
          max_tokens: '2048' # Default max tokens
          review_label: 'ai-review' # Optional: Only review PRs with this label

          # Optional custom prompt
          custom_prompt: |
            You are a security-focused reviewer. Analyze this PR with emphasis on:
            1. Security vulnerabilities
            2. Authentication issues
            3. Data validation
            4. Input sanitization
            5. Best practices

            Provide a 1-5 star rating for the overall quality.
```

## Building the Project

After making changes to the action's code, you need to build the project to update the action:

1. Run the following command to install dependencies and build the action:
   ```bash
   npm install && npm run build
   ```

This will compile the code and prepare it for use in GitHub Actions.

Dont forget to commit the changes: `git add . && git commit -m "Build the project" && git push`

## Example PR Comment

```markdown
## OpenRouter AI Analysis

### Potential Issues

- The database query in `users.service.ts` isn't properly parameterized, creating a SQL injection risk
- Async operation in `handleSubmit()` lacks error handling

### Improvements Suggested

- Consider using prepared statements for database queries
- Add try/catch block around async operations
- Extract form validation logic into a separate utility

### Performance

- The `heavyComputation()` function could benefit from memoization
- Consider lazy loading for the imported analytics module

### Security Concerns

- API endpoint lacks input validation
- Sensitive data exposure in error logs

### Best Practices

- Follow consistent naming convention for interface props
- Add type annotations for function parameters
- Consider breaking down large component into smaller ones

### Overall score

⭐⭐⭐⭐ (4/5) - Good PR with some minor improvements needed. The code is well-structured but could benefit from additional security measures and error handling.

---

_Analyzed using anthropic/claude-2_
```

## Configuration Reference

| Input             | Description                 | Required | Default                    | Notes                                    |
| ----------------- | --------------------------- | -------- | -------------------------- | ---------------------------------------- |
| `github_token`    | GitHub token for API access | Yes      | `${{ github.token }}`      | Automatically provided by GitHub Actions |
| `open_router_key` | Your OpenRouter API key     | Yes      | -                          | Must be stored in GitHub Secrets         |
| `model_id`        | Model ID to use             | No       | `anthropic/claude-2`       | See available models below               |
| `custom_prompt`   | Custom prompt for analysis  | No       | Default code review prompt | Can be multiline YAML                    |
| `max_tokens`      | Maximum tokens in response  | No       | `2048`                     | Adjust based on review complexity        |
| `review_label`    | Label to trigger review     | No       | -                          | If not set, reviews all PRs              |

### Minimal Configuration

If you only want to use the defaults, this is the minimal configuration needed:

```yaml
name: PR Review
on:
  pull_request:
    types: [opened, synchronize]

# Required permissions
permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: jonit-dev/openrouter-github-action@main
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          open_router_key: ${{ secrets.OPEN_ROUTER_KEY }}
```

### Custom Model Example

```yaml
- uses: jonit-dev/openrouter-github-action@main
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    open_router_key: ${{ secrets.OPEN_ROUTER_KEY }}
    model_id: 'openai/gpt-4'
    max_tokens: '4096' # Increased for more detailed reviews
```

### Custom Prompt Example

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

      Rate the overall quality from 1-5 stars and provide final comments.
```

### Label-Based Review Example

```yaml
- uses: jonit-dev/openrouter-github-action@main
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    open_router_key: ${{ secrets.OPEN_ROUTER_KEY }}
    review_label: 'ai-review' # Only reviews PRs with this label
```

## Available Models

Recommended models:

- Check best programming ones on [openrouter](https://openrouter.ai/rankings/programming/scripting?view=week)

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
7. The action will run automatically on your PR and post its analysis as a comment

## Troubleshooting

### Permission Errors

If you see `Error: Resource not accessible by integration`, add these permissions to your workflow:

```yaml
permissions:
  contents: read
  pull-requests: write
```

This allows the action to read PR contents and create comments.

## Security Best Practices

1. Always use GitHub Secrets for sensitive data
2. Never commit API keys or tokens
3. Don't log sensitive information in PR comments
4. Regularly rotate your OpenRouter API key
5. Use the minimum required permissions for the GitHub token

## License

This project is licensed under the MIT License.
