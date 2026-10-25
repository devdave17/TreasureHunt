import { useEffect, useRef, useState } from "react";
import "./TreasureReveal.css";
import { playPreparedVictoryAudio, prepareVictoryAudio } from "../utils/victoryAudio";

function playVictoryMusic(track) {
  if (track.error) track.load();
  track.currentTime = 0;
  track.volume = 0.65;
  return track.play();
}

// Mounting on the active success screen starts the reward immediately.
// The recorded result never depends on animation or browser audio permission.
export default function TreasureReveal() {
  const [take, setTake] = useState(1);
  const [muted, setMuted] = useState(false);
  const [sound, setSound] = useState("loading");
  const audio = useRef(null);
  const playback = useRef(0);
  const preparedTrack = useRef(null);

  useEffect(() => {
    const track = audio.current;
    const attempt = ++playback.current;
    let disposed = false;
    const start = async () => {
      if (document.hidden) return;
      const prepared = await playPreparedVictoryAudio({ isMuted: () => track.muted, onEnded: () => setSound("ended") });
      if (disposed || attempt !== playback.current || document.hidden) { prepared?.stop(); return; }
      preparedTrack.current = prepared;
      if (prepared) setSound("playing");
      else await playVictoryMusic(track);
    };
    start().catch(error => {
      if (attempt === playback.current) setSound(error.name === "NotAllowedError" ? "blocked" : "unavailable");
    });
    const pauseOnHide = () => {
      if (!document.hidden) return;
      playback.current += 1;
      track.pause();
      if (preparedTrack.current) {
        preparedTrack.current.stop();
        preparedTrack.current = null;
        setSound("paused");
      }
    };
    document.addEventListener("visibilitychange", pauseOnHide);
    return () => {
      playback.current += 1;
      disposed = true;
      preparedTrack.current?.stop();
      preparedTrack.current = null;
      document.removeEventListener("visibilitychange", pauseOnHide);
      track.pause();
      track.currentTime = 0;
    };
  }, []);

  const play = async () => {
    const track = audio.current;
    const attempt = ++playback.current;
    preparedTrack.current?.stop();
    preparedTrack.current = null;
    track.pause();
    setSound("loading");
    try {
      await prepareVictoryAudio();
      if (attempt !== playback.current || document.hidden) return;
      const prepared = await playPreparedVictoryAudio({ isMuted: () => track.muted, onEnded: () => setSound("ended") });
      if (attempt !== playback.current || document.hidden) { prepared?.stop(); return; }
      preparedTrack.current = prepared;
      if (prepared) setSound("playing");
      else await playVictoryMusic(track);
    } catch (error) {
      if (attempt === playback.current) setSound(error.name === "NotAllowedError" ? "blocked" : "unavailable");
    }
  };

  const openTreasure = () => {
    setTake(previous => previous + 1);
    play();
  };

  const toggleMute = () => {
    audio.current.muted = !muted;
    preparedTrack.current?.mute(!muted);
    setMuted(!muted);
  };

  const status = sound === "blocked" ? "Treasure unlocked. Your browser blocked automatic sound; replay to hear the music." :
    sound === "unavailable" ? "Treasure unlocked. Music could not play; replay to try again." :
    muted ? "Treasure unlocked. Music muted." :
    sound === "playing" ? "Treasure unlocked. Victory music playing." :
    sound === "paused" ? "Treasure unlocked. Music paused; replay to hear it again." :
    "Treasure unlocked. You broke the final seal.";

  return <div className="treasure-reveal is-open">
    <audio ref={audio} src="/win_audio.mpeg" preload="auto"
      onPlaying={() => setSound("playing")}
      onPause={() => setSound(previous => previous === "unavailable" ? previous : "paused")}
      onEnded={() => setSound("ended")}
      onError={() => setSound("unavailable")} />
    <div className="treasure-scene" key={take} aria-hidden="true">
      <div className="treasure-arch" />
      <div className="treasure-halo"><i /><i /><i /></div>
      <p className="treasure-inscription">THE CURSE IS BROKEN</p>
      <div className="treasure-rays" />
      <div className="treasure-haze" />
      <svg className="treasure-chest" viewBox="0 0 640 500" fill="none">
        <defs>
          <linearGradient id="treasure-wood" x1="150" y1="250" x2="460" y2="420" gradientUnits="userSpaceOnUse"><stop stopColor="#71341e"/><stop offset=".5" stopColor="#35131a"/><stop offset="1" stopColor="#190c16"/></linearGradient>
          <linearGradient id="treasure-metal" x1="180" y1="210" x2="430" y2="400" gradientUnits="userSpaceOnUse"><stop stopColor="#ffe3a0"/><stop offset=".35" stopColor="#cf923b"/><stop offset=".7" stopColor="#72502b"/><stop offset="1" stopColor="#f3c866"/></linearGradient>
          <radialGradient id="treasure-core"><stop stopColor="#fff6ce"/><stop offset=".35" stopColor="#ffd76e"/><stop offset="1" stopColor="#ff9d2e" stopOpacity="0"/></radialGradient>
        </defs>
        <ellipse cx="320" cy="440" rx="218" ry="24" fill="#000" opacity=".7"/>
        <ellipse className="treasure-floor-light" cx="320" cy="428" rx="208" ry="35" fill="url(#treasure-core)"/>
        <path d="M160 309 201 268H460L480 309 448 365H180Z" fill="#100a11" stroke="#8d6338" strokeWidth="5"/>
        <g className="treasure-hoard" fill="url(#treasure-metal)" stroke="#ffe3a0" strokeWidth="2">
          <ellipse cx="240" cy="301" rx="31" ry="9"/><ellipse cx="282" cy="289" rx="31" ry="9"/><ellipse cx="334" cy="300" rx="35" ry="10"/><ellipse cx="387" cy="288" rx="31" ry="9"/><ellipse cx="423" cy="308" rx="29" ry="9"/>
          <path d="m309 267 16-16 19 16-19 26Z" fill="#bbffe3"/>
        </g>
        <g className="treasure-lid">
          <path d="M160 302v-35c0-54 34-85 82-85h155c49 0 83 31 83 85v35Z" fill="url(#treasure-wood)" stroke="url(#treasure-metal)" strokeWidth="8"/>
          <path d="M160 267h320M172 225h296M241 183v118M399 183v118" stroke="#190a12" strokeWidth="5"/>
          <path d="M205 301v-40c0-40 11-63 32-77M435 301v-40c0-40-11-63-32-77" stroke="url(#treasure-metal)" strokeWidth="16"/>
          <path d="M161 294h318" stroke="#f7d488" strokeWidth="12"/>
          <path d="M300 269h40v48h-40Z" fill="url(#treasure-metal)" stroke="#ffe3a0" strokeWidth="2"/>
          <path d="m320 279 9 11-9 13-9-13Z" fill="#250f16"/>
          <g fill="#ffdb88"><circle cx="206" cy="263" r="3"/><circle cx="435" cy="263" r="3"/><circle cx="211" cy="226" r="3"/><circle cx="430" cy="226" r="3"/></g>
        </g>
        <ellipse className="treasure-inner-light" cx="320" cy="284" rx="158" ry="58" fill="url(#treasure-core)"/>
        <g className="treasure-prize">
          <path d="m320 149 35 35-35 59-35-59Z" fill="#ffe3a0" stroke="#fff5cf" strokeWidth="2"/>
          <path d="m320 149-10 35 10 59 10-59Z" fill="#fffae4"/><path d="M285 184h70" stroke="#fff7db" strokeWidth="2"/>
          <path d="m320 119 4 12 12 4-12 4-4 12-4-12-12-4 12-4Z" fill="#fff4cc"/>
        </g>
        <path d="M160 309h320l-17 111H177Z" fill="url(#treasure-wood)" stroke="url(#treasure-metal)" strokeWidth="8"/>
        <path d="M169 353h303M175 390h291" stroke="#120a11" strokeWidth="5"/>
        <path d="m206 311 9 107M434 311l-9 107" stroke="url(#treasure-metal)" strokeWidth="17"/>
        <path d="M303 309h34v37h-34Z" fill="url(#treasure-metal)"/><circle cx="320" cy="324" r="6" fill="#25101a"/>
        <g fill="#ffdb88"><circle cx="210" cy="337" r="3"/><circle cx="213" cy="390" r="3"/><circle cx="430" cy="337" r="3"/><circle cx="427" cy="390" r="3"/></g>
        <path d="m269 368-14 12 14 12M371 368l14 12-14 12M327 362l-14 36" stroke="#d7a554" strokeWidth="4"/>
      </svg>
      <div className="treasure-particles">{Array.from({ length: 16 }, (_, i) => <i key={i} style={{ "--spark": i, "--drift": `${(i % 2 ? 1 : -1) * (25 + i * 9)}px` }}>{i % 3 === 0 ? "✦" : "◆"}</i>)}</div>
      <p className="treasure-scene-caption">CLAIMED BY A TRUE CODE HUNTER</p>
    </div>
    <div className="treasure-reveal-controls">
      <button className="hg-button treasure-open-button" onClick={openTreasure} aria-describedby="treasure-reveal-status">Replay the reveal ↻</button>
      <button className="treasure-sound-button" onClick={toggleMute} aria-pressed={muted}>{muted ? "Unmute music" : "Mute music"}</button>
      <p id="treasure-reveal-status" className="treasure-reveal-status" role="status">{status}</p>
    </div>
  </div>;
}
