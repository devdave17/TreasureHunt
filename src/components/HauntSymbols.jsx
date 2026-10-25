// Original, lightweight icon set shared by the player and admin interfaces.
const paths = {
  door: 'M5 21V4l12-2v19M3 21h18M9 4h10v17M13 12h.01',
  key: 'M15 7a5 5 0 1 1-4 8L3 23l-2-2 8-8a5 5 0 0 1 6-6ZM14 10h.01',
  code: 'm8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18',
  send: 'm3 3 19 9-19 9 4-9-4-9Zm4 9h15',
  lock: 'M5 11h14v11H5ZM8 11V7a4 4 0 0 1 8 0m-4 12v-3',
  repeat: 'm18 2 4 4-4 4M2 11V8a2 2 0 0 1 2-2h18M6 22l-4-4 4-4m16-1v3a2 2 0 0 1-2 2H2',
  treasure: 'M3 10h18v11H3ZM3 10V7a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5v3M2 14h20m-12-2h4v5h-4ZM7 3v7m10-7v7',
  skull: 'M8 18H6v-5a8 8 0 1 1 12 0v5h-2v4H8Zm2 0v4m4-4v4M7 10h2v2H7Zm8 0h2v2h-2Zm-4 4 1-2 1 2',
  spider: 'M12 9a4 6 0 1 1 0 12 4 6 0 0 1 0-12ZM8 12 3 7 1 10m7 5H2l-1 4m7-1-4 3-1 2m13-11 5-5 2 3m-7 5h6l1 4m-7-1 4 3 1 2M12 1v8',
  chart: 'M3 3v18h19M7 16v-4m5 4V7m5 9v-7',
  users: 'M16 21v-3a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v3m20 0v-3a4 4 0 0 0-3-4M9 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm9 0a4 4 0 0 1 0 8',
  flag: 'M4 22V2c6-4 10 5 16 1v12c-6 4-10-5-16-1',
};

export function RuneIcon({ name = 'skull', className = '' }) {
  return <svg className={`rune-icon ${className}`} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.skull} /></svg>;
}

export function PumpkinMark({ className = '' }) {
  return <svg className={`pumpkin-mark ${className}`} width="48" height="48" viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M31 17c-3-8 1-12 7-13" stroke="#9bc071" strokeWidth="4" strokeLinecap="round"/><path d="M32 18C11 8-1 29 10 48c7 11 15 10 22 8 9 3 20 0 25-11 8-19-6-35-25-27Z" fill="#ff7a1a"/><path d="M26 18c-11 8-11 27 0 38m12-38c11 8 11 27 0 38" stroke="#b64010" strokeWidth="2"/><path d="m23 29-8 6 8 6m18-12 8 6-8 6m-6-14-6 17" stroke="#1b0c1d" strokeWidth="3" strokeLinejoin="round"/><path d="m18 48 8 3 6-3 6 3 8-3" stroke="#291023" strokeWidth="2" strokeLinecap="round"/></svg>;
}
