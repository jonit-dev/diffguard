const core = require('@actions/core');
const github = require('@actions/github');
const axios = require('axios');

async function getPRDiff(octokit, context) {
  const { data: diff } = await octokit.rest.pulls.get({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: context.payload.pull_request.number,
    mediaType: {
      format: 'diff',
    },
  });
  return diff;
}

async function analyzeDiff(diff, modelId, openRouterKey, customPrompt) {
  const defaultPrompt = `You are a highly skilled software engineer reviewing a pull request. 
Please analyze the following code changes and provide:
1. Potential bugs or vulnerabilities
2. Code improvement suggestions
3. Performance implications
4. Security concerns
5. Best practices violations`;

  const prompt = customPrompt || defaultPrompt;
  const fullPrompt = `${prompt}\n\nHere's the diff:\n${diff}\n\nPlease provide your analysis in a clear, structured format.`;

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

    return response.data.choices[0].message.content;
  } catch (error) {
    throw new Error(`OpenRouter API error: ${error.message}`);
  }
}

async function createPRComment(octokit, context, analysis) {
  await octokit.rest.issues.createComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.payload.pull_request.number,
    body: `## OpenRouter AI Analysis

${analysis}

---
*Analyzed using ${core.getInput('model_id')}*`,
  });
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
