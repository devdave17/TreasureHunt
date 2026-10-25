/* Dev-only visual/interaction fixtures. Not an application entry point; never contacts a backend. */
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { api } from '../src/admin/api';
import { gameApi } from '../src/services/gameApi';

if (!import.meta.env.DEV) throw new Error('Design previews are available only in the development server.');
const initial = new URLSearchParams(location.search).get('screen') || 'landing';
const now = Date.now();
const user = { id: 'preview-user', name: 'Mira Shah', email: 'mira@example.test', currentLevel: 3, level: 3, completedLevels: [1, 2], isBlocked: false, score: 20 };
const questions = Array.from({ length: 5 }, (_, i) => ({ id: `preview-q${i}`, level: i + 1, title: ['The Whispering Array', 'A Stack of Lost Souls', 'The Hollow Loop', 'Graveyard of Pointers', 'The Final Invocation'][i], riddleText: 'I hold what came before, yet speak what comes next.\nGive the shadows a number, and I will show you the rest.', inputKey: '7 3 9 1 5', problemStatement: '<p>Deep within the haunted archive, a sequence of numbers guards the next door. Given an array of integers, find the sum of the two largest distinct values.</p><h3>Input format</h3><p>The provided input key contains space-separated integers. There are at least two distinct values.</p><h3>Example</h3><pre><code>Input:  7 3 9 1 5\nOutput: 16</code></pre><h3>Constraints</h3><ul><li>2 ≤ N ≤ 100000</li><li>−1000000 ≤ each value ≤ 1000000</li></ul>', correctAnswer: '16', difficulty: i < 2 ? 'Easy' : i < 4 ? 'Medium' : 'Hard', score: 10 }));
const quests = [
  { id: 'preview-live', code: 'TOC-01', name: 'The Haunted Archive', description: 'The books whisper in binary. Follow their clues before the last candle burns out.', durationMinutes: 120, startAtMs: now - 600000, isActive: true, totalQuestions: 5 },
  { id: 'preview-ended', code: 'TOC-02', name: 'Graveyard of Lost Code', description: 'Some programs never terminate. Some souls never leave. This gate has closed.', durationMinutes: 90, startAtMs: now - 10000000, isActive: true, totalQuestions: 5 },
  { id: 'preview-upcoming', code: 'TOC-03', name: 'The Midnight Invocation', description: 'A new curse is stirring beneath the mansion. Return when the gates open.', durationMinutes: 60, startAtMs: now + 3600000, isActive: true, totalQuestions: 5 },
  { id: 'preview-available', code: 'TOC-04', name: 'The Endless Crypt', description: 'A descent through forgotten algorithms, open to every fearless code hunter.', durationMinutes: 60, isActive: true, totalQuestions: 5 },
];
const rankings = ['Mira Shah', 'Aryan Patel', 'An exceptionally long participant name for responsive layout checking', 'Riya Mehta'].map((name, i) => ({ ...user, id: `preview-u${i}`, userId: `preview-u${i}`, rank: i + 1, name, email: `hunter${i + 1}@example.test`, totalScore: 100 - i * 13, mapScore: 100 - i * 10, hackerRankScore: 100 - i * 14, solvedQuestions: 5 - i, currentLevel: 6 - i, completedQuestionLevels: [1, 2], questionCompletionSeconds: { 1: 140, 2: 250 }, totalCompletionSeconds: 390 + i * 60 }));
const rankingPayload = { quest: quests[0], summary: { participantCount: 4, completedCount: 1 }, rankings };

// Block every transport, including unexpected endpoints, before rendering any fixture.
const fetchLocalAsset = window.fetch.bind(window);
window.fetch = async (input, options) => {
  if (input === '/win_audio.mpeg') return fetchLocalAsset(input, options);
  throw new Error('Network disabled in isolated design preview.');
};
for (const name of Object.keys(api)) api[name] = async () => { throw new Error('Mutation disabled in design preview.'); };
api.getQuests = async () => quests;
api.getQuestions = async () => questions;
api.getUserStats = async () => ({ totalUsers: 4, activeUsers: 3, blockedUsers: 1, levelDistribution: { 1: 1, 2: 2, 3: 1 } });
api.getUsers = async (_token, _role, options) => options ? { users: rankings, pagination: { page: 1, limit: 50, total: 4, totalPages: 1 } } : rankings;
api.getQuestRanking = async () => rankingPayload;
gameApi.getQuestRanking = async () => rankingPayload;

let PlayerPages;
let Admin;
let AdminLayout;
if (initial.startsWith('admin')) {
  ({ default: Admin } = await import('../src/admin/Admin'));
  ({ default: AdminLayout } = await import('../src/admin/components/AdminLayout'));
} else {
  await import('../src/index.css');
  const modules = await Promise.all([
    import('../src/components/LandingScreen'), import('../src/components/StartScreen'), import('../src/components/QuestScreen'), import('../src/components/MapScreen'), import('../src/components/RiddleScreen'), import('../src/components/WinnerScreen'), import('../src/components/RankingScreen'), import('../src/components/Timer'), import('../src/components/HorrorAtmosphere'), import('../src/components/HauntDialog'),
  ]);
  PlayerPages = modules.map(module => module.default);
  await import('../src/horror.css');
  await import('../src/horror-overdrive.css');
}

export default function Preview() {
  const [screen, setScreen] = useState(initial);
  const [selected, setSelected] = useState('preview-live');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [solved, setSolved] = useState(initial === 'solved');
  const [dialog, setDialog] = useState(false);
  const [loginError, setLoginError] = useState('');
  const tools = <nav className="qa-toolbar" aria-label="Design preview"><b>UI PREVIEW · SAMPLE DATA</b><select aria-label="Preview screen" value={screen} onChange={event => { const next = event.target.value; if (next.startsWith('admin') || initial.startsWith('admin')) { location.search = `?screen=${next}`; return; } setError(''); setSolved(next === 'solved'); setScreen(next); scrollTo(0, 0); }}>{['landing', 'login', 'lobby', 'empty', 'error', 'map', 'question', 'long-question', 'final-question', 'solved', 'complete', 'expired', 'blocked', 'ranking', 'dialog', 'admin', 'admin-login'].map(value => <option key={value}>{value}</option>)}</select></nav>;
  let content;
  if (initial.startsWith('admin')) content = initial === 'admin-login' ? <Admin/> : <AdminLayout authToken="preview-only" role="admin" onLogout={() => { location.search = '?screen=admin-login'; }}/>;
  else {
    const [Landing, Login, Lobby, Map, Question, Results, Ranking, Timer, Atmosphere, Dialog] = PlayerPages;
    const id = { landing: 'landing', login: 'start', lobby: 'quest', empty: 'quest', error: 'quest', map: 'map', question: 'riddle', 'long-question': 'riddle', 'final-question': 'riddle', solved: 'riddle', ranking: 'ranking', dialog: 'map' }[screen] || 'winner';
    const go = (next) => { setScreen(next); scrollTo(0, 0); };
    const riddle = { ...questions[0], num: 1, stage: 'CHECKPOINT 01 / THE ARCHIVE', title: questions[0].title, riddle: questions[0].riddleText, problem: questions[0].problemStatement };
    if (screen === 'long-question') riddle.problem += '<h3>Long output and formatting check</h3><pre><code>' + 'an_extremely_long_identifier_'.repeat(35) + '</code></pre><p>' + 'Read the full constraints before submitting. '.repeat(35) + '</p><table><tbody><tr>' + '<td>Very wide sample data</td>'.repeat(15) + '</tr></tbody></table>';
    const onAnswer = output => { setSubmitting(true); setTimeout(() => { setError(output === '16' ? '' : 'Incorrect answer. Please check your output and try again.'); setSolved(output === '16'); setSubmitting(false); if (screen === 'final-question' && output === '16') go('complete'); }, 600); };
    content = <>{screen !== 'ranking' && <Atmosphere screen={`screen-${id}`}/>}<section className={screen === "ranking" ? "" : "screen active"} id={screen === "ranking" ? "qa-ranking-container" : `screen-${id}`}>
        {screen === 'landing' ? <Landing onStart={() => go('login')}/> : screen === 'login' ? <Login onBack={() => go('landing')} onSubmit={() => setLoginError('Preview: credentials were not sent.')} loginError={loginError}/> : ['lobby', 'empty', 'error'].includes(screen) ? <Lobby userDetails={user} quests={screen === 'empty' ? [] : quests} selectedQuestId={selected} onQuestChange={setSelected} onOpenQuest={() => go('map')} onLogout={() => go('landing')} questError={screen === 'error' ? 'Preview: the quest service is temporarily unavailable.' : ''}/> : ['map', 'dialog'].includes(screen) ? <><Timer timeRemaining={3510}/><Map questions={questions} solvedCount={2} activeRiddle={3} onNodeClick={() => go('question')} onExit={() => setDialog(true)} levelCounts={{ 1: 4, 2: 3, 3: 2 }}/></> : ['question', 'long-question', 'final-question', 'solved'].includes(screen) ? <><Timer timeRemaining={3510}/><Question riddle={riddle} isSolved={solved} isSubmitting={submitting} submissionError={error} onSubmit={onAnswer} onBack={() => go('map')}/></> : screen === 'ranking' ? <Ranking questId="preview-live" onBack={() => go('lobby')}/> : <Results key={screen} isActive={true} isTimeExpired={screen === 'expired'} isBlockedByInvigilator={screen === 'blocked'} userDetails={user} solvedCount={screen === 'complete' ? 5 : 2} totalRiddles={5} finalElapsedSeconds={2390} onReset={() => go('lobby')} onExit={() => go('landing')}/>}
    </section>{dialog && <Dialog className="horror-game-dialog" labelId="qa-dialog-title" onClose={() => setDialog(false)}><div className="profile-modal"><h2 className="exit-confirm-heading" id="qa-dialog-title">Leave the haunted trail?</h2><p className="exit-confirm-message">This isolated preview does not change a real quest.</p><div className="exit-confirm-actions"><button className="btn-primary" onClick={() => go('lobby')}>Exit</button><button className="btn-secondary" onClick={() => setDialog(false)}>Stay in the hunt</button></div></div></Dialog>}</>;
  }
  return <>{tools}{content}<style>{`.qa-toolbar{position:relative;z-index:50;display:flex;align-items:center;justify-content:space-between;gap:16px;background:#321d41;color:#e2c3f1;padding:9px 16px;font:10px monospace;border-bottom:1px solid #b38acc50}.qa-toolbar select{background:#1b1026;color:#eee0f5;padding:5px 8px;border:1px solid #b38acc50}.qa-toolbar b{font-weight:400;font-size:9px;letter-spacing:1px}`}</style></>;
}

createRoot(document.getElementById('root')).render(<Preview/>);
