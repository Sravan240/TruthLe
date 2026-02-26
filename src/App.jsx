import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const C = {
  bg: "#080c14", surface: "#0d1320", card: "#111827",
  border: "#1e2d45", accent: "#00f5c4", danger: "#ff4d6d",
  warning: "#ffd60a", purple: "#7b61ff", text: "#e2eaf4", muted: "#5a7a99",
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

// ── Toast ─────────────────────────────────────────────────────
function Toast({ msg, type }) {
  return (
    <div style={{
      position:"fixed", bottom:100, left:"50%", transform:"translateX(-50%)",
      background: type==="error" ? C.danger+"22" : C.accent+"22",
      border:`1px solid ${type==="error" ? C.danger : C.accent}`,
      color: type==="error" ? C.danger : C.accent,
      padding:"10px 22px", borderRadius:30, fontSize:12, fontWeight:700,
      letterSpacing:1, zIndex:9999, backdropFilter:"blur(12px)",
      whiteSpace:"nowrap",
    }}>{msg}</div>
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
    borderRadius:8, color:C.text, fontSize:13, outline:"none",
    boxSizing:"border-box", marginBottom:12, fontFamily:"'Courier New', monospace",
  };

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.85)",
      display:"flex", alignItems:"center", justifyContent:"center",
      zIndex:1000, backdropFilter:"blur(6px)",
    }} onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{
        background:C.card, border:`1px solid ${C.border}`,
        borderRadius:20, padding:32, width:"100%", maxWidth:460,
        fontFamily:"'Courier New', monospace",
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <div style={{ color:C.accent, fontWeight:800, fontSize:14, letterSpacing:2 }}>SUBMIT VIDEO</div>
          <span onClick={onClose} style={{ color:C.muted, cursor:"pointer", fontSize:18 }}>✕</span>
        </div>
        <input placeholder="Title *" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} style={iStyle} />
        <textarea placeholder="Description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}
          style={{...iStyle, height:70, resize:"vertical"}} />
        <input placeholder="YouTube URL (e.g. https://youtube.com/watch?v=...)" value={form.video_url} onChange={e=>setForm({...form,video_url:e.target.value})} style={iStyle} />
        <input placeholder="Thumbnail URL (optional)" value={form.thumbnail_url} onChange={e=>setForm({...form,thumbnail_url:e.target.value})} style={iStyle} />
        <input placeholder="Tags (comma separated: politics, deepfake)" value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})} style={iStyle} />
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

// ── Auth Modal ────────────────────────────────────────────────
function AuthModal({ onClose, onAuth, onToast }) {
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
        onToast("Account created!", "success");
        onAuth(data.user);
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
      if (error) { onToast(error.message, "error"); setLoading(false); return; }
      onToast("Welcome back!", "success");
      onAuth(data.user);
    }
    setLoading(false);
    onClose();
  };

  const iStyle = {
    width:"100%", padding:"12px 16px",
    background:C.surface, border:`1px solid ${C.border}`,
    borderRadius:10, color:C.text, fontSize:14, outline:"none",
    boxSizing:"border-box", marginBottom:12, fontFamily:"'Courier New', monospace",
  };

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.9)",
      display:"flex", alignItems:"center", justifyContent:"center",
      zIndex:2000, backdropFilter:"blur(8px)",
    }} onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{
        background:C.card, border:`1px solid ${C.border}`,
        borderRadius:20, padding:40, width:"100%", maxWidth:400,
        fontFamily:"'Courier New', monospace",
        boxShadow:`0 0 60px ${C.accent}15`,
      }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{
            display:"inline-flex", alignItems:"center", gap:8,
            padding:"6px 16px", border:`1px solid ${C.accent}44`, borderRadius:30, marginBottom:14,
          }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:C.accent, boxShadow:`0 0 8px ${C.accent}` }} />
            <span style={{ color:C.accent, fontSize:11, letterSpacing:3, fontWeight:700 }}>TRUTHLENS</span>
          </div>
          <div style={{ fontSize:20, fontWeight:700, color:C.text, marginBottom:4 }}>
            {mode==="register" ? "Create Account" : "Welcome Back"}
          </div>
          <div style={{ fontSize:12, color:C.muted }}>
            {mode==="register" ? "Join the AI truth verification network" : "Sign in to vote and submit videos"}
          </div>
        </div>
        {mode==="register" && (
          <input placeholder="Username" value={form.username} onChange={e=>setForm({...form,username:e.target.value})} style={iStyle} />
        )}
        <input placeholder="Email" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} style={iStyle} />
        <input placeholder="Password" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} style={iStyle}
          onKeyDown={e=>e.key==="Enter"&&handleSubmit()} />
        <button onClick={handleSubmit} disabled={loading} style={{
          width:"100%", marginTop:8, padding:"13px",
          background:`linear-gradient(135deg, ${C.accent}, #00c9a7)`,
          border:"none", borderRadius:10, color:"#080c14",
          fontSize:12, fontWeight:800, letterSpacing:2, cursor:"pointer", opacity: loading ? 0.7 : 1,
        }}>{loading ? "..." : mode==="register" ? "CREATE ACCOUNT" : "SIGN IN"}</button>
        <div style={{ textAlign:"center", marginTop:18, fontSize:12, color:C.muted }}>
          {mode==="register" ? "Already have an account? " : "Don't have an account? "}
          <span onClick={()=>setMode(mode==="register"?"login":"register")}
            style={{ color:C.accent, cursor:"pointer", textDecoration:"underline" }}>
            {mode==="register" ? "Sign in" : "Register"}
          </span>
        </div>
        <div style={{ textAlign:"center", marginTop:10 }}>
          <span onClick={onClose} style={{ color:C.muted, cursor:"pointer", fontSize:11 }}>
            Continue as guest (view only) →
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Reel Card ─────────────────────────────────────────────────
function ReelCard({ post, currentUser, onAuthRequired, onToast, isActive }) {
  const [votes, setVotes] = useState({ ai: post.ai_votes||0, real: post.real_votes||0, unclear: post.unclear_votes||0 });
  const [userVote, setUserVote] = useState(post.user_vote || null);
  const [voting, setVoting] = useState(false);
  const [muted, setMuted] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const verdict = getVerdict(votes.ai, votes.real, votes.unclear);
  const youtubeId = getYouTubeId(post.video_url);
  const avatarColor = post.profiles?.avatar_color || C.accent;
  const total = votes.ai + votes.real + votes.unclear || 1;

  const handleVote = async (type) => {
    if (!currentUser) { onAuthRequired(); return; }
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
      onToast(type === "ai" ? "⚡ Voted AI Generated" : type === "real" ? "✓ Voted Real" : "? Voted Unclear", "success");
    } catch {
      setVotes(votes); setUserVote(prev);
      onToast("Vote failed", "error");
    }
    setVoting(false);
  };

  return (
    <div style={{
      position:"relative", width:"100%", height:"100%",
      background:"#000", flexShrink:0, overflow:"hidden",
    }}>
      {/* Video / Thumbnail */}
      {youtubeId && isActive ? (
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=${muted?1:0}&loop=1&playlist=${youtubeId}&controls=0&modestbranding=1&rel=0&playsinline=1`}
          style={{ position:"absolute", inset:0, width:"100%", height:"100%", border:"none", pointerEvents:"none" }}
          allow="autoplay; fullscreen"
          allowFullScreen
        />
      ) : (
        <div style={{ position:"absolute", inset:0 }}>
          {post.thumbnail_url
            ? <img src={post.thumbnail_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            : <div style={{ width:"100%", height:"100%", background:`linear-gradient(135deg, ${C.surface}, ${C.bg})` }} />
          }
          {!isActive && (
            <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <div style={{
                width:60, height:60, borderRadius:"50%",
                background:"rgba(0,0,0,0.6)", border:"2px solid rgba(255,255,255,0.4)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:22,
              }}>▶</div>
            </div>
          )}
        </div>
      )}

      {/* Dark gradient overlays */}
      <div style={{
        position:"absolute", inset:0,
        background:"linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0.4) 100%)",
        pointerEvents:"none",
      }} />

      {/* Top bar */}
      <div style={{
        position:"absolute", top:0, left:0, right:0,
        padding:"16px 16px 0",
        display:"flex", justifyContent:"space-between", alignItems:"flex-start",
      }}>
        {/* Verdict badge */}
        <div style={{
          background:verdict.color+"33", border:`1px solid ${verdict.color}`,
          color:verdict.color, padding:"5px 12px", borderRadius:20,
          fontSize:11, fontWeight:800, letterSpacing:1.5, backdropFilter:"blur(8px)",
        }}>{verdict.icon} {verdict.label}</div>

        {/* Mute button */}
        {youtubeId && isActive && (
          <button onClick={()=>setMuted(!muted)} style={{
            width:38, height:38, borderRadius:"50%",
            background:"rgba(0,0,0,0.5)", border:"1px solid rgba(255,255,255,0.2)",
            color:"white", fontSize:16, cursor:"pointer", backdropFilter:"blur(8px)",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>{muted ? "🔇" : "🔊"}</button>
        )}
      </div>

      {/* Right side actions */}
      <div style={{
        position:"absolute", right:14, bottom:160,
        display:"flex", flexDirection:"column", alignItems:"center", gap:20,
      }}>
        {/* Avatar */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
          <div style={{
            width:44, height:44, borderRadius:"50%",
            background:avatarColor+"33", border:`2px solid ${avatarColor}`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:13, fontWeight:700, color:avatarColor,
          }}>{initials(post.profiles?.username)}</div>
        </div>

        {/* Vote buttons */}
        {[
          { key:"ai", icon:"⚡", label:"AI", color:C.danger },
          { key:"real", icon:"✓", label:"Real", color:C.accent },
          { key:"unclear", icon:"?", label:"Unclear", color:C.warning },
        ].map(({ key, icon, label, color }) => (
          <div key={key} onClick={() => handleVote(key)}
            style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, cursor: currentUser ? "pointer" : "not-allowed" }}>
            <div style={{
              width:48, height:48, borderRadius:"50%",
              background: userVote===key ? color+"44" : "rgba(0,0,0,0.5)",
              border:`2px solid ${userVote===key ? color : "rgba(255,255,255,0.2)"}`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:18, backdropFilter:"blur(8px)",
              transform: userVote===key ? "scale(1.15)" : "scale(1)",
              transition:"all 0.2s",
              boxShadow: userVote===key ? `0 0 16px ${color}66` : "none",
            }}>{icon}</div>
            <span style={{ fontSize:10, color: userVote===key ? color : "rgba(255,255,255,0.7)", fontWeight:700 }}>
              {votes[key].toLocaleString()}
            </span>
          </div>
        ))}

        {/* Info toggle */}
        <div onClick={()=>setShowInfo(!showInfo)}
          style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, cursor:"pointer" }}>
          <div style={{
            width:48, height:48, borderRadius:"50%",
            background: showInfo ? C.purple+"44" : "rgba(0,0,0,0.5)",
            border:`2px solid ${showInfo ? C.purple : "rgba(255,255,255,0.2)"}`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:18, backdropFilter:"blur(8px)",
          }}>ℹ</div>
          <span style={{ fontSize:10, color:"rgba(255,255,255,0.7)", fontWeight:700 }}>Info</span>
        </div>
      </div>

      {/* Bottom info */}
      <div style={{
        position:"absolute", bottom:0, left:0, right:70,
        padding:"0 16px 24px",
      }}>
        {/* User */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
          <span style={{ color:avatarColor, fontSize:13, fontWeight:700 }}>@{post.profiles?.username || "unknown"}</span>
          <span style={{ color:"rgba(255,255,255,0.4)", fontSize:11 }}>{timeAgo(post.created_at)}</span>
        </div>

        {/* Title */}
        <div style={{ fontSize:16, fontWeight:800, color:"white", marginBottom:6, lineHeight:1.3 }}>{post.title}</div>

        {/* Description (expandable) */}
        {showInfo && (
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.7)", lineHeight:1.6, marginBottom:8 }}>{post.description}</div>
        )}

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
            {post.tags.map(t => (
              <span key={t} style={{
                padding:"2px 8px", borderRadius:20,
                background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.15)",
                color:"rgba(255,255,255,0.6)", fontSize:10,
              }}>#{t}</span>
            ))}
          </div>
        )}

        {/* Vote bar */}
        <div style={{ display:"flex", height:3, borderRadius:2, overflow:"hidden", gap:1, marginBottom:6 }}>
          <div style={{ width:`${(votes.ai/total)*100}%`, background:C.danger }} />
          <div style={{ width:`${(votes.real/total)*100}%`, background:C.accent }} />
          <div style={{ width:`${(votes.unclear/total)*100}%`, background:C.warning }} />
        </div>
        <div style={{ display:"flex", gap:12, fontSize:10, color:"rgba(255,255,255,0.5)" }}>
          <span style={{ color:C.danger }}>⚡ {Math.round((votes.ai/total)*100)}% AI</span>
          <span style={{ color:C.accent }}>✓ {Math.round((votes.real/total)*100)}% Real</span>
          <span style={{ color:C.warning }}>? {Math.round((votes.unclear/total)*100)}% Unclear</span>
        </div>
      </div>

      {/* Login prompt overlay */}
      {!currentUser && (
        <div style={{
          position:"absolute", bottom:80, left:"50%", transform:"translateX(-50%)",
          background:"rgba(0,0,0,0.7)", border:`1px solid ${C.accent}44`,
          borderRadius:20, padding:"8px 16px",
          fontSize:11, color:C.muted, whiteSpace:"nowrap", backdropFilter:"blur(8px)",
        }}>Sign in to vote 👆</div>
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showAuth, setShowAuth] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [toast, setToast] = useState(null);
  const containerRef = useRef(null);
  const touchStartY = useRef(null);

  const showToast = (msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) { setCurrentUser(data.session.user); fetchProfile(data.session.user.id); }
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
    setLoading(true);
    const { data: postsData } = await supabase
      .from("posts").select("*, profiles(username, avatar_color)")
      .order("created_at", { ascending: false });

    if (!postsData) { setLoading(false); return; }
    const postIds = postsData.map(p => p.id);
    let enriched = postsData.map(p => ({ ...p, ai_votes:0, real_votes:0, unclear_votes:0, user_vote:null }));

    if (postIds.length > 0) {
      const { data: votesData } = await supabase.from("votes").select("post_id, vote_type").in("post_id", postIds);
      let userVotes = {};
      if (currentUser) {
        const { data: uv } = await supabase.from("votes").select("post_id, vote_type")
          .eq("user_id", currentUser.id).in("post_id", postIds);
        (uv||[]).forEach(v => { userVotes[v.post_id] = v.vote_type; });
      }
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
    setPosts(enriched);
    setLoading(false);
  }, [currentUser]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // Scroll snapping via wheel
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    if (e.deltaY > 40) setActiveIndex(i => Math.min(i + 1, posts.length - 1));
    else if (e.deltaY < -40) setActiveIndex(i => Math.max(i - 1, 0));
  }, [posts.length]);

  // Touch swipe
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null); setProfile(null); setShowMenu(false);
    showToast("Signed out");
  };

  return (
    <div style={{ width:"100vw", height:"100vh", background:"#000", overflow:"hidden", fontFamily:"'Courier New', monospace", position:"relative" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {toast && <Toast msg={toast.msg} type={toast.type} />}
      {showAuth && <AuthModal onClose={()=>setShowAuth(false)} onAuth={setCurrentUser} onToast={showToast} />}
      {showSubmit && currentUser && <SubmitModal user={currentUser} onClose={()=>setShowSubmit(false)} onSubmitted={fetchPosts} onToast={showToast} />}

      {/* Top navbar */}
      <div style={{
        position:"fixed", top:0, left:0, right:0, zIndex:500,
        padding:"12px 20px",
        display:"flex", justifyContent:"space-between", alignItems:"center",
        background:"linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)",
        pointerEvents:"none",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, pointerEvents:"auto" }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:C.accent, boxShadow:`0 0 10px ${C.accent}` }} />
          <span style={{ color:C.accent, fontSize:13, letterSpacing:3, fontWeight:800 }}>TRUTHLENS</span>
        </div>

        <div style={{ display:"flex", gap:10, pointerEvents:"auto" }}>
          {currentUser ? (
            <>
              <button onClick={()=>setShowSubmit(true)} style={{
                padding:"6px 14px",
                background:C.accent+"22", border:`1px solid ${C.accent}44`,
                borderRadius:20, color:C.accent,
                fontSize:11, fontWeight:700, cursor:"pointer", letterSpacing:1,
                backdropFilter:"blur(8px)",
              }}>+ POST</button>
              <div onClick={()=>setShowMenu(!showMenu)} style={{
                width:34, height:34, borderRadius:"50%",
                background:(profile?.avatar_color||C.accent)+"33",
                border:`2px solid ${profile?.avatar_color||C.accent}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:11, fontWeight:700, color:profile?.avatar_color||C.accent,
                cursor:"pointer",
              }}>{initials(profile?.username)}</div>
            </>
          ) : (
            <button onClick={()=>setShowAuth(true)} style={{
              padding:"6px 16px",
              background:`linear-gradient(135deg, ${C.accent}, #00c9a7)`,
              border:"none", borderRadius:20, color:"#080c14",
              fontSize:11, fontWeight:800, cursor:"pointer", letterSpacing:1,
            }}>SIGN IN</button>
          )}
        </div>
      </div>

      {/* Dropdown menu */}
      {showMenu && (
        <div style={{
          position:"fixed", top:60, right:16, zIndex:600,
          background:C.card, border:`1px solid ${C.border}`,
          borderRadius:12, padding:8, minWidth:150,
          backdropFilter:"blur(16px)",
        }}>
          <div style={{ padding:"8px 14px", fontSize:12, color:C.muted, borderBottom:`1px solid ${C.border}`, marginBottom:4 }}>
            @{profile?.username}
          </div>
          <div onClick={handleLogout} style={{
            padding:"8px 14px", fontSize:12, color:C.danger,
            cursor:"pointer", borderRadius:8,
          }}>Sign out ⏻</div>
        </div>
      )}

      {/* Scroll indicator dots */}
      {posts.length > 0 && (
        <div style={{
          position:"fixed", right:6, top:"50%", transform:"translateY(-50%)",
          display:"flex", flexDirection:"column", gap:6, zIndex:500,
        }}>
          {posts.map((_, i) => (
            <div key={i} onClick={()=>setActiveIndex(i)} style={{
              width: i===activeIndex ? 6 : 4,
              height: i===activeIndex ? 6 : 4,
              borderRadius:"50%",
              background: i===activeIndex ? C.accent : "rgba(255,255,255,0.3)",
              cursor:"pointer",
              transition:"all 0.2s",
              boxShadow: i===activeIndex ? `0 0 6px ${C.accent}` : "none",
            }} />
          ))}
        </div>
      )}

      {/* Reel container */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ width:"100%", height:"100%", position:"relative" }}
      >
        {loading ? (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:16 }}>
            <div style={{ width:36, height:36, border:`2px solid ${C.border}`, borderTopColor:C.accent, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
            <div style={{ color:C.muted, fontSize:12, letterSpacing:2 }}>LOADING FEED...</div>
          </div>
        ) : posts.length === 0 ? (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:12 }}>
            <div style={{ fontSize:40 }}>📭</div>
            <div style={{ color:C.muted, fontSize:13 }}>No videos yet</div>
            {currentUser
              ? <button onClick={()=>setShowSubmit(true)} style={{ padding:"8px 20px", background:C.accent+"22", border:`1px solid ${C.accent}`, borderRadius:20, color:C.accent, fontSize:11, cursor:"pointer" }}>+ Submit first video</button>
              : <button onClick={()=>setShowAuth(true)} style={{ padding:"8px 20px", background:C.accent+"22", border:`1px solid ${C.accent}`, borderRadius:20, color:C.accent, fontSize:11, cursor:"pointer" }}>Sign in to post</button>
            }
          </div>
        ) : (
          <div style={{
            width:"100%", height:"100%",
            transition:"transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            transform:`translateY(-${activeIndex * 100}%)`,
          }}>
            {posts.map((post, i) => (
              <div key={post.id} style={{ width:"100%", height:"100vh" }}>
                <ReelCard
                  post={post}
                  currentUser={currentUser}
                  onAuthRequired={()=>setShowAuth(true)}
                  onToast={showToast}
                  isActive={i === activeIndex}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Swipe hint */}
      {posts.length > 1 && activeIndex === 0 && (
        <div style={{
          position:"fixed", bottom:20, left:"50%", transform:"translateX(-50%)",
          color:"rgba(255,255,255,0.4)", fontSize:11, letterSpacing:1,
          animation:"slideUp 0.5s ease 1s both",
          pointerEvents:"none",
        }}>scroll or swipe up ↑</div>
      )}
    </div>
  );
}
