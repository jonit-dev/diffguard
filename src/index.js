const core = require('@actions/core');
const github = require('@actions/github');
const axios = require('axios');

async function getPRDiff(octokit, context) {
  try {
    const { data: pullRequest } = await octokit.rest.pulls.get({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: context.payload.pull_request.number,
      mediaType: {
        format: 'diff',
      },
    });

    return pullRequest;
  } catch (error) {
    throw new Error(`Failed to fetch PR diff: ${error.message}`);
  }
}

async function analyzeDiff(diff, modelId, openRouterKey, customPrompt) {
  const defaultPrompt = `You are a highly skilled software engineer reviewing a pull request. 
Analyze the following code changes and provide a detailed review in the following format:

### Potential Issues
[List any bugs, vulnerabilities, or critical issues]

### Improvements Suggested
[List specific code improvements and refactoring suggestions]

### Performance
[Discuss performance implications and optimization opportunities]

### Security Concerns
[List security issues, if any]

### Best Practices
[Suggest adherence to coding standards and best practices]

### Overall score
[Give a 1-5 star rating for this PR] and final comments

Please be specific and provide actionable feedback.`;

  const prompt = customPrompt || defaultPrompt;
  const fullPrompt = `${prompt}\n\nHere's the diff:\n${diff}\n\nProvide your analysis in the specified format.`;

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: modelId,
        messages: [
          {
            role: 'user',
            content: fullPrompt,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          'HTTP-Referer': 'https://github.com/marketplace',
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.data?.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from OpenRouter API');
    }

    return response.data.choices[0].message.content;
  } catch (error) {
    if (error.response?.data) {
      throw new Error(
        `OpenRouter API error: ${JSON.stringify(error.response.data)}`
      );
    }
    throw new Error(`Failed to analyze diff: ${error.message}`);
  }
}

async function createPRComment(octokit, context, analysis) {
  try {
    await octokit.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: context.payload.pull_request.number,
      body: `## DiffGuard AI Analysis

${analysis}

---
*Analyzed using ${core.getInput('model_id')}*`,
    });
  } catch (error) {
    throw new Error(`Failed to create PR comment: ${error.message}`);
  }
}

async function run() {
  try {
    // Get inputs
    const openRouterKey = core.getInput('open_router_key', { required: true });
    const modelId = core.getInput('model_id', { required: true });
    const customPrompt = core.getInput('custom_prompt');

    // Get GitHub token and create octokit client
    const token = core.getInput('github_token', { required: true });
    const octokit = github.getOctokit(token);

    // Get PR diff
    const diff = await getPRDiff(octokit, github.context);

    // Analyze the diff
    const analysis = await analyzeDiff(
      diff,
      modelId,
      openRouterKey,
      customPrompt
    );

    // Post the analysis as a PR comment
    await createPRComment(octokit, github.context, analysis);
  } catch (error) {
    core.setFailed(`Action failed: ${error.message}`);
  }
}

run();
