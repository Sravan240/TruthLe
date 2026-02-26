// ============================================================
//  TRUTHLENS — Full Supabase-connected frontend
//  Before running, follow the SETUP GUIDE below.
//
//  SETUP GUIDE (do these once, takes ~10 min):
//
//  STEP 1 — Create Supabase Project
//    1. Go to https://supabase.com and sign up (free)
//    2. Click "New Project", give it a name e.g. "truthlens"
//    3. Set a strong DB password, save it somewhere
//    4. Wait ~2 min for it to provision
//
//  STEP 2 — Run SQL to create your tables
//    1. In your Supabase dashboard, click "SQL Editor" (left sidebar)
//    2. Click "New Query" and paste this SQL, then click Run:
//
//    -- PROFILES TABLE
//    create table profiles (
//      id uuid references auth.users on delete cascade primary key,
//      username text unique not null,
//      avatar_color text default '#00f5c4',
//      created_at timestamptz default now()
//    );
//    alter table profiles enable row level security;
//    create policy "Public profiles are viewable by everyone"
//      on profiles for select using (true);
//    create policy "Users can insert their own profile"
//      on profiles for insert with check (auth.uid() = id);
//
//    -- POSTS TABLE
//    create table posts (
//      id uuid default gen_random_uuid() primary key,
//      user_id uuid references profiles(id) on delete cascade not null,
//      title text not null,
//      description text,
//      thumbnail_url text,
//      video_url text,
//      tags text[] default '{}',
//      created_at timestamptz default now()
//    );
//    alter table posts enable row level security;
//    create policy "Posts are viewable by everyone"
//      on posts for select using (true);
//    create policy "Authenticated users can insert posts"
//      on posts for insert with check (auth.uid() = user_id);
//
//    -- VOTES TABLE
//    create table votes (
//      id uuid default gen_random_uuid() primary key,
//      user_id uuid references profiles(id) on delete cascade not null,
//      post_id uuid references posts(id) on delete cascade not null,
//      vote_type text check (vote_type in ('ai','real','unclear')) not null,
//      created_at timestamptz default now(),
//      unique(user_id, post_id)
//    );
//    alter table votes enable row level security;
//    create policy "Votes are viewable by everyone"
//      on votes for select using (true);
//    create policy "Authenticated users can vote"
//      on votes for insert with check (auth.uid() = user_id);
//    create policy "Users can update their own votes"
//      on votes for update using (auth.uid() = user_id);
//
//  STEP 3 — Get your API keys
//    1. In Supabase dashboard, go to Settings > API
//    2. Copy "Project URL" -> paste as SUPABASE_URL below
//    3. Copy "anon public" key -> paste as SUPABASE_ANON_KEY below
//
//  STEP 4 — Install Supabase SDK in your project
//    npm install @supabase/supabase-js
//
//  STEP 5 — Paste your keys below and you're done!
// ============================================================

import { useState, useEffect, useCallback } from "react";
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

function Toast({ msg, type }) {
  return (
    <div style={{
      position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)",
      background: type==="error" ? C.danger+"22" : C.accent+"22",
      border:`1px solid ${type==="error" ? C.danger : C.accent}`,
      color: type==="error" ? C.danger : C.accent,
      padding:"10px 22px", borderRadius:30, fontSize:12, fontWeight:700,
      letterSpacing:1, zIndex:9999, backdropFilter:"blur(12px)",
      animation:"fadeIn 0.2s ease", whiteSpace:"nowrap",
    }}>{msg}</div>
  );
}

function VoteBar({ ai, real, unclear }) {
  const total = ai + real + unclear || 1;
  return (
    <div style={{ marginTop:12 }}>
      <div style={{ display:"flex", height:6, borderRadius:3, overflow:"hidden", gap:2 }}>
        <div style={{ width:`${(ai/total)*100}%`, background:C.danger, transition:"width 0.5s" }} />
        <div style={{ width:`${(real/total)*100}%`, background:C.accent, transition:"width 0.5s" }} />
        <div style={{ width:`${(unclear/total)*100}%`, background:C.warning, transition:"width 0.5s" }} />
      </div>
      <div style={{ display:"flex", gap:16, marginTop:8, fontSize:11 }}>
        <span style={{ color:C.danger }}>⚡ AI {ai.toLocaleString()}</span>
        <span style={{ color:C.accent }}>✓ REAL {real.toLocaleString()}</span>
        <span style={{ color:C.warning }}>? UNCLEAR {unclear.toLocaleString()}</span>
      </div>
    </div>
  );
}

function PostCard({ post, currentUser, onAuthRequired, onToast }) {
  const [votes, setVotes] = useState({ ai: post.ai_votes||0, real: post.real_votes||0, unclear: post.unclear_votes||0 });
  const [userVote, setUserVote] = useState(post.user_vote || null);
  const [voting, setVoting] = useState(false);
  const verdict = getVerdict(votes.ai, votes.real, votes.unclear);
  const avatarColor = post.profiles?.avatar_color || C.accent;

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
    } catch {
      setVotes(votes); setUserVote(prev);
      onToast("Vote failed, try again", "error");
    }
    setVoting(false);
  };

  return (
    <div style={{
      background:C.card, border:`1px solid ${C.border}`,
      borderRadius:16, overflow:"hidden", transition:"transform 0.2s, border-color 0.2s",
    }}
      onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.borderColor=C.accent+"55"; }}
      onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.borderColor=C.border; }}
    >
      <div style={{ position:"relative", height:200, overflow:"hidden", background:C.surface }}>
        {post.thumbnail_url
          ? <img src={post.thumbnail_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", filter:"brightness(0.7)" }} />
          : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", color:C.muted, fontSize:13 }}>No thumbnail</div>
        }
        <div style={{
          position:"absolute", top:12, right:12,
          background:verdict.color+"22", border:`1px solid ${verdict.color}`,
          color:verdict.color, padding:"4px 10px", borderRadius:20,
          fontSize:11, fontWeight:700, letterSpacing:1, backdropFilter:"blur(8px)",
        }}>{verdict.icon} {verdict.label}</div>
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{
            width:48, height:48, borderRadius:"50%",
            background:"rgba(0,0,0,0.6)", border:"2px solid rgba(255,255,255,0.3)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:18, cursor:"pointer", backdropFilter:"blur(4px)",
          }}>▶</div>
        </div>
      </div>

      <div style={{ padding:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
          <div style={{
            width:32, height:32, borderRadius:"50%",
            background:avatarColor+"22", border:`2px solid ${avatarColor}`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:11, fontWeight:700, color:avatarColor,
          }}>{initials(post.profiles?.username)}</div>
          <span style={{ color:C.text, fontSize:13, fontWeight:600 }}>@{post.profiles?.username || "unknown"}</span>
          <span style={{ color:C.muted, fontSize:11, marginLeft:"auto" }}>{timeAgo(post.created_at)}</span>
        </div>

        <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:6, lineHeight:1.4 }}>{post.title}</div>
        <div style={{ fontSize:13, color:C.muted, lineHeight:1.6, marginBottom:12 }}>{post.description}</div>

        {post.tags?.length > 0 && (
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14 }}>
            {post.tags.map(t => (
              <span key={t} style={{
                padding:"2px 8px", borderRadius:20,
                background:C.surface, border:`1px solid ${C.border}`,
                color:C.muted, fontSize:10, letterSpacing:0.5,
              }}>#{t}</span>
            ))}
          </div>
        )}

        <VoteBar ai={votes.ai} real={votes.real} unclear={votes.unclear} />

        <div style={{ display:"flex", gap:8, marginTop:16 }}>
          {[
            { key:"ai", label:"⚡ AI", color:C.danger },
            { key:"real", label:"✓ REAL", color:C.accent },
            { key:"unclear", label:"? NOT CLEAR", color:C.warning },
          ].map(({ key, label, color }) => (
            <button key={key} onClick={() => handleVote(key)} style={{
              flex:1, padding:"8px 4px",
              borderRadius:8, border:`1px solid ${userVote===key ? color : C.border}`,
              background:userVote===key ? color+"22" : "transparent",
              color:userVote===key ? color : C.muted,
              fontSize:10, fontWeight:700, cursor: currentUser ? "pointer" : "not-allowed",
              transition:"all 0.2s", letterSpacing:0.5, opacity: voting ? 0.6 : 1,
            }}>
              {label}
              {!currentUser && <span style={{ display:"block", fontSize:8, marginTop:2, color:C.muted }}>login to vote</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

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
    transition:"border-color 0.2s",
  };

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.8)",
      display:"flex", alignItems:"center", justifyContent:"center",
      zIndex:1000, backdropFilter:"blur(6px)",
    }} onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{
        background:C.card, border:`1px solid ${C.border}`,
        borderRadius:20, padding:32, width:"100%", maxWidth:480,
        fontFamily:"'Courier New', monospace",
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <div style={{ color:C.accent, fontWeight:800, fontSize:14, letterSpacing:2 }}>SUBMIT VIDEO</div>
          <span onClick={onClose} style={{ color:C.muted, cursor:"pointer", fontSize:18 }}>✕</span>
        </div>
        <input placeholder="Title *" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} style={iStyle}
          onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border} />
        <textarea placeholder="Description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}
          style={{...iStyle, height:80, resize:"vertical"}}
          onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border} />
        <input placeholder="Thumbnail URL (optional)" value={form.thumbnail_url} onChange={e=>setForm({...form,thumbnail_url:e.target.value})} style={iStyle}
          onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border} />
        <input placeholder="Video URL (optional)" value={form.video_url} onChange={e=>setForm({...form,video_url:e.target.value})} style={iStyle}
          onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border} />
        <input placeholder="Tags (comma separated: politics, deepfake)" value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})} style={iStyle}
          onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border} />
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
        onToast("Account created! Check email to confirm.", "success");
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
    transition:"border-color 0.2s",
  };

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.85)",
      display:"flex", alignItems:"center", justifyContent:"center",
      zIndex:1000, backdropFilter:"blur(8px)",
    }} onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{
        position:"relative", zIndex:1,
        background:C.card, border:`1px solid ${C.border}`,
        borderRadius:20, padding:40, width:"100%", maxWidth:420,
        boxShadow:`0 0 60px ${C.accent}10`,
        fontFamily:"'Courier New', monospace",
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
          <input placeholder="Username" value={form.username} onChange={e=>setForm({...form,username:e.target.value})} style={iStyle}
            onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border} />
        )}
        <input placeholder="Email" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} style={iStyle}
          onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border} />
        <input placeholder="Password" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} style={iStyle}
          onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}
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

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("trending");
  const [search, setSearch] = useState("");
  const [showAuth, setShowAuth] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setCurrentUser(data.session.user);
        fetchProfile(data.session.user.id);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
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
    const { data: postsData, error } = await supabase
      .from("posts")
      .select("*, profiles(username, avatar_color)")
      .order("created_at", { ascending: false });

    if (error || !postsData) { setLoading(false); return; }

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

    if (activeTab === "verified") {
      enriched = enriched.filter(p => { const t=p.ai_votes+p.real_votes+p.unclear_votes||1; return p.real_votes/t>0.55; });
    } else if (activeTab === "disputed") {
      enriched = enriched.filter(p => { const t=p.ai_votes+p.real_votes+p.unclear_votes||1; return p.ai_votes/t<=0.55&&p.real_votes/t<=0.55; });
    }

    const filtered = search
      ? enriched.filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || (p.description||"").toLowerCase().includes(search.toLowerCase()))
      : enriched;

    setPosts(filtered);
    setLoading(false);
  }, [activeTab, search, currentUser]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const totalPosts = posts.length;
  const aiDetected = posts.filter(p => { const t=p.ai_votes+p.real_votes+p.unclear_votes||1; return p.ai_votes/t>0.55; }).length;
  const verified = posts.filter(p => { const t=p.ai_votes+p.real_votes+p.unclear_votes||1; return p.real_votes/t>0.55; }).length;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null); setProfile(null);
    showToast("Signed out");
  };

  const tabs = ["trending","recent","verified","disputed"];

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"'Courier New', monospace" }}>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes fadeIn { from { opacity:0; transform:translateX(-50%) translateY(10px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width:6px; }
        ::-webkit-scrollbar-track { background:${C.bg}; }
        ::-webkit-scrollbar-thumb { background:${C.border}; border-radius:3px; }
        textarea { font-family: 'Courier New', monospace; }
      `}</style>

      {toast && <Toast msg={toast.msg} type={toast.type} />}
      {showAuth && <AuthModal onClose={()=>setShowAuth(false)} onAuth={setCurrentUser} onToast={showToast} />}
      {showSubmit && currentUser && <SubmitModal user={currentUser} onClose={()=>setShowSubmit(false)} onSubmitted={fetchPosts} onToast={showToast} />}

      {/* Navbar */}
      <nav style={{
        position:"sticky", top:0, zIndex:100,
        background:C.bg+"ee", backdropFilter:"blur(12px)",
        borderBottom:`1px solid ${C.border}`,
        padding:"0 24px", display:"flex", alignItems:"center", height:60, gap:20,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:C.accent, boxShadow:`0 0 10px ${C.accent}` }} />
          <span style={{ color:C.accent, fontSize:13, letterSpacing:3, fontWeight:800 }}>TRUTHLENS</span>
        </div>

        <div style={{ flex:1, maxWidth:400, position:"relative" }}>
          <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:C.muted, fontSize:14 }}>⌕</span>
          <input placeholder="Search videos..." value={search} onChange={e=>setSearch(e.target.value)}
            style={{
              width:"100%", padding:"8px 12px 8px 34px",
              background:C.surface, border:`1px solid ${C.border}`,
              borderRadius:20, color:C.text, fontSize:13, outline:"none",
            }} />
        </div>

        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:12 }}>
          {currentUser ? (
            <>
              <button onClick={()=>setShowSubmit(true)} style={{
                padding:"7px 16px", background:C.accent+"22", border:`1px solid ${C.accent}`,
                borderRadius:20, color:C.accent, fontSize:11, fontWeight:700, cursor:"pointer", letterSpacing:1,
              }}>+ SUBMIT VIDEO</button>
              <div style={{
                display:"flex", alignItems:"center", gap:8,
                padding:"4px 12px 4px 4px",
                background:C.surface, border:`1px solid ${C.border}`, borderRadius:30,
              }}>
                <div style={{
                  width:28, height:28, borderRadius:"50%",
                  background:(profile?.avatar_color||C.accent)+"22",
                  border:`2px solid ${profile?.avatar_color||C.accent}`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:10, fontWeight:700, color:profile?.avatar_color||C.accent,
                }}>{initials(profile?.username)}</div>
                <span style={{ color:C.text, fontSize:11 }}>@{profile?.username||"..."}</span>
                <span onClick={handleLogout} title="Sign out" style={{ color:C.muted, cursor:"pointer", fontSize:14, marginLeft:4 }}>⏻</span>
              </div>
            </>
          ) : (
            <>
              <span style={{ color:C.muted, fontSize:11 }}>👁 Guest Mode</span>
              <button onClick={()=>setShowAuth(true)} style={{
                padding:"7px 18px",
                background:`linear-gradient(135deg, ${C.accent}, #00c9a7)`,
                border:"none", borderRadius:20, color:"#080c14",
                fontSize:11, fontWeight:800, cursor:"pointer", letterSpacing:1,
              }}>SIGN IN</button>
            </>
          )}
        </div>
      </nav>

      {/* Guest banner */}
      {!currentUser && (
        <div style={{
          background:`linear-gradient(90deg, ${C.accent}15, ${C.purple}15)`,
          borderBottom:`1px solid ${C.accent}33`,
          padding:"10px 24px", textAlign:"center", fontSize:12, color:C.muted,
        }}>
          👋 You're browsing as a guest. <span onClick={()=>setShowAuth(true)}
            style={{ color:C.accent, cursor:"pointer", fontWeight:700, textDecoration:"underline" }}>
            Sign in or register
          </span> to vote on videos and submit your own.
        </div>
      )}

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"24px 20px", display:"flex", gap:24 }}>
        {/* Sidebar */}
        <aside style={{ width:220, flexShrink:0 }}>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:20, marginBottom:16 }}>
            <div style={{ fontSize:10, letterSpacing:2, color:C.muted, marginBottom:14 }}>LIVE STATS</div>
            {[
              { label:"Videos Loaded", val: totalPosts.toLocaleString(), color:C.accent },
              { label:"AI Detected", val: aiDetected.toLocaleString(), color:C.danger },
              { label:"Verified Real", val: verified.toLocaleString(), color:C.accent },
              { label:"Status", val: currentUser ? "SIGNED IN" : "GUEST", color:currentUser ? C.accent : C.warning },
            ].map(s => (
              <div key={s.label} style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                <span style={{ fontSize:11, color:C.muted }}>{s.label}</span>
                <span style={{ fontSize:12, fontWeight:700, color:s.color }}>{s.val}</span>
              </div>
            ))}
          </div>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:20 }}>
            <div style={{ fontSize:10, letterSpacing:2, color:C.muted, marginBottom:14 }}>LEGEND</div>
            {[
              { icon:"⚡", label:"AI Generated", color:C.danger },
              { icon:"✓", label:"Authentic/Real", color:C.accent },
              { icon:"?", label:"Not Clear", color:C.warning },
            ].map(l => (
              <div key={l.label} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                <span style={{ color:l.color, fontSize:16 }}>{l.icon}</span>
                <span style={{ fontSize:11, color:C.text }}>{l.label}</span>
              </div>
            ))}
            {!currentUser && (
              <div style={{ marginTop:16, padding:"10px", background:C.warning+"11", border:`1px solid ${C.warning}33`, borderRadius:8 }}>
                <div style={{ fontSize:10, color:C.warning, fontWeight:700, marginBottom:4 }}>GUEST RESTRICTIONS</div>
                <div style={{ fontSize:10, color:C.muted, lineHeight:1.8 }}>✗ Can't vote<br/>✗ Can't submit<br/>✓ Can view all</div>
              </div>
            )}
          </div>
        </aside>

        {/* Main */}
        <main style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", gap:4, marginBottom:24, borderBottom:`1px solid ${C.border}` }}>
            {tabs.map(tab => (
              <button key={tab} onClick={()=>setActiveTab(tab)} style={{
                padding:"8px 18px", background:"transparent", border:"none",
                borderBottom:activeTab===tab ? `2px solid ${C.accent}` : "2px solid transparent",
                color:activeTab===tab ? C.accent : C.muted,
                fontSize:11, fontWeight:700, cursor:"pointer", letterSpacing:1, textTransform:"uppercase",
                transition:"color 0.2s",
              }}>{tab}</button>
            ))}
          </div>

          {loading ? (
            <div style={{ display:"flex", justifyContent:"center", padding:60 }}>
              <div style={{ width:30, height:30, border:`2px solid ${C.border}`, borderTopColor:C.accent, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
            </div>
          ) : posts.length === 0 ? (
            <div style={{ textAlign:"center", padding:60, color:C.muted }}>
              <div style={{ fontSize:32, marginBottom:12 }}>📭</div>
              <div style={{ fontSize:13 }}>No videos found.</div>
              {currentUser && <div style={{ fontSize:11, marginTop:8 }}>Be the first to submit one!</div>}
              {!currentUser && (
                <div style={{ fontSize:11, marginTop:8 }}>
                  <span onClick={()=>setShowAuth(true)} style={{ color:C.accent, cursor:"pointer", textDecoration:"underline" }}>Sign in</span> to submit videos.
                </div>
              )}
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:20 }}>
              {posts.map(post => (
                <PostCard key={post.id} post={post} currentUser={currentUser} onAuthRequired={()=>setShowAuth(true)} onToast={showToast} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
