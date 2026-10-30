import OfficialLogo from './OfficialLogo';
import { useRef, useState } from "react";
import "./StartScreen.css";
import { HauntedScene } from "./HorrorAtmosphere";
import HauntDialog from "./HauntDialog";


const StartScreen = ({ onSubmit, onRegister, onBack, loginError = "", isLoggingIn = false }) => {
  const [instituteEmail, setInstituteEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [invalidField, setInvalidField] = useState("");
  const [authStep, setAuthStep] = useState("credentials");
  const [name, setName] = useState("");
  const [emailConfirmation, setEmailConfirmation] = useState("");
  const [acceptedEmailResponsibility, setAcceptedEmailResponsibility] = useState(false);
  const emailRef = useRef(null);
  const nameRef = useRef(null);
  const passwordRef = useRef(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isLoggingIn) return;

    const trimmedEmail = instituteEmail.trim();
    const trimmedPassword = password.trim();
    const trimmedName = name.trim();
    if (authStep === "name") {
      if (!trimmedName) {
        setError("Please enter your name.");
        setInvalidField("name");
        return;
      }
      setError("");
      setInvalidField("");
      await onRegister(trimmedEmail, trimmedPassword, trimmedName);
      return;
    }
    if (!trimmedEmail || !trimmedPassword) {
      setError("Please enter both institute email and password.");
      setInvalidField(!trimmedEmail ? "email" : "password");
      (!trimmedEmail ? emailRef : passwordRef).current?.focus();
      return;
    }
    if (!/^[^\s@]+@iiitvadodara\.ac\.in$/i.test(trimmedEmail)) {
      setError("Please use your @iiitvadodara.ac.in email address.");
      setInvalidField("email");
      emailRef.current?.focus();
      return;
    }
    setError("");
    setInvalidField("");
    const result = await onSubmit(trimmedEmail, trimmedPassword);
    if (result?.requiresName) {
      setEmailConfirmation(trimmedEmail.toLowerCase());
      setAcceptedEmailResponsibility(false);
      setError("");
      setInvalidField("");
    }
  };

  const confirmEmail = () => {
    if (!acceptedEmailResponsibility) return;
    setInstituteEmail(emailConfirmation);
    setEmailConfirmation("");
    setAuthStep("name");
    setError("");
    setInvalidField("");
    queueMicrotask(() => nameRef.current?.focus());
  };

  const cancelEmailConfirmation = () => {
    setEmailConfirmation("");
    setAcceptedEmailResponsibility(false);
  };

  const clearValidation = () => {
    setError("");
    setInvalidField("");
  };

  return (
    <div className="haunt-auth">
      <header className="haunt-auth-header">
        <span className="haunt-auth-wordmark"><OfficialLogo /> Treasure <em>of</em> Code</span>
        <button type="button" className="haunt-auth-back" onClick={onBack} disabled={isLoggingIn}><span aria-hidden="true">←</span> Back to the hunt</button>
      </header>

      <main className="haunt-auth-layout">
        <aside className="haunt-auth-story" aria-label="Welcome to the hunt">
          <HauntedScene />
          <div className="haunt-auth-story-top"><span aria-hidden="true">✦</span> THE HOUSE KNOWS YOU ARE HERE</div>
          <div className="haunt-auth-story-copy">
            <p className="haunt-auth-kicker">BEYOND THE MOONLIT GATES</p>
            <h2>The door creaks.<br />The shadows stir.<br /><span>Your hunt begins.</span></h2>
            <p>Something is waiting on the other side. Let your code be the light.</p>
          </div>
          <span className="haunt-auth-scene-note">01 / ENTER THE UNKNOWN</span>
        </aside>

        <section className="haunt-auth-form-panel" aria-labelledby="player-login-title">
          <div className="haunt-auth-form-intro">
            <p className="haunt-auth-kicker">ENTER THE INNER CIRCLE</p>
            <h1 id="player-login-title" tabIndex={-1}>{authStep === "name" ? "One last step" : "Player login"}<span>.</span></h1>
            <p>{authStep === "name" ? `Creating your account with ${instituteEmail}.` : "Welcome, code hunter. Sign in with your institute account to continue."}</p>
          </div>

          <form className="haunt-auth-form" onSubmit={handleSubmit} noValidate aria-busy={isLoggingIn}>
            <fieldset disabled={isLoggingIn}>
              <legend className="haunt-auth-sr-only">Player credentials</legend>
              {authStep === "name" && <div className="haunt-auth-field">
                <label htmlFor="player-name">Your name</label>
                <input
                  id="player-name"
                  name="name"
                  ref={nameRef}
                  type="text"
                  autoComplete="name"
                  placeholder="Enter your name"
                  required
                  value={name}
                  aria-invalid={invalidField === "name"}
                  aria-describedby={error || loginError ? "player-login-feedback" : undefined}
                  onChange={(event) => { setName(event.target.value); clearValidation(); }}
                />
              </div>}
              {authStep === "credentials" && <div className="haunt-auth-field">
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
              </div>}
              {authStep === "credentials" && <div className="haunt-auth-field">
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
              </div>}
            </fieldset>

            <div className={`haunt-auth-feedback${error || loginError ? " has-error" : ""}`} id="player-login-feedback" role="status" aria-live="polite" aria-atomic="true">
              {error || loginError}
            </div>
            <button type="submit" className="haunt-auth-submit" disabled={isLoggingIn}>
              {isLoggingIn ? <><span className="haunt-auth-spinner" aria-hidden="true" /> {authStep === "name" ? "Creating account…" : "Signing in…"}</> : <>{authStep === "name" ? "Enter the hunt" : "Unlock the hunt"} <span aria-hidden="true">→</span></>}
            </button>
            <p className="haunt-auth-access">Your master password verifies access to the hunt.</p>
          </form>

          <div className="haunt-auth-help"><span aria-hidden="true">?</span><p>Having trouble signing in?<br /><strong>Contact your event coordinator for help.</strong></p></div>
        </section>
      </main>
      <footer className="haunt-auth-footer"><span>CEREBRO</span><span>CRACK THE CLUES. SOLVE THE CODE.</span><span>CODING CLUB, IIIT VADODARA</span></footer>
      {emailConfirmation && (
        <HauntDialog
          className="haunt-auth-confirm-dialog"
          labelId="confirm-player-email-title"
          onClose={cancelEmailConfirmation}
          closeOnBackdrop={false}
        >
          <div className="haunt-auth-confirm-card">
            <p className="haunt-auth-kicker">Mail Confirmation</p>
            <h2 id="confirm-player-email-title">Confirm your email<span>.</span></h2>
            <p>
             Please confirm that your email is correct, as it will be used to verify your identity.
            </p>
            <strong className="haunt-auth-confirm-email">{emailConfirmation}</strong>
            <p className="haunt-auth-confirm-warning">
              If you entered the wrong email, you will be responsible for the
              account created with it.
            </p>
            <label className="haunt-auth-confirm-checkbox">
              <input
                type="checkbox"
                checked={acceptedEmailResponsibility}
                onChange={(event) => setAcceptedEmailResponsibility(event.target.checked)}
              />
              <span>I am responsible for any wrong information I provide.</span>
            </label>
            <div className="haunt-auth-confirm-actions">
              <button type="button" className="haunt-auth-confirm-secondary" onClick={cancelEmailConfirmation}>
                Go back
              </button>
              <button type="button" className="haunt-auth-confirm-primary" onClick={confirmEmail} disabled={!acceptedEmailResponsibility}>
                Confirm email
              </button>
            </div>
          </div>
        </HauntDialog>
      )}
    </div>
  );
};

export default StartScreen;
