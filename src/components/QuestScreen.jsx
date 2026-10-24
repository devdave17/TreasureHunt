import { useState, useEffect, useRef } from "react";
import { formatCountdownLabel, formatDateTimeLabel, getQuestStartAtMs, getQuestDurationMinutes } from "../utils/questTiming.js";
import "./QuestScreen.css";

const questArt = ["/halloween/moonlit-shrine.png", "/halloween/haunted-archive.png", "/halloween/treasure-vault.png"];

function getSchedule(quest, now) {
  const startAtMs = quest.startAtMs || quest.startAt ? getQuestStartAtMs(quest) : null;
  const duration = getQuestDurationMinutes(quest);
  const endAtMs = startAtMs === null ? null : startAtMs + duration * 60_000;
  const state = startAtMs === null ? "available" : now < startAtMs ? "upcoming" : now >= endAtMs ? "ended" : "live";
  return { startAtMs, endAtMs, duration, state };
}

function ScheduleDialog({ notice, now, onClose }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  const remaining = Math.max(0, Math.ceil((notice.startAtMs - now) / 1000));
  const ended = Number.isFinite(notice.endAtMs) && now >= notice.endAtMs;
  return (
    <dialog ref={dialogRef} className="haunt-lobby-dialog" aria-labelledby="quest-schedule-title" onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="haunt-lobby-dialog-inner">
        <p className="haunt-lobby-kicker">{ended ? "THIS GATE HAS CLOSED" : remaining > 0 ? "THE GATE OPENS SOON" : "THE GATE IS OPEN"}</p>
        <h2 id="quest-schedule-title">{notice.questName}</h2>
        <p className="haunt-lobby-dialog-copy">{ended ? "This quest's scheduled time has ended. Choose another available quest to continue the hunt." : remaining > 0 ? "Your next adventure is almost here. Return to the lobby when this quest opens." : "This quest is now available. Return to the lobby to start your adventure."}</p>
        {remaining > 0 && <div className="haunt-lobby-countdown"><span>OPENS IN</span><strong>{formatCountdownLabel(remaining)}</strong></div>}
        <dl><div><dt>Status</dt><dd>{ended ? "Ended" : remaining > 0 ? "Not live yet" : "Live now"}</dd></div><div><dt>Scheduled start</dt><dd>{formatDateTimeLabel(notice.startAtMs)}</dd></div>{ended && <div><dt>Scheduled end</dt><dd>{formatDateTimeLabel(notice.endAtMs)}</dd></div>}</dl>
        <button type="button" className="haunt-lobby-primary" onClick={onClose} autoFocus>Back to quests <span aria-hidden="true">→</span></button>
      </div>
    </dialog>
  );
}

export default function QuestScreen({
  userDetails, quests = [], selectedQuestId = "", onQuestChange,
  loadingQuests = false, questError = "", isLaunching = false,
  onOpenQuest, onLogout, shouldShowProfileModal = false,
  onProfileModalShown = () => {}, questLockNotice = null,
  onCloseQuestLockNotice = () => {}, isActive = true,
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [scheduleNotice, setScheduleNotice] = useState(null);
  const profileRef = useRef(null);
  const profileButtonRef = useRef(null);
  const showProfile = profileOpen || shouldShowProfileModal;
  const closeProfile = () => { setProfileOpen(false); onProfileModalShown(); };

  useEffect(() => {
    if (!isActive) return;
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(clock);
  }, [isActive]);

  useEffect(() => {
    if (!showProfile || !isActive) return;
    const dismiss = (event) => {
      if (event.type === "keydown" && event.key !== "Escape") return;
      if (event.type === "keydown" || !profileRef.current?.contains(event.target)) {
        setProfileOpen(false);
        onProfileModalShown();
        if (event.type === "keydown") profileButtonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", dismiss);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", dismiss); };
  }, [showProfile, isActive, onProfileModalShown]);

  const name = String(userDetails?.name || "Code hunter");
  const userInitial = name.trim().charAt(0).toUpperCase() || "?";
  const liveCount = quests.filter((quest) => ["live", "available"].includes(getSchedule(quest, now).state)).length;
  const notice = questLockNotice || scheduleNotice;
  const closeNotice = () => { setScheduleNotice(null); onCloseQuestLockNotice(); };

  return (
    <div className="haunt-lobby">
      <header className="haunt-lobby-header">
        <span className="haunt-lobby-wordmark">Treasure <em>of</em> Code</span>
        <div className="haunt-lobby-account" ref={profileRef}>
          <button ref={profileButtonRef} type="button" className="haunt-lobby-profile-button" aria-label="Player profile" aria-expanded={showProfile} aria-controls="lobby-player-profile" onClick={() => showProfile ? closeProfile() : setProfileOpen(true)}><span className="haunt-lobby-avatar">{userInitial}</span><span className="haunt-lobby-profile-name">{name}</span><span aria-hidden="true">⌄</span></button>
          {showProfile && <div className="haunt-lobby-profile" id="lobby-player-profile"><p className="haunt-lobby-kicker">YOUR HUNTER PROFILE</p><strong>{name}</strong><p>{userDetails?.email || "—"}</p><span>Registered participant</span></div>}
          <button type="button" className="haunt-lobby-logout" disabled={isLaunching} onClick={() => { closeProfile(); onLogout(); }}>Log out <span aria-hidden="true">↗</span></button>
        </div>
      </header>

      <main className="haunt-lobby-main">
        <section className="haunt-lobby-banner" aria-labelledby="quest-lobby-title">
          <img src="/halloween/moonlit-shrine.png" alt="" width="1672" height="941" />
          <div className="haunt-lobby-banner-copy"><p className="haunt-lobby-kicker">WELCOME BACK, {name}</p><h1 id="quest-lobby-title" tabIndex={-1}>Choose your<br /><span>next adventure.</span></h1><p>Beyond every gate, a new mystery.<br />Choose a quest. Follow the clues. Claim the treasure.</p></div>
          <div className="haunt-lobby-banner-note"><span>THE QUEST LOBBY</span><p>Your next chapter starts here.</p></div>
        </section>

        <section className="haunt-lobby-quests" aria-labelledby="available-quests-title">
          <div className="haunt-lobby-section-heading"><div><p className="haunt-lobby-kicker">PICK YOUR PATH</p><h2 id="available-quests-title">The quests await.</h2></div><div className="haunt-lobby-summary">{loadingQuests ? "Loading quests…" : <><span>{quests.length} quests</span><i aria-hidden="true" /><span>{liveCount} open now</span></>}</div></div>
          {questError && <div className="haunt-lobby-error" role="alert">{questError}</div>}
          {loadingQuests ? <div className="haunt-lobby-empty" role="status"><span className="haunt-lobby-loader" aria-hidden="true" /><h3>Uncovering your quests…</h3><p>Gathering the clues for your next adventure.</p></div> : quests.length === 0 ? <div className="haunt-lobby-empty"><span className="haunt-lobby-empty-mark" aria-hidden="true">✦</span><h3>{questError ? "The path is temporarily hidden." : "The gates are quiet for now."}</h3><p>{questError ? "Please try again later or contact your event coordinator." : "New quests will appear here when they are available."}</p></div> : (
            <div className="haunt-lobby-grid">{quests.map((quest, index) => {
              const selected = selectedQuestId === quest.id;
              const schedule = getSchedule(quest, now);
              const statusLabel = { live: "Live now", upcoming: "Opens soon", ended: "Ended", available: "Available" }[schedule.state];
              const showSchedule = schedule.state === "upcoming" || schedule.state === "ended";
              return <article key={quest.id} className={`haunt-quest-card${selected ? " is-selected" : ""}`} style={{ "--quest-delay": `${Math.min(index, 5) * 80 + 180}ms` }} aria-labelledby={`quest-title-${quest.id}`}>
                <div className="haunt-quest-art"><img src={questArt[index % questArt.length]} alt="" loading="lazy" width="1672" height="941" /><span className={`haunt-quest-status status-${schedule.state}`}><i aria-hidden="true" />{statusLabel}</span><span className="haunt-quest-number">QUEST {String(index + 1).padStart(2, "0")}</span>{selected && <span className="haunt-quest-selected">✓ Selected</span>}</div>
                <div className="haunt-quest-body"><p className="haunt-quest-code">{quest.code || "TREASURE QUEST"}</p><h3 id={`quest-title-${quest.id}`}>{quest.name}</h3><p className="haunt-quest-description">{quest.description || "Follow the clues, unlock every checkpoint, and find the treasure waiting at the end."}</p><dl className="haunt-quest-meta"><div><dt>Duration</dt><dd>{schedule.duration.toLocaleString()} min</dd></div><div><dt>{schedule.state === "upcoming" ? "Opens in" : "Format"}</dt><dd>{schedule.state === "upcoming" ? formatCountdownLabel(Math.max(0, (schedule.startAtMs - now) / 1000)) : "Coding hunt"}</dd></div></dl><div className="haunt-quest-actions"><button type="button" className="haunt-lobby-secondary" aria-pressed={selected} disabled={isLaunching} onClick={() => onQuestChange?.(quest.id)} aria-label={`${selected ? "Selected" : "Select"} ${quest.name}`}>{selected ? "Selected" : "Select"}</button><button type="button" className={`haunt-lobby-primary${showSchedule ? " schedule-action" : ""}`} disabled={isLaunching} onClick={() => showSchedule ? setScheduleNotice({ questName: quest.name, ...schedule }) : onOpenQuest?.(quest.id)} aria-label={`${showSchedule ? "View schedule for" : "Start"} ${quest.name}`}>{isLaunching && selected ? "Starting…" : showSchedule ? "View schedule" : "Start quest"}<span aria-hidden="true">{showSchedule ? "↗" : "→"}</span></button></div><a className="haunt-quest-ranking" href={`/ranking/${encodeURIComponent(quest.id)}`} target="_blank" rel="noopener noreferrer">View leaderboard <span aria-hidden="true">↗</span></a></div>
              </article>;
            })}</div>
          )}
        </section>
        <div className="haunt-lobby-tip"><span aria-hidden="true">✦</span><p><strong>A clue before you begin.</strong> Each correct output unlocks the next stage. Keep an eye on the clock once your quest starts.</p></div>
      </main>
      <footer className="haunt-lobby-footer"><span>CELEBRO</span><span>CRACK THE CLUES. SOLVE THE CODE.</span><span>CODING CLUB, IIIT VADODARA</span></footer>
      {notice && <ScheduleDialog notice={notice} now={now} onClose={closeNotice} />}
    </div>
  );
}
