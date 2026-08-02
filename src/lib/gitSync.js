import fs from 'node:fs';

const OWNER = 'hengelsportshort-boop';
const REPO = 'KVVI';
const BRANCH = 'main';
const API_BASE = 'https://api.github.com';

function getToken() {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
}

function repoUrl(repoPath) {
  const encoded = repoPath.split('/').map(encodeURIComponent).join('/');
  return `${API_BASE}/repos/${OWNER}/${REPO}/contents/${encoded}`;
}

async function getFileSha(repoPath) {
  const res = await fetch(`${repoUrl(repoPath)}?ref=${BRANCH}`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'User-Agent': 'KVVI-data-sync'
    }
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub GET ${repoPath} → ${res.status}`);
  const data = await res.json();
  return data.sha || null;
}

async function putFile(repoPath, base64Content, sha, commitMessage) {
  const body = {
    message: commitMessage || `*KVVI data sync* ${repoPath}`,
    content: base64Content,
    branch: BRANCH
  };
  if (sha) body.sha = sha;

  const res = await fetch(repoUrl(repoPath), {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
      'User-Agent': 'KVVI-data-sync'
    },
    body: JSON.stringify(body)
  });
  return res;
}

export async function syncFileToGitHub({ repoPath, localPath, commitMessage }) {
  const token = getToken();
  if (!token) {
    console.warn(`[gitSync] Geen GITHUB_TOKEN/GH_TOKEN ingesteld; overslaan: ${repoPath}`);
    return { ok: false, reason: 'no-token' };
  }

  const content = fs.readFileSync(localPath);
  const base64 = content.toString('base64');

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const sha = await getFileSha(repoPath);
      const res = await putFile(repoPath, base64, sha, commitMessage);
      if (res.ok) return { ok: true };
      if (res.status === 409 || res.status === 422) {
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 500));
          continue;
        }
        throw new Error(`conflict na retries`);
      }
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`);
    } catch (error) {
      console.error(`[gitSync] Sync mislukt voor ${repoPath} (poging ${attempt + 1}): ${error.message}`);
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 800));
      } else {
        return { ok: false, reason: error.message };
      }
    }
  }
  return { ok: false, reason: 'unexpected' };
}
