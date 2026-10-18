const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'GitCharts',
};

export default async (request) => {
  const repository = String(new URL(request.url).searchParams.get('repo') ?? '').trim();
  const match = repository.match(/^([\w.-]+)\/([\w.-]+)$/);

  if (!match) {
    return Response.json({ error: 'enter a repository as owner/name.' }, { status: 400 });
  }

  const [, owner, name] = match;
  const base = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;

  try {
    const [repositoryResponse, languagesResponse] = await Promise.all([
      fetch(base, { headers }),
      fetch(`${base}/languages`, { headers }),
    ]);

    if (!repositoryResponse.ok || !languagesResponse.ok) {
      const status = repositoryResponse.status === 404 || languagesResponse.status === 404 ? 404 : 502;
      return Response.json({
        error: status === 404
          ? 'repository not found. check the owner and repository name.'
          : 'github could not return repository data. try again in a moment.',
      }, { status });
    }

    const [details, languages] = await Promise.all([
      repositoryResponse.json(),
      languagesResponse.json(),
    ]);

    return Response.json({
      name: details.full_name,
      description: details.description,
      stars: details.stargazers_count,
      url: details.html_url,
      languages: Object.entries(languages)
        .map(([language, bytes]) => ({ language, bytes: Number(bytes) }))
        .sort((first, second) => second.bytes - first.bytes),
    });
  } catch {
    return Response.json({ error: 'unable to reach github. check your connection and try again.' }, { status: 502 });
  }
};

export const config = { path: '/api/repository' };
