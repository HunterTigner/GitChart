import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const port = Number(process.env.PORT) || 3001;
const root = path.dirname(fileURLToPath(import.meta.url));

app.get('/api/repository', async (request, response) => {
  const repository = String(request.query.repo ?? '').trim();
  const match = repository.match(/^([\w.-]+)\/([\w.-]+)$/);

  if (!match) {
    return response.status(400).json({ error: 'enter a repository as owner/name.' });
  }

  const [, owner, name] = match;
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'GitCharts',
  };

  try {
    const [repositoryResponse, languagesResponse] = await Promise.all([
      fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`, { headers }),
      fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/languages`, { headers }),
    ]);

    if (!repositoryResponse.ok || !languagesResponse.ok) {
      const status = repositoryResponse.status === 404 || languagesResponse.status === 404 ? 404 : 502;
      return response.status(status).json({
        error: status === 404
          ? 'repository not found. check the owner and repository name.'
          : 'github could not return repository data. try again in a moment.',
      });
    }

    const [details, languages] = await Promise.all([
      repositoryResponse.json(),
      languagesResponse.json(),
    ]);

    return response.json({
      name: details.full_name,
      description: details.description,
      stars: details.stargazers_count,
      url: details.html_url,
      languages: Object.entries(languages)
        .map(([language, bytes]) => ({ language, bytes: Number(bytes) }))
        .sort((first, second) => second.bytes - first.bytes),
    });
  } catch {
    return response.status(502).json({ error: 'unable to reach github. check your connection and try again.' });
  }
});

const distPath = path.join(root, 'dist');
app.use(express.static(distPath));
app.get('*path', (request, response, next) => {
  if (request.path.startsWith('/api/')) return next();
  return response.sendFile(path.join(distPath, 'index.html'), (error) => {
    if (error) next();
  });
});

app.listen(port, () => {
  console.log(`GitCharts server listening on http://localhost:${port}`);
});