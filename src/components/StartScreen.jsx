import { useRef, useState } from "react";
import "./StartScreen.css";

const StartScreen = ({ onSubmit, onBack, loginError = "", isLoggingIn = false }) => {
  const [instituteEmail, setInstituteEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [invalidField, setInvalidField] = useState("");
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isLoggingIn) return;

    const trimmedEmail = instituteEmail.trim();
    const trimmedPassword = password.trim();
    if (!trimmedEmail || !trimmedPassword) {
      setError("Please enter both institute email and password.");
      setInvalidField(!trimmedEmail ? "email" : "password");
      (!trimmedEmail ? emailRef : passwordRef).current?.focus();
      return;
    }
    if (!trimmedEmail.includes("@")) {
      setError("Please enter a valid email.");
      setInvalidField("email");
      emailRef.current?.focus();
      return;
    }
    setError("");
    setInvalidField("");
    onSubmit(trimmedEmail, trimmedPassword);
  };

  const clearValidation = () => {
    setError("");
    setInvalidField("");
  };

  return (
    <div className="haunt-auth">
      <header className="haunt-auth-header">
        <span className="haunt-auth-wordmark">Treasure <em>of</em> Code</span>
        <button type="button" className="haunt-auth-back" onClick={onBack} disabled={isLoggingIn}><span aria-hidden="true">←</span> Back to the hunt</button>
      </header>

      <main className="haunt-auth-layout">
        <aside className="haunt-auth-story" aria-label="Welcome to the hunt">
          <img src="/halloween/moonlit-shrine.png" alt="" width="1672" height="941" />
          <div className="haunt-auth-story-top"><span aria-hidden="true">✦</span> THE NEXT CHAPTER AWAITS</div>
          <div className="haunt-auth-story-copy">
            <p className="haunt-auth-kicker">BEYOND THE MOONLIT GATES</p>
            <h2>A curious mind.<br />A fearless spirit.<br /><span>Your hunt begins.</span></h2>
            <p>The clues are waiting. Step inside and let your code light the way.</p>
          </div>
          <span className="haunt-auth-scene-note">01 / ENTER THE UNKNOWN</span>
        </aside>

        <section className="haunt-auth-form-panel" aria-labelledby="player-login-title">
          <div className="haunt-auth-form-intro">
            <p className="haunt-auth-kicker">YOUR KEY TO THE ADVENTURE</p>
            <h1 id="player-login-title" tabIndex={-1}>Player login<span>.</span></h1>
            <p>Welcome, code hunter. Sign in with your registered institute account to continue.</p>
          </div>

          <form className="haunt-auth-form" onSubmit={handleSubmit} noValidate aria-busy={isLoggingIn}>
            <fieldset disabled={isLoggingIn}>
              <legend className="haunt-auth-sr-only">Player credentials</legend>
              <div className="haunt-auth-field">
                <label htmlFor="player-institute-email">Institute email</label>
                <input
                  id="player-institute-email"
                  name="email"
                  ref={emailRef}
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="Enter your institute email"
                  required
                  value={instituteEmail}
                  aria-invalid={invalidField === "email"}
                  aria-describedby={error || loginError ? "player-login-feedback" : undefined}
                  onChange={(event) => { setInstituteEmail(event.target.value); clearValidation(); }}
                />
              </div>
              <div className="haunt-auth-field">
                <label htmlFor="player-password">Password</label>
                <div className="haunt-auth-password">
                  <input
                    id="player-password"
                    name="password"
                    ref={passwordRef}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    required
                    value={password}
                    aria-invalid={invalidField === "password"}
                    aria-describedby={error || loginError ? "player-login-feedback" : undefined}
                    onChange={(event) => { setPassword(event.target.value); clearValidation(); }}
                  />
                  <button type="button" className="haunt-auth-toggle" onClick={() => setShowPassword((previous) => !previous)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>{showPassword ? "Hide" : "Show"}</button>
                </div>
              </div>
            </fieldset>

            <div className={`haunt-auth-feedback${error || loginError ? " has-error" : ""}`} id="player-login-feedback" role="status" aria-live="polite" aria-atomic="true">
              {error || loginError}
            </div>
            <button type="submit" className="haunt-auth-submit" disabled={isLoggingIn}>
              {isLoggingIn ? <><span className="haunt-auth-spinner" aria-hidden="true" /> Signing in…</> : <>Unlock the hunt <span aria-hidden="true">→</span></>}
            </button>
            <p className="haunt-auth-access">Only registered participants can enter.</p>
          </form>

          <div className="haunt-auth-help"><span aria-hidden="true">?</span><p>Having trouble signing in?<br /><strong>Contact your event coordinator for help.</strong></p></div>
        </section>
      </main>
      <footer className="haunt-auth-footer"><span>CELEBRO</span><span>CRACK THE CLUES. SOLVE THE CODE.</span><span>CODING CLUB, IIIT VADODARA</span></footer>
    </div>
  );
};

export default StartScreen;
