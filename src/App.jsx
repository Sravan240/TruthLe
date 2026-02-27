import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const C = {
  bg: "#080c14", surface: "#0d1320", card: "#111827",
  border: "#1e2d45", accent: "#00f5c4", danger: "#ff4d6d",
  warning: "#ffd60a", purple: "#7b61ff", text: "#e2eaf4", muted: "#5a7a99",
  green: "#22c55e",
};

const AVATAR_COLORS = ["#00f5c4","#ff4d6d","#ffd60a","#7b61ff","#ff9500","#00b4d8"];

function initials(name = "") { return name.slice(0,2).toUpperCase() || "??"; }
function timeAgo(ts) {
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}
function getVerdict(ai, real, unclear) {
  const total = ai + real + unclear || 1;
  if (ai/total > 0.55) return { label:"AI GENERATED", color:C.danger, icon:"⚡" };
  if (real/total > 0.55) return { label:"AUTHENTIC", color:C.accent, icon:"✓" };
  return { label:"DISPUTED", color:C.warning, icon:"?" };
}
function getYouTubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

// ── Icons ─────────────────────────────────────────────────────
const Icons = {
  home: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
    </svg>
  ),
  recent: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
    </svg>
  ),
  disputed: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
    </svg>
  ),
  saved: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
    </svg>
  ),
  trending: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
    </svg>
  ),
  verified: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
    </svg>
  ),
  ai: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/>
    </svg>
  ),
  search: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
      <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
    </svg>
  ),
  bell: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
    </svg>
  ),
  mute: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
      <path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
    </svg>
  ),
  unmute: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
    </svg>
  ),
  fullscreen: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
    </svg>
  ),
  lightning: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
      <path d="M7 2v11h3v9l7-12h-4l4-8z"/>
    </svg>
  ),
  check: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
    </svg>
  ),
  question: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
    </svg>
  ),
  info: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
    </svg>
  ),
  post: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
    </svg>
  ),
  logout: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
    </svg>
  ),
  robot: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
      <path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zm-2 10H6V7h12v12zm-9-6c-.83 0-1.5-.67-1.5-1.5S8.17 10 9 10s1.5.67 1.5 1.5S9.83 13 9 13zm6 0c-.83 0-1.5-.67-1.5-1.5S14.17 10 15 10s1.5.67 1.5 1.5S15.83 13 15 13zm-7 2h8v2H8v-2z"/>
    </svg>
  ),
};

// ── Toast ─────────────────────────────────────────────────────
function Toast({ msg, type }) {
  return (
    <div style={{
      position:"fixed", bottom:30, left:"50%", transform:"translateX(-50%)",
      background: type==="error" ? C.danger+"22" : C.accent+"22",
      border:`1px solid ${type==="error" ? C.danger : C.accent}`,
      color: type==="error" ? C.danger : C.accent,
      padding:"10px 22px", borderRadius:30, fontSize:12, fontWeight:700,
      letterSpacing:1, zIndex:9999, backdropFilter:"blur(12px)",
      whiteSpace:"nowrap",
    }}>{msg}</div>
  );
}

// ── Auth Page (full page, no guest access) ────────────────────
function AuthPage({ onAuth, onToast }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email:"", password:"", username:"" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.email || !form.password) { onToast("Email and password required", "error"); return; }
    setLoading(true);
    if (mode === "register") {
      if (!form.username.trim()) { onToast("Username required", "error"); setLoading(false); return; }
      const { data, error } = await supabase.auth.signUp({ email: form.email, password: form.password });
      if (error) { onToast(error.message, "error"); setLoading(false); return; }
      if (data.user) {
        const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
        await supabase.from("profiles").insert({ id: data.user.id, username: form.username.trim(), avatar_color: color });
        onToast("Account created! Signing you in...", "success");
        onAuth(data.user);
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
      if (error) { onToast(error.message, "error"); setLoading(false); return; }
      onToast("Welcome back!", "success");
      onAuth(data.user);
    }
    setLoading(false);
  };

  const iStyle = {
    width:"100%", padding:"13px 16px",
    background:"rgba(255,255,255,0.05)", border:`1px solid ${C.border}`,
    borderRadius:12, color:C.text, fontSize:14, outline:"none",
    boxSizing:"border-box", fontFamily:"'Courier New', monospace",
    transition:"border-color 0.2s",
  };

  return (
    <div style={{
      minHeight:"100vh", background:C.bg, display:"flex",
      fontFamily:"'Courier New', monospace", overflow:"hidden",
    }}>
      {/* Left — branding panel */}
      <div style={{
        flex:1, display:"flex", flexDirection:"column",
        justifyContent:"center", padding:"60px 80px",
        background:`linear-gradient(135deg, ${C.bg} 0%, #0a1628 100%)`,
        borderRight:`1px solid ${C.border}`,
        position:"relative", overflow:"hidden",
      }}>
        {/* Grid */}
        <div style={{
          position:"absolute", inset:0,
          backgroundImage:`linear-gradient(${C.border}22 1px, transparent 1px), linear-gradient(90deg, ${C.border}22 1px, transparent 1px)`,
          backgroundSize:"50px 50px",
        }} />
        {/* Glow */}
        <div style={{
          position:"absolute", bottom:"-20%", left:"-10%",
          width:500, height:500, borderRadius:"50%",
          background:`radial-gradient(ellipse, ${C.accent}12, transparent 70%)`,
          pointerEvents:"none",
        }} />

        <div style={{ position:"relative", zIndex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:40 }}>
            <div style={{ width:10, height:10, borderRadius:"50%", background:C.accent, boxShadow:`0 0 16px ${C.accent}` }} />
            <span style={{ color:C.accent, fontSize:15, letterSpacing:4, fontWeight:800 }}>TRUTHLENS</span>
          </div>

          <div style={{ fontSize:42, fontWeight:900, color:C.text, lineHeight:1.1, marginBottom:20 }}>
            Can you tell<br/>
            <span style={{ color:C.accent }}>AI</span> from<br/>
            <span style={{ color:C.danger }}>Reality?</span>
          </div>

          <div style={{ fontSize:15, color:C.muted, lineHeight:1.8, marginBottom:40, maxWidth:380 }}>
            A community-powered platform to validate AI-generated videos. Watch, vote, and help the world see the truth.
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {[
              { icon:"⚡", text:"Vote AI Generated, Real, or Unclear on every video" },
              { icon:"🎬", text:"Scroll through videos like Reels — fully immersive" },
              { icon:"📊", text:"Live vote counts show the community verdict instantly" },
              { icon:"🔒", text:"Signed-in users only — your votes matter" },
            ].map((f,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ fontSize:18 }}>{f.icon}</span>
                <span style={{ fontSize:13, color:C.muted }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — auth form */}
      <div style={{
        width:480, display:"flex", flexDirection:"column",
        justifyContent:"center", padding:"60px 50px",
        background:C.bg,
      }}>
        <div style={{ marginBottom:32 }}>
          <div style={{ fontSize:26, fontWeight:800, color:C.text, marginBottom:6 }}>
            {mode==="register" ? "Create Account" : "Sign In"}
          </div>
          <div style={{ fontSize:13, color:C.muted }}>
            {mode==="register" ? "Join the truth verification network" : "Welcome back to TruthLens"}
          </div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {mode==="register" && (
            <div>
              <div style={{ fontSize:11, color:C.muted, marginBottom:6, letterSpacing:1 }}>USERNAME</div>
              <input placeholder="e.g. truthseeker99" value={form.username}
                onChange={e=>setForm({...form,username:e.target.value})} style={iStyle}
                onFocus={e=>e.target.style.borderColor=C.accent}
                onBlur={e=>e.target.style.borderColor=C.border} />
            </div>
          )}
          <div>
            <div style={{ fontSize:11, color:C.muted, marginBottom:6, letterSpacing:1 }}>EMAIL</div>
            <input placeholder="you@example.com" type="email" value={form.email}
              onChange={e=>setForm({...form,email:e.target.value})} style={iStyle}
              onFocus={e=>e.target.style.borderColor=C.accent}
              onBlur={e=>e.target.style.borderColor=C.border} />
          </div>
          <div>
            <div style={{ fontSize:11, color:C.muted, marginBottom:6, letterSpacing:1 }}>PASSWORD</div>
            <input placeholder="••••••••" type="password" value={form.password}
              onChange={e=>setForm({...form,password:e.target.value})} style={iStyle}
              onFocus={e=>e.target.style.borderColor=C.accent}
              onBlur={e=>e.target.style.borderColor=C.border}
              onKeyDown={e=>e.key==="Enter"&&handleSubmit()} />
          </div>
        </div>

        <button onClick={handleSubmit} disabled={loading} style={{
          marginTop:24, padding:"14px",
          background:`linear-gradient(135deg, ${C.accent}, #00c9a7)`,
          border:"none", borderRadius:12, color:"#080c14",
          fontSize:13, fontWeight:800, letterSpacing:2, cursor:"pointer",
          opacity: loading ? 0.7 : 1, transition:"opacity 0.2s, transform 0.1s",
        }}
          onMouseEnter={e=>!loading&&(e.target.style.transform="scale(1.01)")}
          onMouseLeave={e=>e.target.style.transform="scale(1)"}
        >{loading ? "PLEASE WAIT..." : mode==="register" ? "CREATE ACCOUNT" : "SIGN IN"}</button>

        <div style={{ textAlign:"center", marginTop:20, fontSize:13, color:C.muted }}>
          {mode==="register" ? "Already have an account? " : "Don't have an account? "}
          <span onClick={()=>{ setMode(mode==="register"?"login":"register"); setForm({email:"",password:"",username:""}); }}
            style={{ color:C.accent, cursor:"pointer", fontWeight:700 }}>
            {mode==="register" ? "Sign in" : "Register free"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Submit Modal ───────────────────────────────────────────────
function SubmitModal({ user, onClose, onSubmitted, onToast }) {
  const [form, setForm] = useState({ title:"", description:"", thumbnail_url:"", video_url:"", tags:"" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.title.trim()) { onToast("Title is required", "error"); return; }
    setLoading(true);
    const tags = form.tags.split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
    const { error } = await supabase.from("posts").insert({
      user_id: user.id, title: form.title, description: form.description,
      thumbnail_url: form.thumbnail_url || null, video_url: form.video_url || null, tags,
    });
    setLoading(false);
    if (error) { onToast("Submit failed: " + error.message, "error"); return; }
    onToast("Video submitted!", "success");
    onSubmitted(); onClose();
  };

  const iStyle = {
    width:"100%", padding:"10px 14px",
    background:C.surface, border:`1px solid ${C.border}`,
    borderRadius:10, color:C.text, fontSize:13, outline:"none",
    boxSizing:"border-box", fontFamily:"'Courier New', monospace",
  };

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.85)",
      display:"flex", alignItems:"center", justifyContent:"center",
      zIndex:2000, backdropFilter:"blur(6px)",
    }} onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{
        background:C.card, border:`1px solid ${C.border}`,
        borderRadius:20, padding:32, width:"100%", maxWidth:460,
        fontFamily:"'Courier New', monospace",
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <div style={{ color:C.accent, fontWeight:800, fontSize:14, letterSpacing:2 }}>📹 SUBMIT VIDEO</div>
          <span onClick={onClose} style={{ color:C.muted, cursor:"pointer", fontSize:20 }}>✕</span>
        </div>
        {[
          { key:"title", label:"TITLE *", placeholder:"What's this video about?" },
          { key:"video_url", label:"YOUTUBE URL", placeholder:"https://youtube.com/watch?v=..." },
          { key:"thumbnail_url", label:"THUMBNAIL URL (optional)", placeholder:"https://..." },
          { key:"tags", label:"TAGS", placeholder:"deepfake, politics, viral" },
        ].map(f => (
          <div key={f.key} style={{ marginBottom:12 }}>
            <div style={{ fontSize:10, color:C.muted, letterSpacing:1, marginBottom:6 }}>{f.label}</div>
            <input placeholder={f.placeholder} value={form[f.key]} onChange={e=>setForm({...form,[f.key]:e.target.value})} style={iStyle}
              onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border} />
          </div>
        ))}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:10, color:C.muted, letterSpacing:1, marginBottom:6 }}>DESCRIPTION</div>
          <textarea placeholder="Describe what seems off about this video..." value={form.description}
            onChange={e=>setForm({...form,description:e.target.value})}
            style={{...iStyle, height:70, resize:"vertical"}}
            onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border} />
        </div>
        <button onClick={handleSubmit} disabled={loading} style={{
          width:"100%", padding:"12px",
          background:`linear-gradient(135deg, ${C.accent}, #00c9a7)`,
          border:"none", borderRadius:10, color:"#080c14",
          fontSize:12, fontWeight:800, letterSpacing:2, cursor:"pointer", opacity: loading ? 0.6 : 1,
        }}>{loading ? "SUBMITTING..." : "SUBMIT VIDEO"}</button>
      </div>
    </div>
  );
}

// ── Reel Card (full screen video) ─────────────────────────────
function ReelCard({ post, currentUser, onToast, isActive, onSave, savedIds }) {
  const [votes, setVotes] = useState({ ai: post.ai_votes||0, real: post.real_votes||0, unclear: post.unclear_votes||0 });
  const [userVote, setUserVote] = useState(post.user_vote || null);
  const [voting, setVoting] = useState(false);
  const [muted, setMuted] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const verdict = getVerdict(votes.ai, votes.real, votes.unclear);
  const youtubeId = getYouTubeId(post.video_url);
  const avatarColor = post.profiles?.avatar_color || C.accent;
  const total = votes.ai + votes.real + votes.unclear || 1;
  const isSaved = savedIds?.includes(post.id);

  const handleVote = async (type) => {
    if (voting || userVote === type) return;
    setVoting(true);
    const prev = userVote;
    const updated = { ...votes };
    if (prev) updated[prev] -= 1;
    updated[type] += 1;
    setVotes(updated);
    setUserVote(type);
    try {
      if (prev) {
        await supabase.from("votes").update({ vote_type: type })
          .eq("user_id", currentUser.id).eq("post_id", post.id);
      } else {
        await supabase.from("votes").insert({ user_id: currentUser.id, post_id: post.id, vote_type: type });
      }
      const labels = { ai:"⚡ Voted AI Generated", real:"✓ Voted Real", unclear:"? Voted Unclear" };
      onToast(labels[type], "success");
    } catch {
      setVotes(votes); setUserVote(prev);
      onToast("Vote failed", "error");
    }
    setVoting(false);
  };

  const voteButtons = [
    { key:"ai", Icon: Icons.lightning, label:"AI", sublabel:"Generated", color:C.danger, bg:"#ff4d6d" },
    { key:"real", Icon: Icons.check, label:"Real", sublabel:"Authentic", color:C.accent, bg:"#00f5c4" },
    { key:"unclear", Icon: Icons.question, label:"Not", sublabel:"Clear", color:C.warning, bg:"#ffd60a" },
  ];

  return (
    <div style={{ position:"relative", width:"100%", height:"100%", background:"#000", overflow:"hidden" }}>
      {/* Video */}
      {youtubeId && isActive ? (
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=${muted?1:0}&loop=1&playlist=${youtubeId}&controls=0&modestbranding=1&rel=0&playsinline=1`}
          style={{ position:"absolute", inset:"-60px 0", width:"100%", height:"calc(100% + 120px)", border:"none", pointerEvents:"none" }}
          allow="autoplay; fullscreen"
          allowFullScreen
        />
      ) : (
        <div style={{ position:"absolute", inset:0 }}>
          {post.thumbnail_url
            ? <img src={post.thumbnail_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            : <div style={{ width:"100%", height:"100%", background:`linear-gradient(135deg, ${C.surface}, ${C.bg})`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <div style={{ fontSize:40, opacity:0.3 }}>🎬</div>
              </div>
          }
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div style={{ width:64, height:64, borderRadius:"50%", background:"rgba(0,0,0,0.6)", border:"2px solid rgba(255,255,255,0.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>▶</div>
          </div>
        </div>
      )}

      {/* Gradient overlays */}
      <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.3) 35%, rgba(0,0,0,0.1) 55%, rgba(0,0,0,0.5) 100%)", pointerEvents:"none" }} />

      {/* Top controls */}
      <div style={{ position:"absolute", top:16, left:16, right:16, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{
          background:verdict.color+"33", border:`1px solid ${verdict.color}`,
          color:verdict.color, padding:"5px 14px", borderRadius:20,
          fontSize:11, fontWeight:800, letterSpacing:1.5, backdropFilter:"blur(8px)",
        }}>{verdict.icon} {verdict.label}</div>

        <div style={{ display:"flex", gap:8 }}>
          {youtubeId && isActive && (
            <button onClick={()=>setMuted(!muted)} style={{
              width:36, height:36, borderRadius:"50%",
              background:"rgba(0,0,0,0.55)", border:"1px solid rgba(255,255,255,0.2)",
              color:"white", cursor:"pointer", backdropFilter:"blur(8px)",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>{muted ? <Icons.mute /> : <Icons.unmute />}</button>
          )}
          {post.video_url && (
            <button onClick={()=>window.open(post.video_url,'_blank')} style={{
              width:36, height:36, borderRadius:"50%",
              background:"rgba(0,0,0,0.55)", border:"1px solid rgba(255,255,255,0.2)",
              color:"white", cursor:"pointer", backdropFilter:"blur(8px)",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}><Icons.fullscreen /></button>
          )}
        </div>
      </div>

      {/* Right side action buttons */}
      <div style={{ position:"absolute", right:14, bottom:140, display:"flex", flexDirection:"column", alignItems:"center", gap:18 }}>

        {/* Avatar */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
          <div style={{
            width:46, height:46, borderRadius:"50%",
            background:avatarColor+"33", border:`3px solid ${avatarColor}`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:13, fontWeight:800, color:avatarColor,
            boxShadow:`0 0 12px ${avatarColor}44`,
          }}>{initials(post.profiles?.username)}</div>
        </div>

        {/* Vote buttons */}
        {voteButtons.map(({ key, Icon, label, sublabel, color, bg }) => (
          <div key={key} onClick={() => handleVote(key)}
            style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, cursor:"pointer" }}>
            <div style={{
              width:52, height:52, borderRadius:"50%",
              background: userVote===key ? bg+"44" : "rgba(0,0,0,0.55)",
              border:`2px solid ${userVote===key ? color : "rgba(255,255,255,0.25)"}`,
              display:"flex", alignItems:"center", justifyContent:"center",
              color: userVote===key ? color : "rgba(255,255,255,0.85)",
              backdropFilter:"blur(8px)",
              transform: userVote===key ? "scale(1.18)" : "scale(1)",
              transition:"all 0.2s",
              boxShadow: userVote===key ? `0 0 18px ${color}66` : "none",
            }}><Icon /></div>
            <span style={{ fontSize:10, color: userVote===key ? color : "rgba(255,255,255,0.6)", fontWeight:700, letterSpacing:0.5 }}>
              {label}
            </span>
            <span style={{ fontSize:9, color:"rgba(255,255,255,0.4)", marginTop:-2 }}>
              {votes[key].toLocaleString()}
            </span>
          </div>
        ))}

        {/* Save button */}
        <div onClick={()=>onSave(post.id)}
          style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, cursor:"pointer" }}>
          <div style={{
            width:52, height:52, borderRadius:"50%",
            background: isSaved ? C.purple+"44" : "rgba(0,0,0,0.55)",
            border:`2px solid ${isSaved ? C.purple : "rgba(255,255,255,0.25)"}`,
            display:"flex", alignItems:"center", justifyContent:"center",
            color: isSaved ? C.purple : "rgba(255,255,255,0.85)",
            backdropFilter:"blur(8px)",
            transform: isSaved ? "scale(1.18)" : "scale(1)",
            transition:"all 0.2s",
            boxShadow: isSaved ? `0 0 18px ${C.purple}66` : "none",
          }}><Icons.saved /></div>
          <span style={{ fontSize:10, color: isSaved ? C.purple : "rgba(255,255,255,0.6)", fontWeight:700 }}>
            {isSaved ? "Saved" : "Save"}
          </span>
        </div>

        {/* Info button */}
        <div onClick={()=>setShowInfo(!showInfo)}
          style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, cursor:"pointer" }}>
          <div style={{
            width:52, height:52, borderRadius:"50%",
            background: showInfo ? "#ffffff22" : "rgba(0,0,0,0.55)",
            border:`2px solid ${showInfo ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)"}`,
            display:"flex", alignItems:"center", justifyContent:"center",
            color:"rgba(255,255,255,0.85)",
            backdropFilter:"blur(8px)", transition:"all 0.2s",
          }}><Icons.info /></div>
          <span style={{ fontSize:10, color:"rgba(255,255,255,0.6)", fontWeight:700 }}>Info</span>
        </div>
      </div>

      {/* Bottom info */}
      <div style={{ position:"absolute", bottom:0, left:0, right:80, padding:"0 18px 24px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
          <span style={{ color:avatarColor, fontSize:13, fontWeight:700 }}>@{post.profiles?.username || "unknown"}</span>
          <span style={{ color:"rgba(255,255,255,0.35)", fontSize:11 }}>{timeAgo(post.created_at)}</span>
        </div>
        <div style={{ fontSize:17, fontWeight:800, color:"white", marginBottom:6, lineHeight:1.3 }}>{post.title}</div>
        {showInfo && post.description && (
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.65)", lineHeight:1.7, marginBottom:8 }}>{post.description}</div>
        )}
        {post.tags?.length > 0 && (
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
            {post.tags.map(t => (
              <span key={t} style={{ padding:"2px 8px", borderRadius:20, background:"rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.55)", fontSize:10 }}>#{t}</span>
            ))}
          </div>
        )}
        {/* Vote bar */}
        <div style={{ display:"flex", height:3, borderRadius:2, overflow:"hidden", gap:1, marginBottom:5 }}>
          <div style={{ width:`${(votes.ai/total)*100}%`, background:C.danger }} />
          <div style={{ width:`${(votes.real/total)*100}%`, background:C.accent }} />
          <div style={{ width:`${(votes.unclear/total)*100}%`, background:C.warning }} />
        </div>
        <div style={{ display:"flex", gap:14, fontSize:10 }}>
          <span style={{ color:C.danger }}>⚡ {Math.round((votes.ai/total)*100)}% AI</span>
          <span style={{ color:C.accent }}>✓ {Math.round((votes.real/total)*100)}% Real</span>
          <span style={{ color:C.warning }}>? {Math.round((votes.unclear/total)*100)}% Unclear</span>
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [allPosts, setAllPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("home");
  const [showSubmit, setShowSubmit] = useState(false);
  const [toast, setToast] = useState(null);
  const [savedIds, setSavedIds] = useState([]);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);
  const touchStartY = useRef(null);

  const showToast = (msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) { setCurrentUser(data.session.user); fetchProfile(data.session.user.id); }
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setCurrentUser(session?.user || null);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) setProfile(data);
  };

  const fetchPosts = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    const { data: postsData } = await supabase
      .from("posts").select("*, profiles(username, avatar_color)")
      .order("created_at", { ascending: false });

    if (!postsData) { setLoading(false); return; }
    const postIds = postsData.map(p => p.id);
    let enriched = postsData.map(p => ({ ...p, ai_votes:0, real_votes:0, unclear_votes:0, user_vote:null }));

    if (postIds.length > 0) {
      const { data: votesData } = await supabase.from("votes").select("post_id, vote_type").in("post_id", postIds);
      const { data: uv } = await supabase.from("votes").select("post_id, vote_type")
        .eq("user_id", currentUser.id).in("post_id", postIds);
      const userVotes = {};
      (uv||[]).forEach(v => { userVotes[v.post_id] = v.vote_type; });
      const counts = {};
      (votesData||[]).forEach(v => {
        if (!counts[v.post_id]) counts[v.post_id] = { ai:0, real:0, unclear:0 };
        counts[v.post_id][v.vote_type]++;
      });
      enriched = postsData.map(p => ({
        ...p,
        ai_votes: counts[p.id]?.ai || 0,
        real_votes: counts[p.id]?.real || 0,
        unclear_votes: counts[p.id]?.unclear || 0,
        user_vote: userVotes[p.id] || null,
      }));
    }
    setAllPosts(enriched);
    setLoading(false);
  }, [currentUser]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // Filter posts based on active tab
  useEffect(() => {
    let filtered = [...allPosts];
    if (search) filtered = filtered.filter(p =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.description||"").toLowerCase().includes(search.toLowerCase())
    );
    if (activeTab === "recent") filtered = [...filtered].sort((a,b) => new Date(b.created_at)-new Date(a.created_at));
    else if (activeTab === "disputed") filtered = filtered.filter(p => { const t=p.ai_votes+p.real_votes+p.unclear_votes||1; return p.ai_votes/t<=0.55&&p.real_votes/t<=0.55; });
    else if (activeTab === "verified") filtered = filtered.filter(p => { const t=p.ai_votes+p.real_votes+p.unclear_votes||1; return p.real_votes/t>0.55; });
    else if (activeTab === "saved") filtered = filtered.filter(p => savedIds.includes(p.id));
    else if (activeTab === "trending") filtered = [...filtered].sort((a,b) => (b.ai_votes+b.real_votes+b.unclear_votes)-(a.ai_votes+a.real_votes+a.unclear_votes));
    setPosts(filtered);
    setActiveIndex(0);
  }, [activeTab, allPosts, savedIds, search]);

  // Scroll
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    if (e.deltaY > 40) setActiveIndex(i => Math.min(i + 1, posts.length - 1));
    else if (e.deltaY < -40) setActiveIndex(i => Math.max(i - 1, 0));
  }, [posts.length]);

  const handleTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e) => {
    if (touchStartY.current === null) return;
    const diff = touchStartY.current - e.changedTouches[0].clientY;
    if (diff > 50) setActiveIndex(i => Math.min(i + 1, posts.length - 1));
    else if (diff < -50) setActiveIndex(i => Math.max(i - 1, 0));
    touchStartY.current = null;
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const handleSave = (postId) => {
    setSavedIds(prev => prev.includes(postId) ? prev.filter(id=>id!==postId) : [...prev, postId]);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null); setProfile(null);
    showToast("Signed out");
  };

  // Loading auth state
  if (authLoading) {
    return (
      <div style={{ width:"100vw", height:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ width:36, height:36, border:`2px solid ${C.border}`, borderTopColor:C.accent, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Not logged in — show auth page
  if (!currentUser) {
    return (
      <>
        <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
        {toast && <Toast msg={toast.msg} type={toast.type} />}
        <AuthPage onAuth={setCurrentUser} onToast={showToast} />
      </>
    );
  }

  const navItems = [
    { key:"home", label:"Home", Icon: Icons.home },
    { key:"trending", label:"Trending", Icon: Icons.trending },
    { key:"recent", label:"Recent", Icon: Icons.recent },
    { key:"disputed", label:"Disputed", Icon: Icons.disputed },
    { key:"verified", label:"Verified Real", Icon: Icons.verified },
    { key:"saved", label:"Saved", Icon: Icons.saved },
  ];

  return (
    <div style={{ width:"100vw", height:"100vh", background:C.bg, display:"flex", flexDirection:"column", fontFamily:"'Courier New', monospace", overflow:"hidden" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
      `}</style>

      {toast && <Toast msg={toast.msg} type={toast.type} />}
      {showSubmit && <SubmitModal user={currentUser} onClose={()=>setShowSubmit(false)} onSubmitted={fetchPosts} onToast={showToast} />}

      {/* Top Navbar */}
      <div style={{
        height:56, background:C.card, borderBottom:`1px solid ${C.border}`,
        display:"flex", alignItems:"center", padding:"0 20px", gap:16,
        flexShrink:0, zIndex:100,
      }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:8, width:240, flexShrink:0 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:C.accent, boxShadow:`0 0 10px ${C.accent}` }} />
          <span style={{ color:C.accent, fontSize:14, letterSpacing:3, fontWeight:800 }}>TRUTHLENS</span>
        </div>

        {/* Search */}
        <div style={{ flex:1, maxWidth:500, position:"relative" }}>
          <div style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:C.muted }}>
            <Icons.search />
          </div>
          <input placeholder="Search videos..." value={search} onChange={e=>setSearch(e.target.value)}
            style={{
              width:"100%", padding:"8px 12px 8px 38px",
              background:C.surface, border:`1px solid ${C.border}`,
              borderRadius:24, color:C.text, fontSize:13, outline:"none",
            }}
            onFocus={e=>e.target.style.borderColor=C.accent}
            onBlur={e=>e.target.style.borderColor=C.border}
          />
        </div>

        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:12 }}>
          {/* Post button */}
          <button onClick={()=>setShowSubmit(true)} style={{
            display:"flex", alignItems:"center", gap:6,
            padding:"7px 16px",
            background:C.accent+"22", border:`1px solid ${C.accent}`,
            borderRadius:20, color:C.accent,
            fontSize:11, fontWeight:700, cursor:"pointer", letterSpacing:1,
          }}>
            <Icons.post /> POST VIDEO
          </button>

          {/* Notification bell */}
          <div style={{
            width:36, height:36, borderRadius:"50%",
            background:C.surface, border:`1px solid ${C.border}`,
            display:"flex", alignItems:"center", justifyContent:"center",
            color:C.muted, cursor:"pointer",
          }}><Icons.bell /></div>

          {/* Avatar + name */}
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 12px 4px 4px", background:C.surface, border:`1px solid ${C.border}`, borderRadius:30, cursor:"pointer" }}
            onClick={handleLogout} title="Click to sign out">
            <div style={{
              width:30, height:30, borderRadius:"50%",
              background:(profile?.avatar_color||C.accent)+"22",
              border:`2px solid ${profile?.avatar_color||C.accent}`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:11, fontWeight:700, color:profile?.avatar_color||C.accent,
            }}>{initials(profile?.username)}</div>
            <span style={{ fontSize:12, color:C.text }}>@{profile?.username||"..."}</span>
            <div style={{ color:C.muted }}><Icons.logout /></div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

        {/* Left Sidebar */}
        <div style={{
          width:240, background:C.card, borderRight:`1px solid ${C.border}`,
          display:"flex", flexDirection:"column", padding:"16px 0",
          flexShrink:0, overflowY:"auto",
        }}>
          {/* Nav items */}
          {navItems.map(({ key, label, Icon }) => (
            <div key={key} onClick={()=>setActiveTab(key)}
              style={{
                display:"flex", alignItems:"center", gap:12,
                padding:"11px 20px", cursor:"pointer",
                background: activeTab===key ? C.accent+"15" : "transparent",
                borderLeft: activeTab===key ? `3px solid ${C.accent}` : "3px solid transparent",
                color: activeTab===key ? C.accent : C.muted,
                transition:"all 0.15s", marginBottom:2,
              }}
              onMouseEnter={e=>{ if(activeTab!==key){ e.currentTarget.style.background=C.surface; e.currentTarget.style.color=C.text; }}}
              onMouseLeave={e=>{ if(activeTab!==key){ e.currentTarget.style.background="transparent"; e.currentTarget.style.color=C.muted; }}}
            >
              <Icon />
              <span style={{ fontSize:13, fontWeight: activeTab===key ? 700 : 400 }}>{label}</span>
              {key==="saved" && savedIds.length > 0 && (
                <span style={{ marginLeft:"auto", background:C.purple+"33", color:C.purple, padding:"1px 7px", borderRadius:10, fontSize:10, fontWeight:700 }}>{savedIds.length}</span>
              )}
            </div>
          ))}

          <div style={{ borderTop:`1px solid ${C.border}`, margin:"16px 0" }} />

          {/* Stats */}
          <div style={{ padding:"0 20px" }}>
            <div style={{ fontSize:10, letterSpacing:2, color:C.muted, marginBottom:12 }}>LIVE STATS</div>
            {[
              { label:"Total Videos", val: allPosts.length, color:C.text },
              { label:"AI Flagged", val: allPosts.filter(p=>{ const t=p.ai_votes+p.real_votes+p.unclear_votes||1; return p.ai_votes/t>0.55; }).length, color:C.danger },
              { label:"Verified Real", val: allPosts.filter(p=>{ const t=p.ai_votes+p.real_votes+p.unclear_votes||1; return p.real_votes/t>0.55; }).length, color:C.accent },
              { label:"Saved", val: savedIds.length, color:C.purple },
            ].map(s => (
              <div key={s.label} style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ fontSize:11, color:C.muted }}>{s.label}</span>
                <span style={{ fontSize:12, fontWeight:700, color:s.color }}>{s.val}</span>
              </div>
            ))}
          </div>

          <div style={{ borderTop:`1px solid ${C.border}`, margin:"16px 0" }} />

          {/* Legend */}
          <div style={{ padding:"0 20px" }}>
            <div style={{ fontSize:10, letterSpacing:2, color:C.muted, marginBottom:12 }}>VERDICT GUIDE</div>
            {[
              { icon:<Icons.lightning />, label:"AI Generated", color:C.danger },
              { icon:<Icons.check />, label:"Authentic / Real", color:C.accent },
              { icon:<Icons.question />, label:"Not Clear", color:C.warning },
            ].map((l,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, color:l.color }}>
                {l.icon}
                <span style={{ fontSize:11, color:C.text }}>{l.label}</span>
              </div>
            ))}
          </div>

          {/* Sign out at bottom */}
          <div style={{ marginTop:"auto", padding:"16px 20px 0" }}>
            <div onClick={handleLogout}
              style={{
                display:"flex", alignItems:"center", gap:10, padding:"10px 12px",
                borderRadius:10, cursor:"pointer", color:C.danger,
                background:C.danger+"11", border:`1px solid ${C.danger}22`,
              }}>
              <Icons.logout />
              <span style={{ fontSize:12, fontWeight:700 }}>Sign Out</span>
            </div>
          </div>
        </div>

        {/* Main feed */}
        <div style={{ flex:1, position:"relative", overflow:"hidden" }}>
          {/* Tab bar */}
          <div style={{
            position:"absolute", top:0, left:0, right:0, zIndex:50,
            background:C.bg+"ee", backdropFilter:"blur(10px)",
            borderBottom:`1px solid ${C.border}`,
            display:"flex", gap:4, padding:"0 20px", height:44, alignItems:"center",
          }}>
            {navItems.map(({ key, label }) => (
              <button key={key} onClick={()=>setActiveTab(key)} style={{
                padding:"5px 14px", background:"transparent", border:"none",
                borderBottom:activeTab===key ? `2px solid ${C.accent}` : "2px solid transparent",
                color:activeTab===key ? C.accent : C.muted,
                fontSize:11, fontWeight:700, cursor:"pointer", letterSpacing:1,
                textTransform:"uppercase", transition:"color 0.2s", whiteSpace:"nowrap",
              }}>{label}</button>
            ))}
            <div style={{ marginLeft:"auto", fontSize:11, color:C.muted }}>
              {posts.length} video{posts.length!==1?"s":""}
            </div>
          </div>

          {/* Video reel area */}
          <div style={{ position:"absolute", top:44, bottom:0, left:0, right:0 }}>
            {loading ? (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:14 }}>
                <div style={{ width:32, height:32, border:`2px solid ${C.border}`, borderTopColor:C.accent, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
                <div style={{ color:C.muted, fontSize:11, letterSpacing:2 }}>LOADING...</div>
              </div>
            ) : posts.length === 0 ? (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:12 }}>
                <div style={{ fontSize:42 }}>📭</div>
                <div style={{ color:C.text, fontSize:14, fontWeight:700 }}>
                  {activeTab === "saved" ? "No saved videos yet" : "No videos here"}
                </div>
                <div style={{ color:C.muted, fontSize:12 }}>
                  {activeTab === "saved" ? "Tap the save button on any video" : "Be the first to submit one!"}
                </div>
                <button onClick={()=>setShowSubmit(true)} style={{ padding:"8px 20px", background:C.accent+"22", border:`1px solid ${C.accent}`, borderRadius:20, color:C.accent, fontSize:11, cursor:"pointer", marginTop:8 }}>+ Submit Video</button>
              </div>
            ) : (
              <>
                {/* Scroll dots */}
                <div style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", display:"flex", flexDirection:"column", gap:5, zIndex:50 }}>
                  {posts.map((_, i) => (
                    <div key={i} onClick={()=>setActiveIndex(i)} style={{
                      width: i===activeIndex ? 6 : 4, height: i===activeIndex ? 6 : 4,
                      borderRadius:"50%",
                      background: i===activeIndex ? C.accent : "rgba(255,255,255,0.25)",
                      cursor:"pointer", transition:"all 0.2s",
                      boxShadow: i===activeIndex ? `0 0 6px ${C.accent}` : "none",
                    }} />
                  ))}
                </div>

                <div
                  ref={containerRef}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  style={{ width:"100%", height:"100%" }}
                >
                  <div style={{
                    width:"100%", height:"100%",
                    transition:"transform 0.45s cubic-bezier(0.25,0.46,0.45,0.94)",
                    transform:`translateY(-${activeIndex * 100}%)`,
                  }}>
                    {posts.map((post, i) => (
                      <div key={post.id} style={{ width:"100%", height:"100%" }}>
                        <ReelCard
                          post={post}
                          currentUser={currentUser}
                          onToast={showToast}
                          isActive={i === activeIndex}
                          onSave={handleSave}
                          savedIds={savedIds}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Swipe hint */}
                {posts.length > 1 && activeIndex === 0 && (
                  <div style={{ position:"absolute", bottom:16, left:"50%", transform:"translateX(-50%)", color:"rgba(255,255,255,0.35)", fontSize:11, pointerEvents:"none" }}>
                    scroll or swipe up ↑
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
