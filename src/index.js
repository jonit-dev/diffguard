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

async function shouldReviewPR(octokit, context, requiredLabel) {
  if (!requiredLabel) {
    return true;
  }

  try {
    const { data: labels } = await octokit.rest.issues.listLabelsOnIssue({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: context.payload.pull_request.number,
    });

    return labels.some((label) => label.name === requiredLabel);
  } catch (error) {
    throw new Error(`Failed to fetch PR labels: ${error.message}`);
  }
}

async function analyzeDiff(diff, modelId, openRouterKey, customPrompt, reasoningEffort) {
  const defaultPrompt = `You are a highly skilled staff software engineer reviewing a pull request. 

Avoid generic BS advice. For each advice, please provide a file Path of the related change. No need to paste the code itself.

Do not mention what's good on the code. Just focus on what's bad and how to improve.

Analyze the following code changes and provide a detailed review in the following format. MAKE SURE TO ADHERE TO THIS FORMAT!

For each category below, except for the overall score, rate the issue in terms of severity (low 🔵, medium 🟡, high 🔥).

Here's your text with added emojis:

---

### 🏆 Overall Score  
[Give a 1-5 ⭐ rating for this PR] and final comments

### 🐞 Potential Issues  
[List any bugs, vulnerabilities, or critical issues]

### 💡 Improvements Suggested  
[List specific code improvements and refactoring suggestions]

### ⚡️ Performance  
[Discuss performance implications and optimization opportunities]

### 🔐 Security Concerns  
[List security issues, if any]

### 📏 Best Practices  
[Suggest adherence to coding standards and best practices] 

### 🧪 Missing Tests  
[List any missing or insufficient tests, and suggest specific tests that should be added. Be concrete and actionable.]

Please be specific and provide actionable feedback. No generic BS advice.`;

  const prompt = customPrompt || defaultPrompt;
  const fullPrompt = `${prompt}\n\nHere's the diff:\n${diff}\n\nProvide your analysis in the specified format.`;

  try {
    const requestBody = {
      model: modelId,
      messages: [
        {
          role: 'user',
          content: fullPrompt,
        },
      ],
    };

    // Add reasoning_effort if specified (for reasoning models)
    if (reasoningEffort) {
      requestBody.reasoning_effort = reasoningEffort;
    }

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      requestBody,
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

/**
 * Filters out excluded files from the diff
 * @param {string} diff - The PR diff content
 * @param {string[]} excludePatterns - Array of file patterns to exclude
 * @returns {string} Filtered diff content
 */
function filterExcludedFiles(diff, excludePatterns) {
  if (!excludePatterns || excludePatterns.length === 0) {
    return diff;
  }

  core.info(`Original diff length: ${diff.length} characters`);

  // Debug: Check if the diff contains common lock files
  core.info(`Diff contains 'yarn.lock': ${diff.includes('yarn.lock')}`);
  core.info(
    `Diff contains 'package-lock.json': ${diff.includes('package-lock.json')}`
  );
  core.info(`Diff contains 'package.lock': ${diff.includes('package.lock')}`);

  // Split the diff into file sections
  const fileSections = diff.split('diff --git');
  core.info(`Split diff into ${fileSections.length} sections`);

  // Keep the first empty section (if any) and filter the rest
  const filteredSections = [fileSections[0]];
  const excludedFiles = [];

  for (let i = 1; i < fileSections.length; i++) {
    const section = fileSections[i];

    // Extract the file path from the diff section
    // Look for both a/ and b/ paths as they both should contain the filename
    const filePathMatchA = section.match(/a\/([^\s]+)/);
    const filePathMatchB = section.match(/b\/([^\s]+)/);

    core.debug(
      `Section ${i} - a/ match: ${
        filePathMatchA ? filePathMatchA[1] : 'None'
      }, b/ match: ${filePathMatchB ? filePathMatchB[1] : 'None'}`
    );

    if (!filePathMatchA && !filePathMatchB) {
      core.info(
        `Couldn't extract file path from section ${i}, including it by default`
      );
      filteredSections.push(section);
      continue;
    }

    // Use the first match found (preferring a/ path)
    const filePath = filePathMatchA ? filePathMatchA[1] : filePathMatchB[1];
    core.debug(`Processing file: ${filePath}`);

    // Check if this file should be excluded
    let shouldExclude = false;
    let matchedPattern = '';

    for (const pattern of excludePatterns) {
      core.debug(`  Checking against pattern: '${pattern}'`);

      // Handle exact filename matches (common case)
      if (filePath.endsWith(pattern) || filePath === pattern) {
        core.debug(`  -> Direct match with '${pattern}'`);
        shouldExclude = true;
        matchedPattern = pattern;
        break;
      }

      // Simplified approach for common filenames (checking file basename)
      const fileName = filePath.split('/').pop();
      if (fileName === pattern) {
        core.debug(`  -> Basename match with '${pattern}'`);
        shouldExclude = true;
        matchedPattern = pattern;
        break;
      }

      // Convert glob pattern to regex for more complex patterns
      try {
        const regexPattern = pattern
          .replace(/\./g, '\\.')
          .replace(/\*/g, '.*')
          .replace(/\?/g, '.');

        const regex = new RegExp(`^${regexPattern}$`);
        core.debug(`  -> Testing regex: ${regex}`);
        if (regex.test(filePath)) {
          core.debug(`  -> Regex match with '${pattern}'`);
          shouldExclude = true;
          matchedPattern = pattern;
          break;
        }
      } catch (error) {
        core.warning(`Invalid regex pattern ${pattern}: ${error.message}`);
      }
    }

    if (!shouldExclude) {
      filteredSections.push(section);
      core.debug(`Including file in analysis: ${filePath}`);
    } else {
      excludedFiles.push(filePath);
      core.info(
        `Excluding file from analysis: ${filePath} (matched pattern: ${matchedPattern})`
      );
    }
  }

  // Log summary of excluded files
  if (excludedFiles.length > 0) {
    core.info(
      `Excluded ${
        excludedFiles.length
      } files from analysis: ${excludedFiles.join(', ')}`
    );
  } else {
    core.warning(
      'No files were excluded despite exclude patterns being provided'
    );
  }

  // Reconstruct the diff, adding 'diff --git' back except for the first section
  const filteredDiff =
    filteredSections[0] +
    filteredSections
      .slice(1)
      .map((section) => `diff --git${section}`)
      .join('');

  core.info(
    `Filtered diff length: ${filteredDiff.length} characters (${Math.round(
      (filteredDiff.length / diff.length) * 100
    )}% of original)`
  );

  // If filtered diff is very short or empty, this could be a problem
  if (filteredDiff.length < 100) {
    core.warning(
      `WARNING: Filtered diff is very short (${filteredDiff.length} chars), this might cause an API error`
    );
    if (filteredDiff.length === 0) {
      core.warning(
        `All files were excluded, but an empty diff will cause an API error`
      );
      // Return a minimal valid diff to prevent API errors
      return 'diff --git a/README.md b/README.md\nindex 1234567..abcdefg 100644\n--- a/README.md\n+++ b/README.md\n@@ -1,1 +1,1 @@\n-# No changes to analyze\n+# No changes to analyze after exclusions';
    }
  }

  return filteredDiff;
}

// Add a function to extract the score from the AI's analysis
function extractScore(analysis) {
  // Try to find a 0-100 score (e.g., "Score: 72" or "Overall Score: 72")
  const hundredMatch = analysis.match(/Score.*?([0-9]{1,3})/i);
  if (hundredMatch) {
    const score = parseInt(hundredMatch[1], 10);
    if (!isNaN(score)) return score;
  }
  // Try to find a 1-5 star rating (e.g., "[3.5/5 ⭐]")
  const starMatch = analysis.match(/\[([0-9.]+)\/5 ?⭐/i);
  if (starMatch) {
    const stars = parseFloat(starMatch[1]);
    if (!isNaN(stars)) return Math.round((stars / 5) * 100);
  }
  return null; // Could not extract score
}

async function run() {
  try {
    // Get inputs
    const openRouterKey = core.getInput('open_router_key', { required: true });
    const modelId = core.getInput('model_id', { required: true });
    const customPrompt = core.getInput('custom_prompt');
    const reviewLabel = core.getInput('review_label');
    const excludeFilesInput = core.getInput('exclude_files');
    const reasoningEffort = core.getInput('reasoning_effort');

    // Process exclude patterns
    const excludePatterns = excludeFilesInput
      ? excludeFilesInput.split(',').map((pattern) => pattern.trim())
      : [];

    core.info(`=== DiffGuard Debug Information ===`);
    core.info(`Model ID: ${modelId}`);
    core.info(`Review Label: ${reviewLabel || 'None'}`);
    core.info(
      `Exclude Patterns (${excludePatterns.length}): ${JSON.stringify(
        excludePatterns
      )}`
    );

    // Get GitHub token and create octokit client
    const token = core.getInput('github_token', { required: true });
    const octokit = github.getOctokit(token);

    // Check if we should review this PR based on label
    const shouldReview = await shouldReviewPR(
      octokit,
      github.context,
      reviewLabel
    );
    if (!shouldReview) {
      core.info('Skipping review - required label not found on PR');
      return;
    }

    core.info(`Fetching PR diff...`);
    // Get PR diff
    let diff = await getPRDiff(octokit, github.context);
    core.info(`PR diff fetched successfully (${diff.length} characters)`);

    // Log the first 100 characters of the diff for debugging
    core.info(`Diff preview: ${diff.substring(0, 100)}...`);

    // Count the number of files in the diff
    const fileCount = (diff.match(/diff --git/g) || []).length;
    core.info(`Total files in PR diff: ${fileCount}`);

    // Filter excluded files
    if (excludePatterns.length > 0) {
      core.info(
        `=== Excluding files matching patterns: ${excludePatterns.join(
          ', '
        )} ===`
      );
      try {
        diff = filterExcludedFiles(diff, excludePatterns);
        const newFileCount = (diff.match(/diff --git/g) || []).length;
        core.info(
          `Files after exclusion: ${newFileCount} (excluded ${
            fileCount - newFileCount
          })`
        );
      } catch (error) {
        core.warning(`Error during file exclusion: ${error.message}`);
        // Continue with original diff if filtering fails
      }
    }

    core.info(`Sending diff to OpenRouter API for analysis...`);
    if (reasoningEffort) {
      core.info(`Using reasoning effort: ${reasoningEffort}`);
    }
    // Analyze the diff
    const analysis = await analyzeDiff(
      diff,
      modelId,
      openRouterKey,
      customPrompt,
      reasoningEffort
    );

    // Get minimum_score input (default 75)
    const minimumScore = parseInt(core.getInput('minimum_score') || '75', 10);

    // Extract score and block PR if below minimum
    const score = extractScore(analysis);
    let warningMsg = '';
    if (score !== null) {
      core.info(
        `AI review score: ${score} (minimum required: ${minimumScore})`
      );
      if (score < minimumScore) {
        warningMsg = `> ⚠️ **PR Blocked:** The AI review score for this PR is **${score}**, which is below the required minimum of **${minimumScore}**. Please address the issues below before merging.\n\n`;
        core.setFailed(
          `PR blocked: AI review score (${score}) is below the minimum required (${minimumScore}).`
        );
      }
    } else {
      core.warning('Could not extract score from AI analysis.');
    }

    // Post the analysis as a PR comment, with warning if needed
    await createPRComment(octokit, github.context, warningMsg + analysis);
    core.info(`PR comment posted successfully`);
  } catch (error) {
    core.error(`Error details: ${JSON.stringify(error)}`);
    core.setFailed(`Action failed: ${error.message}`);
  }
}

run();
