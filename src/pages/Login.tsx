import { useState, type FormEvent } from "react";
import { ArrowRight, LockKeyhole, Mail, Sparkles } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) setError(authError.message);
    setLoading(false);
  }

  return (
    <main className="login-page">
      <div className="login-aurora login-aurora-one" />
      <div className="login-aurora login-aurora-two" />

      <section className="login-card">
        <div className="login-brand">
          <div className="brand-logo login-logo"><Sparkles size={22} /></div>
          <div>
            <h1>NEXA</h1>
            <p>Focus beautifully.</p>
          </div>
        </div>

        <div className="login-copy">
          <p className="eyebrow">YOUR DESK, IN SYNC</p>
          <h2>Welcome back.</h2>
          <p>Plan clearly, focus deeply, and keep your physical NEXA in step with your day.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            <span>Email</span>
            <div className="input-with-icon">
              <Mail size={17} />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
          </label>

          <label>
            <span>Password</span>
            <div className="input-with-icon">
              <LockKeyhole size={17} />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </div>
          </label>

          {error ? <div className="notice notice-error">{error}</div> : null}

          <button className="primary-action login-submit" disabled={loading} type="submit">
            {loading ? "Signing in..." : "Enter NEXA"}
            {!loading ? <ArrowRight size={17} /> : null}
          </button>
        </form>
      </section>
    </main>
  );
}
