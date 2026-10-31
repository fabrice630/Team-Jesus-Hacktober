import { useState } from 'react';
import { analyzeDebugRequest } from './api';
import type { DebugResponse, ResponseLanguage } from './types';

const languages = ['JavaScript', 'Python'];
const MAX_CODE_LENGTH = 20_000;
const MAX_ERROR_LENGTH = 2_000;

const starterCode = `function greetUser(name) {
  return ` + '`${hello}, ${name}!`' + `;
}

console.log(greetUser());`;

const starterError = `ReferenceError: hello is not defined`;

function App() {
  const [language, setLanguage] = useState('JavaScript');
  const [code, setCode] = useState(starterCode);
  const [errorMessage, setErrorMessage] = useState(starterError);
  const [description, setDescription] = useState('');
  const [responseLanguage, setResponseLanguage] = useState<ResponseLanguage>('en');
  const [result, setResult] = useState<DebugResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [isDark, setIsDark] = useState(false);

  const canSubmit = !isLoading;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!code.trim() || !errorMessage.trim()) {
      setError('Add both the code and the error message before analyzing.');
      return;
    }

    setError('');
    setResult(null);
    setIsLoading(true);
    try {
      const response = await analyzeDebugRequest({
        language,
        code,
        error_message: errorMessage,
        description: description || undefined,
        response_language: responseLanguage,
      });
      setResult(response);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  }

  async function copyText(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(() => setCopied(''), 1800);
    } catch {
      setError('Copying is not available in this browser.');
    }
  }

  function updateLimited(setter: (value: string) => void, value: string, limit: number) {
    setter(value.slice(0, limit));
  }

  return (
    <div className={`app-shell ${isDark ? 'dark' : ''}`}>
      <header className="topbar">
        <a className="brand" href="#workspace" aria-label="DevAid AI home">
          <span className="brand-mark" aria-hidden="true">+</span>
          <span>DevAid <em>AI</em></span>
        </a>
        <nav className="topnav" aria-label="Primary navigation">
          <a className="active" href="#workspace">Debug workspace</a>
          <a href="#how-it-works">How it works</a>
        </nav>
        <button className="theme-toggle" type="button" onClick={() => setIsDark((value) => !value)} aria-label="Toggle color theme">
          <span aria-hidden="true">{isDark ? '☼' : '◐'}</span>
          {isDark ? 'Light' : 'Dark'}
        </button>
      </header>

      <main id="workspace" className="page-grid">
        <section className="intro-column">
          <p className="eyebrow"><span className="live-dot" /> AI for all developers</p>
          <h1>From stuck<br /><span>to shipping.</span></h1>
          <p className="intro-copy">Understand the error. See the fix. Keep your momentum.</p>
          <div className="trust-note">
            <span className="mini-icon">◎</span>
            <p><strong>Built for humans who build.</strong><br />Clear explanations for every experience level.</p>
          </div>
          <div id="how-it-works" className="steps">
            <div className="step"><span>01</span><p><strong>Describe</strong><br />Share your code and error.</p></div>
            <div className="step"><span>02</span><p><strong>Understand</strong><br />Get the why, not just the what.</p></div>
            <div className="step"><span>03</span><p><strong>Verify</strong><br />Test the fix with confidence.</p></div>
          </div>
        </section>

        <section className="workspace-card" aria-labelledby="workspace-title">
          <div className="card-heading">
            <div>
              <p className="section-kicker">01 / Debugger</p>
              <h2 id="workspace-title">What are you working on?</h2>
            </div>
            <span className="status-pill"><span className="status-dot" /> Ready</span>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-row compact-row">
              <label>
                <span>Language</span>
                <select value={language} onChange={(event) => setLanguage(event.target.value)}>
                  {languages.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label>
                <span>Response language</span>
                <select value={responseLanguage} onChange={(event) => setResponseLanguage(event.target.value as ResponseLanguage)}>
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                </select>
              </label>
            </div>

            <label className="field-label" htmlFor="code-input">Your code <small>{code.length.toLocaleString()} / {MAX_CODE_LENGTH.toLocaleString()}</small></label>
            <textarea id="code-input" className="code-input" value={code} onChange={(event) => updateLimited(setCode, event.target.value, MAX_CODE_LENGTH)} spellCheck={false} aria-describedby="code-help" />
            <span id="code-help" className="field-help">Paste the smallest reproducible example.</span>

            <label className="field-label" htmlFor="error-input">Error message <small>{errorMessage.length.toLocaleString()} / {MAX_ERROR_LENGTH.toLocaleString()}</small></label>
            <textarea id="error-input" className="error-input" value={errorMessage} onChange={(event) => updateLimited(setErrorMessage, event.target.value, MAX_ERROR_LENGTH)} placeholder="Paste the full error or stack trace" />

            <label className="field-label" htmlFor="description-input">Context <span className="optional">Optional</span></label>
            <textarea id="description-input" className="description-input" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What were you trying to do when this happened?" rows={2} />

            {error && <div className="alert error-alert" role="alert"><span aria-hidden="true">!</span>{error}</div>}

            <button className="analyze-button" disabled={!canSubmit} type="submit">
              {isLoading ? <><span className="spinner" /> Analyzing...</> : <>Analyze error <span aria-hidden="true">↗</span></>}
            </button>
            <p className="privacy-note"><span aria-hidden="true">⌁</span> Your code is only sent when you press Analyze.</p>
          </form>
        </section>
      </main>

      {result && <Results result={result} copied={copied} onCopy={copyText} />}
      {!result && !isLoading && <div className="empty-hint"><span>↳</span> Your analysis will appear here</div>}
      {isLoading && <div className="loading-panel" aria-live="polite"><span className="spinner dark-spinner" /> Reading your code and tracing the error...</div>}

      <footer><span>DevAid AI</span><span>Made for the open source community</span><span>v0.1 · AI can make mistakes</span></footer>
    </div>
  );
}

function Results({ result, copied, onCopy }: { result: DebugResponse; copied: string; onCopy: (label: string, text: string) => void }) {
  return (
    <section className="results-section" aria-labelledby="results-title">
      <div className="results-header">
        <div><p className="section-kicker">02 / Your analysis</p><h2 id="results-title">Here’s what we found.</h2></div>
        <span className="confidence-pill">AI-assisted · Review before applying</span>
      </div>
      <div className="result-grid">
        <article className="result-block error-type-block"><p className="result-label">Error type</p><h3>{result.error_type}</h3></article>
        <article className="result-block"><p className="result-label">The explanation</p><p>{result.explanation}</p><button className="copy-link" type="button" onClick={() => onCopy('explanation', result.explanation)}>{copied === 'explanation' ? 'Copied' : 'Copy explanation'}</button></article>
        <article className="result-block"><p className="result-label">Probable cause</p><p>{result.probable_cause}</p></article>
        <article className="result-block correction-block"><p className="result-label">Suggested correction</p><p>{result.suggested_correction}</p></article>
        <article className="result-block code-result"><div className="result-block-top"><p className="result-label">Corrected code</p><button className="copy-link" type="button" onClick={() => onCopy('code', result.corrected_code)}>{copied === 'code' ? 'Copied' : 'Copy code'}</button></div><pre><code>{result.corrected_code || 'No code correction was returned.'}</code></pre></article>
        <article className="result-block"><p className="result-label">Verification steps</p><ol className="verification-list">{(result.verification_steps.length ? result.verification_steps : ['Run the original reproduction case again.', 'Add a regression test for the fixed behavior.']).map((step, index) => <li key={`${step}-${index}`}>{step}</li>)}</ol></article>
      </div>
      <div className="warning-banner"><span aria-hidden="true">△</span><div><strong>Keep your reviewer hat on.</strong><p>{result.warnings[0] ?? 'AI suggestions can be incomplete or incorrect. Understand and test every change before using it in production.'}</p></div></div>
    </section>
  );
}

export default App;
