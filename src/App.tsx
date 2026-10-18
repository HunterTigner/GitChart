import { useEffect, useState, type FormEvent } from 'react';
import { ArrowDownToLine, ArrowUpRight, ChartNoAxesColumnIncreasing, Copy, Github, Menu as MenuIcon, Minus, Search, Square, Star, X } from 'lucide-react';

type Language = { language: string; bytes: number };
type Repository = {
  name: string;
  description: string | null;
  stars: number;
  url: string;
  languages: Language[];
};

type CliChartViewProps = { repositoryName: string; command: string };

const languageColors: Record<string, string> = {
  TypeScript: '#3977c5', JavaScript: '#e1ba3e', Python: '#4387a8', HTML: '#e1794d',
  CSS: '#9b79ca', Java: '#bd6650', Rust: '#be7551', Go: '#45a6ae', Shell: '#74875c',
  Ruby: '#bb5d65', PHP: '#7785c0', Swift: '#e28b52', Kotlin: '#9668bc', C: '#6687b8',
  'C++': '#de6580', 'C#': '#824fb0', Vue: '#48a27d', MDX: '#bf8a53',
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} b`;
  const units = ['kb', 'mb', 'gb'];
  let amount = bytes;
  let unit = -1;
  do {
    amount /= 1024;
    unit += 1;
  } while (amount >= 1024 && unit < units.length - 1);
  return `${amount.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${units[unit]}`;
}

function CliChartView({ repositoryName, command }: CliChartViewProps) {
  const [repository, setRepository] = useState<Repository | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/repository?repo=${encodeURIComponent(repositoryName)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'could not load this repository.');
        return data as Repository;
      })
      .then((data) => {
        if (!cancelled) setRepository(data);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'could not load this repository.');
      });

    return () => {
      cancelled = true;
    };
  }, [repositoryName]);

  const totalBytes = repository?.languages.reduce((total, item) => total + item.bytes, 0) ?? 0;

  return (
    <main className="cli-chart-window">
      <div className="cli-command-block">
        <span className="cli-command-label">command</span>
        <span className="cli-command-text">{command}</span>
      </div>

      {error ? (
        <p className="cli-chart-message error-message">{error}</p>
      ) : repository ? (
        <>
          <div className="cli-chart-heading">
            <h1>{repository.name.toLowerCase()}</h1>
            <span>{repository.stars.toLocaleString()} stars · {repository.languages.length} languages · {formatBytes(totalBytes)} total</span>
          </div>
          <div className="cli-chart-list">
            {repository.languages.map((item) => {
              const percent = totalBytes ? (item.bytes / totalBytes) * 100 : 0;
              const color = languageColors[item.language] ?? '#3fb950';

              return (
                <div className="cli-chart-row" key={item.language}>
                  <div className="cli-chart-label">
                    <span className="language-dot" style={{ '--language-color': color } as React.CSSProperties} />
                    <span className="cli-language-name">{item.language.toLowerCase()}</span>
                    <span className="cli-language-size">{formatBytes(item.bytes)}</span>
                    <strong>{percent.toFixed(percent >= 10 ? 0 : 1)}%</strong>
                  </div>
                  <div className="cli-bar-track">
                    <div className="cli-bar-fill" style={{ width: `${percent}%`, '--language-color': color } as React.CSSProperties} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <p className="cli-chart-message">loading chart...</p>
      )}
    </main>
  );
}

function App() {
  const [query, setQuery] = useState('');
  const [repository, setRepository] = useState<Repository | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const isLicensePage = window.location.pathname === '/license';
  const cliParameters = new URLSearchParams(window.location.search);
  const cliChartRepository = cliParameters.get('cliChart');
  const cliCommand = cliParameters.get('cliCommand') ?? '';

  useEffect(() => window.gitChartWindow?.onMaximizeState(setIsMaximized), []);

  async function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = query.trim().replace(/^https?:\/\/(www\.)?github\.com\//, '').replace(/\/$/, '');
    setError('');
    setRepository(null);

    if (!/^[\w.-]+\/[\w.-]+$/.test(normalized)) {
      setError('use a github url or enter the repository as owner/name.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/repository?repo=${encodeURIComponent(normalized)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'could not load this repository.');
      setRepository(data as Repository);
      setQuery(data.name.toLowerCase());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message.toLowerCase() : 'something went wrong. try again.');
    } finally {
      setLoading(false);
    }
  }

  const languages = repository?.languages ?? [];
  const totalBytes = languages.reduce((total, item) => total + item.bytes, 0);

  return (
    <div className="app-shell">
      {window.gitChartWindow && (
        <div className="desktop-titlebar" role="toolbar" aria-label="window controls">
          <div className="desktop-tab">
            <span className="desktop-tab-name"><span>git</span>chart</span>
          </div>
          <div className="titlebar-drag-space" />
          <div className="window-controls">
            <button type="button" aria-label="minimize window" title="minimize" onClick={() => window.gitChartWindow?.minimize()}><Minus size={15} /></button>
            <button type="button" aria-label={isMaximized ? 'restore window' : 'maximize window'} title={isMaximized ? 'restore' : 'maximize'} onClick={() => window.gitChartWindow?.toggleMaximize()}>
              {isMaximized ? <Copy size={13} /> : <Square size={13} />}
            </button>
            <button className="close-window" type="button" aria-label="close window" title="close" onClick={() => window.gitChartWindow?.close()}><X size={16} /></button>
          </div>
        </div>
      )}
        {cliChartRepository ? (
          <CliChartView repositoryName={cliChartRepository} command={cliCommand} />
        ) : (
          <>
            <header className="topbar">
              <a className="brand" href="/" aria-label="gitcharts home">
                <span className="brand-mark"><ChartNoAxesColumnIncreasing size={18} strokeWidth={2.4} /></span>
                <span>git<span>charts</span></span>
              </a>
              <details className="main-menu">
                <summary aria-label="open main menu" title="main menu"><MenuIcon size={18} /><span>menu</span></summary>
                <nav className="main-menu-panel" aria-label="main menu">
                  <a href="/">explore repositories</a>
                  <a href="/license">license &amp; credits</a>
                  <a href="https://github.com/Cranbero" target="_blank" rel="noreferrer">cranbero on github <ArrowUpRight size={14} /></a>
                </nav>
              </details>
            </header>

            <main className="workspace">
        {isLicensePage ? (
          <section className="license-page">
            <a className="back-link" href="/">← back to charts</a>
            <pre className="license-copy">{`Cranbero License

Version 26.1.0 October, 2026
TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION
Established by  Seok-bong, Hunter Tigner.

1. Redistributing base-projects

You may redistribute base projects, but if the code includes a 0.6:1.0 similarity ratio, this exceeds the usage permissions and is code plagiarism, as mentioned in Term 3. Term 8 and Term 9 may apply. 

2. Authors of base-project

If an author's name of any kind (display, user, email, real, and other similar things.) exceeds 25 characters, a separate CREDITS file may be used. The NOTICE file must reference the CREDITS file. this is to prevent abuse so base-project author can't abuse and bloat NOTICE file with 1,000 letters to be annoying 

3. Usage Permissions

By using the project, you can copy an amount of 0.3:1.0 similarity ratio, pass: This exceeds the usage permissions being code plagiarism, and abuses the license. It may result in an immediate cease-and-desist, a DMCA takedown, or license revocation under Section 9.

4. Brand Identity 

Logos may not exceed a 0.6:1.0 similarity ratio, and banners may not exceed 0.1:1.0. Exceeding these limits is considered brand theft, resulting in an immediate Cease-and-Desist, DMCA Takedown, or license revocation under Section 9.

5. Expiration Date

Expiration Date (Optional by base-project) Expiration date is optional for creators of base-project but must include a valid date within 0 to 2 years. Expiration date is optional for the base-project. Expiration date is optional. Use this if you don't want people copying your project to make their own project based on yours, and you don't want them using base-project forever as their default.

6. Limitation Of Liability for (new-project / base-project)

Damage of individuals computer, is not new-projects fault if new-project includes 0-10% harm rate (0-10% means file-move, file-delete, no system-breaks,) if more than 10% or more than list described, than new-project is at fault of visitors computer breaking.

7. Severability  

redistributing the new-project and converting it into an illegal new-project, with source-code that violates laws in countries mentioned: United States, Benin, Mexico. As this may cause you to go to jail or cause A lawsuit between A user and the author of new-project but also visitors, visiting new-project.

8. Revocation time

Revocation Time (Required by base-project) Revocation Time is required for creators of base-project but must include a valid date within 70 to 125 days. Revocation Time date is required for the base-project. Revocation Time is required.  
this is for if the base-project creators, don't want people immediately coming back to use base-project after a few days.

9. Revocation of rights

$54-fine if the base-project contains, 95 assets, with 5,000 lines of program-code (not text) (No Paid assets)
$27-fine if the base-project contains, 95 assets, with 5,000 lines of program-code (not text) (Paid assets)

$54-fine if the base-project contains, 190 assets, with 6,250 lines of program-code (not text) (No Paid assets)
$108-fine if the base-project contains, 190 assets, with 6,250 lines of program-code (not text) (Paid assets)

$108-fine if the base-project contains, 380 assets, with 8,560 lines of program-code (not text) (No Paid assets)
$216-fine if the base-project contains, 380 assets, with 8,560 lines of program-code (not text) (Paid assets)

$362-fine if the base-project contains, 720 assets, with 18,120 lines of program-code (not text) (No Paid assets)
$725-fine if the base-project contains, 720 assets, with 18,120 lines of program-code (not text) (Paid assets)

$760-fine if the base-project contains, 1,520 assets, with 36,450 lines of program-code (not text) (No Paid assets)
$1,520-fine if the base-project contains, 1,520 assets, with 36,450 lines of program-code (not text) (Paid assets)

if a new-project copies this than they pay that amount to base-project authors, to use it again, not needed but pay if want to use or wait Revocation time (8), and if done again you wait again to use.

10. Previous License Versions

Any individual developer/team/company using previous license versions will stay on that license until they decide to update it. If not, they will continue on the old license version with the exact replica of the original license terms and conditions.

11. Dictionary

$-fine = An owed amount of money, to use base-project, again if new-project revocations of rights.

Revocation = Revoking rights and crossing the line 

0.N:1.0 = Ratio of how similar a project can be. The third digit "N" is A number if it is A number 1-9 it means the percentage multiplied by 10, 0.5:1.0 = (50%/100%)

Individual = Human using the software, new-project or base-project 

Individual developer = human creating a new project or base project 

Team = A small group of humans (5-35) that have created a new-project or base-project 

Company = A large group of humans (100-5,000) that have created a new project or base project

12. Limitation Of Liability for (Cranbero)

Any individual developer/team/company using this license, if anything goes wrong using the license, for example, to abuse it: you can send feedback, but not sue us. If any individual computer has broken or passed the 0-10% harm rate, any individual cannot do any suing to Cranbero License due to, we have no fault creator is at fault if goes wrong within 0-10% harm-rate, if A individual/team/company using this license detects A abuse switch to A safer license or closed-source while we fix the abuse. `}</pre>
          </section>
        ) : (
          <>
            <section className="intro">
              <div className="eyebrow"><span>01</span> repository explorer</div>
              <h1>what&apos;s this repo<br /><span>made of?</span></h1>
              <p>see the language mix behind any public github project.</p>
            </section>

            <form className="search-form" onSubmit={analyze}>
          <label htmlFor="repository">github repository</label>
          <div className="search-row">
            <div className="input-wrap"><Github size={19} aria-hidden="true" />
              <input
                id="repository"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="owner / repository"
                autoComplete="url"
                aria-describedby={error ? 'search-error' : 'search-hint'}
              />
            </div>
            <button className="analyze-button" type="submit" disabled={loading}>
              <Search size={17} />
              <span>{loading ? 'loading...' : 'analyze repo'}</span>
            </button>
          </div>
          <div className="form-footnote">
            {error ? <span id="search-error" className="error-message">{error}</span> : <span id="search-hint">paste a github url or use <strong>owner/repo</strong></span>}
            <span>public repos only</span>
          </div>
          </form>

          <section className={`results ${repository ? 'has-results' : ''}`} aria-live="polite">
          {repository ? (
            <>
              <div className="results-heading">
                <div>
                  <div className="eyebrow"><span>02</span> language breakdown</div>
                  <h2><a href={repository.url} target="_blank" rel="noreferrer">{repository.name.toLowerCase()}<ArrowUpRight size={20} /></a></h2>
                  {repository.description && <p className="repo-description">{repository.description.toLowerCase()}</p>}
                </div>
                <a className="repo-star" href={repository.url} target="_blank" rel="noreferrer"><Star size={15} /> {repository.stars.toLocaleString()} <span>stars</span></a>
              </div>

              {languages.length > 0 ? (
                <>
                  <div className="chart-meta"><span>language</span><span>code share</span><span>size</span></div>
                  <div className="language-list">
                    {languages.map((item) => {
                      const percent = totalBytes ? (item.bytes / totalBytes) * 100 : 0;
                      return (
                        <div className="language-row" key={item.language}>
                          <div className="language-name"><span className="language-dot" style={{ '--language-color': languageColors[item.language] ?? '#728477' } as React.CSSProperties} /><span>{item.language.toLowerCase()}</span></div>
                          <div className="bar-cell">
                            <div className="bar-track"><div className="bar-fill" style={{ width: `${percent}%`, '--language-color': languageColors[item.language] ?? '#728477' } as React.CSSProperties} /></div>
                            <span className="percentage">{percent.toFixed(percent >= 10 ? 0 : 1)}%</span>
                          </div>
                          <span className="language-size">{formatBytes(item.bytes)}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="chart-footer"><span>{languages.length} {languages.length === 1 ? 'language' : 'languages'} detected</span><span><ArrowDownToLine size={14} /> {formatBytes(totalBytes)} total code</span></div>
                </>
              ) : (
                <div className="empty-languages">no language data is available for this repository yet.</div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon"><ChartNoAxesColumnIncreasing size={25} /></div>
              <div><strong>your next repo, visualized.</strong><p>enter a repository above to see its language breakdown.</p></div>
              <span className="empty-index">github api · languages</span>
            </div>
          )}
            </section>
          </>
        )}

        <footer className="page-footer">
          <a href="/license">license &amp; credits</a>
          <a href="https://github.com/Cranbero" target="_blank" rel="noreferrer">see more by cranbero <ArrowUpRight size={13} /></a>
          <a href="https://github.com/Cranbero/cranbero" target="_blank" rel="noreferrer">cranbero/cranbero on github <ArrowUpRight size={13} /></a>
        </footer>
          </main>
        </>
      )}
    </div>
  );
}

export default App;