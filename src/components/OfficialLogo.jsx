import { useState } from 'react';

export default function OfficialLogo({ seal = false, className = '' }) {
  const [failed, setFailed] = useState(false);
  return <span className={`official-logo ${seal ? 'official-seal' : ''} ${className}`}>
    {failed ? <span className="official-logo-fallback">{'COUT<<MASTERS;'}</span> : <img src={seal ? '/CC-logo.png' : '/logo.png'} alt="COUT Masters — Coding Club, IIIT Vadodara" loading={seal ? "lazy" : "eager"} decoding="async" width={seal ? 1024 : 640} height={seal ? 1024 : 396} onError={() => setFailed(true)}/>}
  </span>;
}
