// Original vector apparition. Animation is entirely decorative and never captures input.
export default function DreadEntity({ className = '' }) {
  return <svg className={`dread-entity ${className}`} viewBox="0 0 360 440" fill="none" aria-hidden="true">
    <path className="dread-shroud" d="M180 8C78 4 36 111 53 222L8 403l65-25-12 52 76-40 43 45 43-45 76 40-12-52 65 25-45-181C324 111 282 4 180 8Z" fill="#08080b"/>
    <path d="M181 36C100 20 65 139 88 223l29 56 10-106 54-112 50 111 12 107 29-56c24-84-10-203-91-187Z" fill="#17141b"/>
    <path className="dread-mask" d="m119 110 22-28 39-15 38 15 24 28 6 68-25 57-19 60-24 34-25-34-19-60-24-57 7-68Z" fill="#ada4a0"/>
    <path d="m126 118 38 12-12 33-28 6-7-25 9-26Zm108 0-38 12 12 33 28 6 7-25-9-26Z" fill="#0b080d"/>
    <path className="dread-eye" d="m127 140 27 1-13 10-14-11Zm106 0-27 1 13 10 14-11Z" fill="#ff442a"/>
    <path d="m180 162-15 38 15-7 15 7-15-38Z" fill="#231a20"/>
    <path className="dread-mouth" d="M158 223q22-42 44 0l4 51-26 44-26-44 4-51Z" fill="#120a12"/>
    <path d="m160 219 7 17 5-22 8 20 8-20 5 22 7-17m-42 60 9-16 6 26 7-16 7 16 6-26 9 16" stroke="#c4bab0" strokeWidth="4"/>
    <path d="m138 88 6 27-8 12 8 13m77-45-8 18 9 9-6 15m-70 48-12 19 12 19-7 20m78-58 12 19-12 19 7 20m-48-133-6 16 8 12-8 20" stroke="#403038" strokeWidth="3"/>
    <path className="dread-tear" d="m135 161 5 52m83-52-5 52" stroke="#8a222b" strokeWidth="4"/>
    <g className="dread-hand dread-hand-left" stroke="#a69a98" strokeWidth="8" strokeLinecap="round"><path d="m59 298-19-38-4-54m23 93 4-68-7-45m15 120 12-66 1-40m-11 115 26-44 13-39m-61 76-34-25-15-31"/><path d="m39 281 3 54 25 32 30-14 17-39-18-35Z" fill="#292028" strokeWidth="3"/></g>
    <g className="dread-hand dread-hand-right" stroke="#a69a98" strokeWidth="8" strokeLinecap="round"><path d="m301 298 19-38 4-54m-23 93-4-68 7-45m-15 120-12-66-1-40m11 115-26-44-13-39m61 76 34-25 15-31"/><path d="m321 281-3 54-25 32-30-14-17-39 18-35Z" fill="#292028" strokeWidth="3"/></g>
  </svg>;
}
