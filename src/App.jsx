import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const C = {
  bg:"#080c14",surface:"#0d1320",card:"#111827",
  border:"#1e2d45",accent:"#00f5c4",danger:"#ff4d6d",
  warning:"#ffd60a",purple:"#7b61ff",text:"#e2eaf4",muted:"#5a7a99",
};
const AVATAR_COLORS=["#00f5c4","#ff4d6d","#ffd60a","#7b61ff","#ff9500","#00b4d8"];

function initials(n=""){return n.slice(0,2).toUpperCase()||"??";}
function timeAgo(ts){
  const s=Math.floor((Date.now()-new Date(ts))/1000);
  if(s<60)return"now";if(s<3600)return`${Math.floor(s/60)}m`;
  if(s<86400)return`${Math.floor(s/3600)}h`;return`${Math.floor(s/86400)}d`;
}
function getVerdict(ai,real,unclear){
  const t=ai+real+unclear||1;
  if(ai/t>0.55)return{label:"AI GENERATED",short:"AI",color:C.danger,icon:"⚡"};
  if(real/t>0.55)return{label:"AUTHENTIC",short:"REAL",color:C.accent,icon:"✓"};
  return{label:"DISPUTED",short:"?",color:C.warning,icon:"?"};
}
function getYouTubeId(url){
  if(!url)return null;
  const m=url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m?m[1]:null;
}
function useIsMobile(){
  const[mob,setMob]=useState(window.innerWidth<768);
  useEffect(()=>{
    const fn=()=>setMob(window.innerWidth<768);
    window.addEventListener("resize",fn);return()=>window.removeEventListener("resize",fn);
  },[]);
  return mob;
}

// Icons
const Ic={
  home:()=><svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>,
  recent:()=><svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>,
  disputed:()=><svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>,
  saved:()=><svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>,
  trending:()=><svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>,
  verified:()=><svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>,
  search:()=><svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>,
  mute:()=><svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>,
  unmute:()=><svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>,
  expand:()=><svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>,
  bolt:()=><svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>,
  check:()=><svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>,
  q:()=><svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>,
  info:()=><svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>,
  plus:()=><svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>,
  logout:()=><svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>,
  menu:()=><svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>,
  close:()=><svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>,
};

function Toast({msg,type}){
  return(
    <div style={{position:"fixed",bottom:90,left:"50%",transform:"translateX(-50%)",
      background:type==="error"?C.danger+"22":C.accent+"22",
      border:`1px solid ${type==="error"?C.danger:C.accent}`,
      color:type==="error"?C.danger:C.accent,
      padding:"10px 20px",borderRadius:30,fontSize:12,fontWeight:700,
      letterSpacing:1,zIndex:9999,backdropFilter:"blur(12px)",whiteSpace:"nowrap",
    }}>{msg}</div>
  );
}

// ── Auth Page ─────────────────────────────────────────────────
function AuthPage({onAuth,onToast}){
  const[mode,setMode]=useState("login");
  const[form,setForm]=useState({email:"",password:"",username:""});
  const[loading,setLoading]=useState(false);
  const mob=useIsMobile();

  const submit=async()=>{
    if(!form.email||!form.password){onToast("Email and password required","error");return;}
    setLoading(true);
    if(mode==="register"){
      if(!form.username.trim()){onToast("Username required","error");setLoading(false);return;}
      const{data,error}=await supabase.auth.signUp({email:form.email,password:form.password});
      if(error){onToast(error.message,"error");setLoading(false);return;}
      if(data.user){
        const color=AVATAR_COLORS[Math.floor(Math.random()*AVATAR_COLORS.length)];
        await supabase.from("profiles").insert({id:data.user.id,username:form.username.trim(),avatar_color:color});
        onToast("Account created!","success");onAuth(data.user);
      }
    }else{
      const{data,error}=await supabase.auth.signInWithPassword({email:form.email,password:form.password});
      if(error){onToast(error.message,"error");setLoading(false);return;}
      onToast("Welcome back!","success");onAuth(data.user);
    }
    setLoading(false);
  };

  const inp={
    width:"100%",padding:"13px 16px",
    background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,
    borderRadius:12,color:C.text,fontSize:15,outline:"none",
    boxSizing:"border-box",fontFamily:"inherit",transition:"border-color 0.2s",
  };

  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",fontFamily:"'Courier New',monospace"}}>
      {/* Left branding — hidden on mobile */}
      {!mob&&(
        <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",padding:"60px 70px",
          background:`linear-gradient(135deg,${C.bg},#0a1628)`,borderRight:`1px solid ${C.border}`,
          position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",inset:0,
            backgroundImage:`linear-gradient(${C.border}22 1px,transparent 1px),linear-gradient(90deg,${C.border}22 1px,transparent 1px)`,
            backgroundSize:"50px 50px"}}/>
          <div style={{position:"absolute",bottom:"-20%",left:"-10%",width:500,height:500,borderRadius:"50%",
            background:`radial-gradient(ellipse,${C.accent}12,transparent 70%)`,pointerEvents:"none"}}/>
          <div style={{position:"relative",zIndex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:40}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:C.accent,boxShadow:`0 0 16px ${C.accent}`}}/>
              <span style={{color:C.accent,fontSize:15,letterSpacing:4,fontWeight:800}}>TRUTHLENS</span>
            </div>
            <div style={{fontSize:40,fontWeight:900,color:C.text,lineHeight:1.1,marginBottom:20}}>
              Can you tell<br/><span style={{color:C.accent}}>AI</span> from<br/><span style={{color:C.danger}}>Reality?</span>
            </div>
            <div style={{fontSize:14,color:C.muted,lineHeight:1.9,maxWidth:380,marginBottom:40}}>
              Community-powered platform to validate AI-generated videos. Watch, vote, and help the world see the truth.
            </div>
            {[
              {e:"⚡",t:"Vote AI Generated, Real, or Unclear on every video"},
              {e:"🎬",t:"Scroll through videos like Reels — fully immersive"},
              {e:"📊",t:"Live vote counts show community verdict instantly"},
              {e:"🔒",t:"Signed-in users only — your votes matter"},
            ].map((f,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                <span style={{fontSize:18}}>{f.e}</span>
                <span style={{fontSize:13,color:C.muted}}>{f.t}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Right form */}
      <div style={{width:mob?"100%":460,display:"flex",flexDirection:"column",
        justifyContent:"center",padding:mob?"32px 24px":"60px 50px",background:C.bg}}>
        {mob&&(
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:32,justifyContent:"center"}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:C.accent,boxShadow:`0 0 16px ${C.accent}`}}/>
            <span style={{color:C.accent,fontSize:16,letterSpacing:4,fontWeight:800}}>TRUTHLENS</span>
          </div>
        )}
        <div style={{marginBottom:28}}>
          <div style={{fontSize:mob?22:26,fontWeight:800,color:C.text,marginBottom:6}}>
            {mode==="register"?"Create Account":"Sign In"}
          </div>
          <div style={{fontSize:13,color:C.muted}}>
            {mode==="register"?"Join the truth verification network":"Welcome back to TruthLens"}
          </div>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {mode==="register"&&(
            <div>
              <div style={{fontSize:11,color:C.muted,marginBottom:6,letterSpacing:1}}>USERNAME</div>
              <input placeholder="e.g. truthseeker99" value={form.username}
                onChange={e=>setForm({...form,username:e.target.value})} style={inp}
                onFocus={e=>e.target.style.borderColor=C.accent}
                onBlur={e=>e.target.style.borderColor=C.border}/>
            </div>
          )}
          <div>
            <div style={{fontSize:11,color:C.muted,marginBottom:6,letterSpacing:1}}>EMAIL</div>
            <input placeholder="you@example.com" type="email" value={form.email}
              onChange={e=>setForm({...form,email:e.target.value})} style={inp}
              onFocus={e=>e.target.style.borderColor=C.accent}
              onBlur={e=>e.target.style.borderColor=C.border}/>
          </div>
          <div>
            <div style={{fontSize:11,color:C.muted,marginBottom:6,letterSpacing:1}}>PASSWORD</div>
            <input placeholder="••••••••" type="password" value={form.password}
              onChange={e=>setForm({...form,password:e.target.value})} style={inp}
              onFocus={e=>e.target.style.borderColor=C.accent}
              onBlur={e=>e.target.style.borderColor=C.border}
              onKeyDown={e=>e.key==="Enter"&&submit()}/>
          </div>
        </div>

        <button onClick={submit} disabled={loading} style={{
          marginTop:24,padding:"15px",
          background:`linear-gradient(135deg,${C.accent},#00c9a7)`,
          border:"none",borderRadius:12,color:"#080c14",
          fontSize:14,fontWeight:800,letterSpacing:2,cursor:"pointer",opacity:loading?0.7:1,
        }}>{loading?"PLEASE WAIT...":mode==="register"?"CREATE ACCOUNT":"SIGN IN"}</button>

        <div style={{textAlign:"center",marginTop:20,fontSize:13,color:C.muted}}>
          {mode==="register"?"Already have an account? ":"Don't have an account? "}
          <span onClick={()=>{setMode(mode==="register"?"login":"register");setForm({email:"",password:"",username:""}); }}
            style={{color:C.accent,cursor:"pointer",fontWeight:700}}>
            {mode==="register"?"Sign in":"Register free"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Submit Modal ───────────────────────────────────────────────
function SubmitModal({user,onClose,onSubmitted,onToast}){
  const[form,setForm]=useState({title:"",description:"",thumbnail_url:"",video_url:"",tags:""});
  const[loading,setLoading]=useState(false);

  const submit=async()=>{
    if(!form.title.trim()){onToast("Title is required","error");return;}
    setLoading(true);
    const tags=form.tags.split(",").map(t=>t.trim().toLowerCase()).filter(Boolean);
    const{error}=await supabase.from("posts").insert({
      user_id:user.id,title:form.title,description:form.description,
      thumbnail_url:form.thumbnail_url||null,video_url:form.video_url||null,tags,
    });
    setLoading(false);
    if(error){onToast("Submit failed: "+error.message,"error");return;}
    onToast("Video submitted!","success");onSubmitted();onClose();
  };

  const inp={
    width:"100%",padding:"10px 14px",
    background:C.surface,border:`1px solid ${C.border}`,
    borderRadius:10,color:C.text,fontSize:14,outline:"none",
    boxSizing:"border-box",fontFamily:"inherit",
  };

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",
      display:"flex",alignItems:"center",justifyContent:"center",
      zIndex:2000,backdropFilter:"blur(6px)",padding:16}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,
        borderRadius:20,padding:28,width:"100%",maxWidth:460,
        fontFamily:"'Courier New',monospace",maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{color:C.accent,fontWeight:800,fontSize:14,letterSpacing:2}}>📹 SUBMIT VIDEO</div>
          <span onClick={onClose} style={{color:C.muted,cursor:"pointer",fontSize:22}}>✕</span>
        </div>
        {[
          {key:"title",label:"TITLE *",placeholder:"What's this video about?"},
          {key:"video_url",label:"YOUTUBE URL",placeholder:"https://youtube.com/watch?v=..."},
          {key:"thumbnail_url",label:"THUMBNAIL URL (optional)",placeholder:"https://..."},
          {key:"tags",label:"TAGS (comma separated)",placeholder:"deepfake, politics, viral"},
        ].map(f=>(
          <div key={f.key} style={{marginBottom:12}}>
            <div style={{fontSize:10,color:C.muted,letterSpacing:1,marginBottom:5}}>{f.label}</div>
            <input placeholder={f.placeholder} value={form[f.key]}
              onChange={e=>setForm({...form,[f.key]:e.target.value})} style={inp}
              onFocus={e=>e.target.style.borderColor=C.accent}
              onBlur={e=>e.target.style.borderColor=C.border}/>
          </div>
        ))}
        <div style={{marginBottom:16}}>
          <div style={{fontSize:10,color:C.muted,letterSpacing:1,marginBottom:5}}>DESCRIPTION</div>
          <textarea placeholder="Describe what seems off about this video..."
            value={form.description} onChange={e=>setForm({...form,description:e.target.value})}
            style={{...inp,height:70,resize:"vertical"}}
            onFocus={e=>e.target.style.borderColor=C.accent}
            onBlur={e=>e.target.style.borderColor=C.border}/>
        </div>
        <button onClick={submit} disabled={loading} style={{
          width:"100%",padding:"13px",
          background:`linear-gradient(135deg,${C.accent},#00c9a7)`,
          border:"none",borderRadius:10,color:"#080c14",
          fontSize:13,fontWeight:800,letterSpacing:2,cursor:"pointer",opacity:loading?0.6:1,
        }}>{loading?"SUBMITTING...":"SUBMIT VIDEO"}</button>
      </div>
    </div>
  );
}

// ── Reel Card ─────────────────────────────────────────────────
function ReelCard({post,currentUser,onToast,isActive,onSave,savedIds,mob}){
  const[votes,setVotes]=useState({ai:post.ai_votes||0,real:post.real_votes||0,unclear:post.unclear_votes||0});
  const[userVote,setUserVote]=useState(post.user_vote||null);
  const[voting,setVoting]=useState(false);
  const[muted,setMuted]=useState(true);
  const[showInfo,setShowInfo]=useState(false);
  const verdict=getVerdict(votes.ai,votes.real,votes.unclear);
  const ytId=getYouTubeId(post.video_url);
  const ac=post.profiles?.avatar_color||C.accent;
  const total=votes.ai+votes.real+votes.unclear||1;
  const isSaved=savedIds?.includes(post.id);

  const vote=async(type)=>{
    if(voting||userVote===type)return;
    setVoting(true);
    const prev=userVote;
    const u={...votes};if(prev)u[prev]-=1;u[type]+=1;
    setVotes(u);setUserVote(type);
    try{
      if(prev){await supabase.from("votes").update({vote_type:type}).eq("user_id",currentUser.id).eq("post_id",post.id);}
      else{await supabase.from("votes").insert({user_id:currentUser.id,post_id:post.id,vote_type:type});}
      const lbl={ai:"⚡ AI Generated",real:"✓ Real",unclear:"? Not Clear"};
      onToast(lbl[type],"success");
    }catch{setVotes(votes);setUserVote(prev);onToast("Vote failed","error");}
    setVoting(false);
  };

  // On mobile: vote buttons are horizontal row at bottom
  // On desktop: vertical column on right side
  const voteBtn=[
    {key:"ai",Icon:Ic.bolt,label:"AI",color:C.danger},
    {key:"real",Icon:Ic.check,label:"Real",color:C.accent},
    {key:"unclear",Icon:Ic.q,label:"?",color:C.warning},
  ];

  const btnSize=mob?52:50;

  return(
    <div style={{position:"relative",width:"100%",height:"100%",background:"#000",overflow:"hidden"}}>
      {/* Video */}
      {ytId&&isActive?(
        <iframe
          src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=${muted?1:0}&loop=1&playlist=${ytId}&controls=0&modestbranding=1&rel=0&playsinline=1`}
          style={{position:"absolute",inset:mob?"0":"-60px 0",width:"100%",height:mob?"100%":"calc(100% + 120px)",border:"none",pointerEvents:"none"}}
          allow="autoplay; fullscreen" allowFullScreen/>
      ):(
        <div style={{position:"absolute",inset:0}}>
          {post.thumbnail_url
            ?<img src={post.thumbnail_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            :<div style={{width:"100%",height:"100%",background:`linear-gradient(135deg,${C.surface},${C.bg})`,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{fontSize:48,opacity:0.3}}>🎬</span>
            </div>
          }
          {!isActive&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{width:60,height:60,borderRadius:"50%",background:"rgba(0,0,0,0.6)",border:"2px solid rgba(255,255,255,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>▶</div>
          </div>}
        </div>
      )}

      {/* Gradient */}
      <div style={{position:"absolute",inset:0,
        background:mob
          ?"linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.4) 35%, rgba(0,0,0,0.15) 60%, rgba(0,0,0,0.5) 100%)"
          :"linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0.5) 100%)",
        pointerEvents:"none"}}/>

      {/* Top row */}
      <div style={{position:"absolute",top:12,left:12,right:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{
          background:verdict.color+"33",border:`1px solid ${verdict.color}`,
          color:verdict.color,padding:mob?"4px 10px":"5px 14px",borderRadius:20,
          fontSize:mob?10:11,fontWeight:800,letterSpacing:1,backdropFilter:"blur(8px)",
        }}>{verdict.icon} {mob?verdict.short:verdict.label}</div>
        <div style={{display:"flex",gap:8}}>
          {ytId&&isActive&&(
            <button onClick={()=>setMuted(!muted)} style={{
              width:34,height:34,borderRadius:"50%",background:"rgba(0,0,0,0.55)",
              border:"1px solid rgba(255,255,255,0.2)",color:"white",cursor:"pointer",
              backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",
            }}>{muted?<Ic.mute/>:<Ic.unmute/>}</button>
          )}
          {post.video_url&&(
            <button onClick={()=>window.open(post.video_url,"_blank")} style={{
              width:34,height:34,borderRadius:"50%",background:"rgba(0,0,0,0.55)",
              border:"1px solid rgba(255,255,255,0.2)",color:"white",cursor:"pointer",
              backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",
            }}><Ic.expand/></button>
          )}
        </div>
      </div>

      {/* DESKTOP: right side vertical buttons */}
      {!mob&&(
        <div style={{position:"absolute",right:14,bottom:130,display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
          {/* Avatar */}
          <div style={{width:46,height:46,borderRadius:"50%",background:ac+"33",border:`3px solid ${ac}`,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:ac,
            boxShadow:`0 0 12px ${ac}44`}}>{initials(post.profiles?.username)}</div>

          {voteBtn.map(({key,Icon,label,color})=>(
            <div key={key} onClick={()=>vote(key)}
              style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,cursor:"pointer"}}>
              <div style={{
                width:btnSize,height:btnSize,borderRadius:"50%",
                background:userVote===key?color+"44":"rgba(0,0,0,0.55)",
                border:`2px solid ${userVote===key?color:"rgba(255,255,255,0.25)"}`,
                display:"flex",alignItems:"center",justifyContent:"center",color:userVote===key?color:"rgba(255,255,255,0.85)",
                backdropFilter:"blur(8px)",transform:userVote===key?"scale(1.15)":"scale(1)",
                transition:"all 0.2s",boxShadow:userVote===key?`0 0 16px ${color}66`:"none",
              }}><Icon/></div>
              <span style={{fontSize:9,color:userVote===key?color:"rgba(255,255,255,0.55)",fontWeight:700}}>{label}</span>
              <span style={{fontSize:9,color:"rgba(255,255,255,0.35)"}}>{votes[key].toLocaleString()}</span>
            </div>
          ))}

          {/* Save */}
          <div onClick={()=>onSave(post.id)}
            style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,cursor:"pointer"}}>
            <div style={{
              width:btnSize,height:btnSize,borderRadius:"50%",
              background:isSaved?C.purple+"44":"rgba(0,0,0,0.55)",
              border:`2px solid ${isSaved?C.purple:"rgba(255,255,255,0.25)"}`,
              display:"flex",alignItems:"center",justifyContent:"center",
              color:isSaved?C.purple:"rgba(255,255,255,0.85)",
              backdropFilter:"blur(8px)",transform:isSaved?"scale(1.15)":"scale(1)",transition:"all 0.2s",
            }}><Ic.saved/></div>
            <span style={{fontSize:9,color:isSaved?C.purple:"rgba(255,255,255,0.55)",fontWeight:700}}>Save</span>
          </div>

          {/* Info */}
          <div onClick={()=>setShowInfo(!showInfo)}
            style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,cursor:"pointer"}}>
            <div style={{
              width:btnSize,height:btnSize,borderRadius:"50%",
              background:showInfo?"rgba(255,255,255,0.2)":"rgba(0,0,0,0.55)",
              border:`2px solid ${showInfo?"rgba(255,255,255,0.6)":"rgba(255,255,255,0.25)"}`,
              display:"flex",alignItems:"center",justifyContent:"center",
              color:"rgba(255,255,255,0.85)",backdropFilter:"blur(8px)",transition:"all 0.2s",
            }}><Ic.info/></div>
            <span style={{fontSize:9,color:"rgba(255,255,255,0.55)",fontWeight:700}}>Info</span>
          </div>
        </div>
      )}

      {/* Bottom info */}
      <div style={{position:"absolute",bottom:mob?90:0,left:0,right:mob?0:72,padding:mob?"0 14px 10px":"0 16px 20px"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
          {mob&&<div style={{width:32,height:32,borderRadius:"50%",background:ac+"33",border:`2px solid ${ac}`,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:ac,flexShrink:0}}>{initials(post.profiles?.username)}</div>}
          <span style={{color:ac,fontSize:13,fontWeight:700}}>@{post.profiles?.username||"unknown"}</span>
          <span style={{color:"rgba(255,255,255,0.35)",fontSize:11}}>{timeAgo(post.created_at)}</span>
        </div>
        <div style={{fontSize:mob?15:17,fontWeight:800,color:"white",marginBottom:4,lineHeight:1.3}}>{post.title}</div>
        {showInfo&&post.description&&(
          <div style={{fontSize:12,color:"rgba(255,255,255,0.65)",lineHeight:1.6,marginBottom:6}}>{post.description}</div>
        )}
        {post.tags?.length>0&&(
          <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>
            {post.tags.map(t=>(
              <span key={t} style={{padding:"2px 7px",borderRadius:20,background:"rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.5)",fontSize:10}}>#{t}</span>
            ))}
          </div>
        )}
        {/* Vote bar */}
        <div style={{display:"flex",height:3,borderRadius:2,overflow:"hidden",gap:1,marginBottom:4}}>
          <div style={{width:`${(votes.ai/total)*100}%`,background:C.danger}}/>
          <div style={{width:`${(votes.real/total)*100}%`,background:C.accent}}/>
          <div style={{width:`${(votes.unclear/total)*100}%`,background:C.warning}}/>
        </div>
        <div style={{display:"flex",gap:12,fontSize:10}}>
          <span style={{color:C.danger}}>⚡{Math.round((votes.ai/total)*100)}%</span>
          <span style={{color:C.accent}}>✓{Math.round((votes.real/total)*100)}%</span>
          <span style={{color:C.warning}}>?{Math.round((votes.unclear/total)*100)}%</span>
        </div>
      </div>

      {/* MOBILE: bottom action bar */}
      {mob&&(
        <div style={{
          position:"absolute",bottom:0,left:0,right:0,
          background:"rgba(0,0,0,0.75)",backdropFilter:"blur(12px)",
          borderTop:"1px solid rgba(255,255,255,0.1)",
          display:"flex",alignItems:"center",justifyContent:"space-around",
          padding:"10px 8px 14px",gap:4,
        }}>
          {voteBtn.map(({key,Icon,label,color})=>(
            <button key={key} onClick={()=>vote(key)} style={{
              flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,
              background:userVote===key?color+"22":"transparent",
              border:`1px solid ${userVote===key?color:"rgba(255,255,255,0.15)"}`,
              borderRadius:12,padding:"8px 4px",cursor:"pointer",
              transition:"all 0.2s",
            }}>
              <div style={{color:userVote===key?color:"rgba(255,255,255,0.8)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Icon/>
              </div>
              <span style={{fontSize:10,fontWeight:700,color:userVote===key?color:"rgba(255,255,255,0.6)"}}>{label}</span>
              <span style={{fontSize:9,color:"rgba(255,255,255,0.35)"}}>{votes[key].toLocaleString()}</span>
            </button>
          ))}

          {/* Save */}
          <button onClick={()=>onSave(post.id)} style={{
            flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,
            background:isSaved?C.purple+"22":"transparent",
            border:`1px solid ${isSaved?C.purple:"rgba(255,255,255,0.15)"}`,
            borderRadius:12,padding:"8px 4px",cursor:"pointer",transition:"all 0.2s",
          }}>
            <div style={{color:isSaved?C.purple:"rgba(255,255,255,0.8)",display:"flex",alignItems:"center",justifyContent:"center"}}><Ic.saved/></div>
            <span style={{fontSize:10,fontWeight:700,color:isSaved?C.purple:"rgba(255,255,255,0.6)"}}>Save</span>
          </button>

          {/* Info */}
          <button onClick={()=>setShowInfo(!showInfo)} style={{
            flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,
            background:showInfo?"rgba(255,255,255,0.1)":"transparent",
            border:`1px solid ${showInfo?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.15)"}`,
            borderRadius:12,padding:"8px 4px",cursor:"pointer",transition:"all 0.2s",
          }}>
            <div style={{color:"rgba(255,255,255,0.8)",display:"flex",alignItems:"center",justifyContent:"center"}}><Ic.info/></div>
            <span style={{fontSize:10,color:"rgba(255,255,255,0.6)",fontWeight:700}}>Info</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────
export default function App(){
  const[currentUser,setCurrentUser]=useState(null);
  const[profile,setProfile]=useState(null);
  const[authLoading,setAuthLoading]=useState(true);
  const[posts,setPosts]=useState([]);
  const[allPosts,setAllPosts]=useState([]);
  const[loading,setLoading]=useState(true);
  const[activeIndex,setActiveIndex]=useState(0);
  const[activeTab,setActiveTab]=useState("home");
  const[showSubmit,setShowSubmit]=useState(false);
  const[showSidebar,setShowSidebar]=useState(false);
  const[toast,setToast]=useState(null);
  const[savedIds,setSavedIds]=useState([]);
  const[search,setSearch]=useState("");
  const[showSearch,setShowSearch]=useState(false);
  const containerRef=useRef(null);
  const touchStartY=useRef(null);
  const mob=useIsMobile();

  const showToast=(msg,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),2500);};

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{
      if(data.session?.user){setCurrentUser(data.session.user);fetchProfile(data.session.user.id);}
      setAuthLoading(false);
    });
    const{data:l}=supabase.auth.onAuthStateChange((_e,session)=>{
      setCurrentUser(session?.user||null);
      if(session?.user)fetchProfile(session.user.id);else setProfile(null);
    });
    return()=>l.subscription.unsubscribe();
  },[]);

  const fetchProfile=async(uid)=>{
    const{data}=await supabase.from("profiles").select("*").eq("id",uid).single();
    if(data)setProfile(data);
  };

  const fetchPosts=useCallback(async()=>{
    if(!currentUser)return;
    setLoading(true);
    const{data:pd}=await supabase.from("posts").select("*,profiles(username,avatar_color)").order("created_at",{ascending:false});
    if(!pd){setLoading(false);return;}
    const ids=pd.map(p=>p.id);
    let enriched=pd.map(p=>({...p,ai_votes:0,real_votes:0,unclear_votes:0,user_vote:null}));
    if(ids.length>0){
      const{data:vd}=await supabase.from("votes").select("post_id,vote_type").in("post_id",ids);
      const{data:uv}=await supabase.from("votes").select("post_id,vote_type").eq("user_id",currentUser.id).in("post_id",ids);
      const umap={};(uv||[]).forEach(v=>{umap[v.post_id]=v.vote_type;});
      const cnt={};(vd||[]).forEach(v=>{if(!cnt[v.post_id])cnt[v.post_id]={ai:0,real:0,unclear:0};cnt[v.post_id][v.vote_type]++;});
      enriched=pd.map(p=>({...p,ai_votes:cnt[p.id]?.ai||0,real_votes:cnt[p.id]?.real||0,unclear_votes:cnt[p.id]?.unclear||0,user_vote:umap[p.id]||null}));
    }
    setAllPosts(enriched);setLoading(false);
  },[currentUser]);

  useEffect(()=>{fetchPosts();},[fetchPosts]);

  useEffect(()=>{
    let f=[...allPosts];
    if(search)f=f.filter(p=>p.title.toLowerCase().includes(search.toLowerCase())||(p.description||"").toLowerCase().includes(search.toLowerCase()));
    if(activeTab==="recent")f=[...f].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    else if(activeTab==="disputed")f=f.filter(p=>{const t=p.ai_votes+p.real_votes+p.unclear_votes||1;return p.ai_votes/t<=0.55&&p.real_votes/t<=0.55;});
    else if(activeTab==="verified")f=f.filter(p=>{const t=p.ai_votes+p.real_votes+p.unclear_votes||1;return p.real_votes/t>0.55;});
    else if(activeTab==="saved")f=f.filter(p=>savedIds.includes(p.id));
    else if(activeTab==="trending")f=[...f].sort((a,b)=>(b.ai_votes+b.real_votes+b.unclear_votes)-(a.ai_votes+a.real_votes+a.unclear_votes));
    setPosts(f);setActiveIndex(0);
  },[activeTab,allPosts,savedIds,search]);

  const handleWheel=useCallback((e)=>{
    e.preventDefault();
    if(e.deltaY>40)setActiveIndex(i=>Math.min(i+1,posts.length-1));
    else if(e.deltaY<-40)setActiveIndex(i=>Math.max(i-1,0));
  },[posts.length]);

  const onTouchStart=(e)=>{touchStartY.current=e.touches[0].clientY;};
  const onTouchEnd=(e)=>{
    if(touchStartY.current===null)return;
    const d=touchStartY.current-e.changedTouches[0].clientY;
    if(d>50)setActiveIndex(i=>Math.min(i+1,posts.length-1));
    else if(d<-50)setActiveIndex(i=>Math.max(i-1,0));
    touchStartY.current=null;
  };

  useEffect(()=>{
    const el=containerRef.current;if(!el)return;
    el.addEventListener("wheel",handleWheel,{passive:false});
    return()=>el.removeEventListener("wheel",handleWheel);
  },[handleWheel]);

  const handleLogout=async()=>{await supabase.auth.signOut();setCurrentUser(null);setProfile(null);showToast("Signed out");};

  const navItems=[
    {key:"home",label:"Home",Icon:Ic.home},
    {key:"trending",label:"Trending",Icon:Ic.trending},
    {key:"recent",label:"Recent",Icon:Ic.recent},
    {key:"disputed",label:"Disputed",Icon:Ic.disputed},
    {key:"verified",label:"Verified",Icon:Ic.verified},
    {key:"saved",label:"Saved",Icon:Ic.saved},
  ];

  if(authLoading)return(
    <div style={{width:"100vw",height:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:32,height:32,border:`2px solid ${C.border}`,borderTopColor:C.accent,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );

  if(!currentUser)return(
    <>
      <style>{`*{box-sizing:border-box;margin:0;padding:0;}@keyframes spin{to{transform:rotate(360deg);}}`}</style>
      {toast&&<Toast msg={toast.msg} type={toast.type}/>}
      <AuthPage onAuth={setCurrentUser} onToast={showToast}/>
    </>
  );

  return(
    <div style={{width:"100vw",height:"100vh",background:C.bg,display:"flex",flexDirection:"column",fontFamily:"'Courier New',monospace",overflow:"hidden"}}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0;}@keyframes spin{to{transform:rotate(360deg);}}::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px;}`}</style>
      {toast&&<Toast msg={toast.msg} type={toast.type}/>}
      {showSubmit&&<SubmitModal user={currentUser} onClose={()=>setShowSubmit(false)} onSubmitted={fetchPosts} onToast={showToast}/>}

      {/* Mobile sidebar overlay */}
      {mob&&showSidebar&&(
        <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex"}}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(4px)"}} onClick={()=>setShowSidebar(false)}/>
          <div style={{position:"relative",width:260,background:C.card,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",padding:"16px 0",zIndex:1,overflowY:"auto"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px 16px",borderBottom:`1px solid ${C.border}`}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:C.accent,boxShadow:`0 0 8px ${C.accent}`}}/>
                <span style={{color:C.accent,fontSize:13,letterSpacing:3,fontWeight:800}}>TRUTHLENS</span>
              </div>
              <span onClick={()=>setShowSidebar(false)} style={{color:C.muted,cursor:"pointer"}}><Ic.close/></span>
            </div>
            {navItems.map(({key,label,Icon})=>(
              <div key={key} onClick={()=>{setActiveTab(key);setShowSidebar(false);}}
                style={{display:"flex",alignItems:"center",gap:12,padding:"12px 20px",cursor:"pointer",
                  background:activeTab===key?C.accent+"15":"transparent",
                  borderLeft:`3px solid ${activeTab===key?C.accent:"transparent"}`,
                  color:activeTab===key?C.accent:C.muted}}>
                <Icon/><span style={{fontSize:13,fontWeight:activeTab===key?700:400}}>{label}</span>
                {key==="saved"&&savedIds.length>0&&<span style={{marginLeft:"auto",background:C.purple+"33",color:C.purple,padding:"1px 7px",borderRadius:10,fontSize:10}}>{savedIds.length}</span>}
              </div>
            ))}
            <div style={{borderTop:`1px solid ${C.border}`,margin:"12px 0"}}/>
            <div style={{padding:"0 16px"}}>
              <div style={{fontSize:10,letterSpacing:2,color:C.muted,marginBottom:10}}>STATS</div>
              {[
                {l:"Total Videos",v:allPosts.length,c:C.text},
                {l:"AI Flagged",v:allPosts.filter(p=>{const t=p.ai_votes+p.real_votes+p.unclear_votes||1;return p.ai_votes/t>0.55;}).length,c:C.danger},
                {l:"Verified Real",v:allPosts.filter(p=>{const t=p.ai_votes+p.real_votes+p.unclear_votes||1;return p.real_votes/t>0.55;}).length,c:C.accent},
              ].map(s=>(
                <div key={s.l} style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                  <span style={{fontSize:11,color:C.muted}}>{s.l}</span>
                  <span style={{fontSize:12,fontWeight:700,color:s.c}}>{s.v}</span>
                </div>
              ))}
            </div>
            <div style={{marginTop:"auto",padding:"16px"}}>
              <div onClick={handleLogout} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",borderRadius:10,cursor:"pointer",color:C.danger,background:C.danger+"11",border:`1px solid ${C.danger}22`}}>
                <Ic.logout/><span style={{fontSize:12,fontWeight:700}}>Sign Out</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <div style={{height:52,background:C.card,borderBottom:`1px solid ${C.border}`,
        display:"flex",alignItems:"center",padding:`0 ${mob?12:20}px`,gap:12,flexShrink:0,zIndex:100}}>
        {/* Hamburger on mobile */}
        {mob&&(
          <button onClick={()=>setShowSidebar(true)} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",padding:4,display:"flex"}}>
            <Ic.menu/>
          </button>
        )}

        {/* Logo */}
        {!mob&&(
          <div style={{display:"flex",alignItems:"center",gap:8,width:220,flexShrink:0}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:C.accent,boxShadow:`0 0 10px ${C.accent}`}}/>
            <span style={{color:C.accent,fontSize:13,letterSpacing:3,fontWeight:800}}>TRUTHLENS</span>
          </div>
        )}

        {/* Search — full on desktop, toggle on mobile */}
        {(!mob||showSearch)&&(
          <div style={{flex:1,maxWidth:mob?"100%":480,position:"relative"}}>
            <div style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:C.muted}}><Ic.search/></div>
            <input placeholder="Search videos..." value={search} onChange={e=>setSearch(e.target.value)}
              autoFocus={mob}
              style={{width:"100%",padding:"8px 12px 8px 34px",background:C.surface,border:`1px solid ${C.border}`,
                borderRadius:24,color:C.text,fontSize:13,outline:"none"}}
              onFocus={e=>e.target.style.borderColor=C.accent}
              onBlur={e=>{e.target.style.borderColor=C.border;if(mob&&!search)setShowSearch(false);}}
            />
          </div>
        )}

        {mob&&!showSearch&&(
          <button onClick={()=>setShowSearch(true)} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",padding:4,display:"flex"}}>
            <Ic.search/>
          </button>
        )}

        {mob&&<div style={{display:"flex",alignItems:"center",gap:6,marginLeft:"auto"}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:C.accent,boxShadow:`0 0 8px ${C.accent}`}}/>
          <span style={{color:C.accent,fontSize:12,letterSpacing:3,fontWeight:800}}>TRUTHLENS</span>
        </div>}

        {!mob&&<div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:10}}>
          <button onClick={()=>setShowSubmit(true)} style={{
            display:"flex",alignItems:"center",gap:6,padding:"7px 14px",
            background:C.accent+"22",border:`1px solid ${C.accent}`,
            borderRadius:20,color:C.accent,fontSize:11,fontWeight:700,cursor:"pointer",letterSpacing:1,
          }}><Ic.plus/>POST VIDEO</button>
          <div onClick={handleLogout} title="Sign out"
            style={{display:"flex",alignItems:"center",gap:8,padding:"4px 12px 4px 4px",
              background:C.surface,border:`1px solid ${C.border}`,borderRadius:30,cursor:"pointer"}}>
            <div style={{width:28,height:28,borderRadius:"50%",
              background:(profile?.avatar_color||C.accent)+"22",border:`2px solid ${profile?.avatar_color||C.accent}`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:10,fontWeight:700,color:profile?.avatar_color||C.accent}}>{initials(profile?.username)}</div>
            <span style={{fontSize:12,color:C.text}}>@{profile?.username||"..."}</span>
            <div style={{color:C.muted}}><Ic.logout/></div>
          </div>
        </div>}
      </div>

      {/* Body */}
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        {/* Desktop sidebar */}
        {!mob&&(
          <div style={{width:220,background:C.card,borderRight:`1px solid ${C.border}`,
            display:"flex",flexDirection:"column",padding:"12px 0",flexShrink:0,overflowY:"auto"}}>
            {navItems.map(({key,label,Icon})=>(
              <div key={key} onClick={()=>setActiveTab(key)}
                style={{display:"flex",alignItems:"center",gap:12,padding:"10px 18px",cursor:"pointer",
                  background:activeTab===key?C.accent+"15":"transparent",
                  borderLeft:`3px solid ${activeTab===key?C.accent:"transparent"}`,
                  color:activeTab===key?C.accent:C.muted,transition:"all 0.15s",marginBottom:1}}
                onMouseEnter={e=>{if(activeTab!==key){e.currentTarget.style.background=C.surface;e.currentTarget.style.color=C.text;}}}
                onMouseLeave={e=>{if(activeTab!==key){e.currentTarget.style.background="transparent";e.currentTarget.style.color=C.muted;}}}>
                <Icon/><span style={{fontSize:12,fontWeight:activeTab===key?700:400}}>{label}</span>
                {key==="saved"&&savedIds.length>0&&<span style={{marginLeft:"auto",background:C.purple+"33",color:C.purple,padding:"1px 6px",borderRadius:10,fontSize:10}}>{savedIds.length}</span>}
              </div>
            ))}
            <div style={{borderTop:`1px solid ${C.border}`,margin:"12px 0"}}/>
            <div style={{padding:"0 18px"}}>
              <div style={{fontSize:10,letterSpacing:2,color:C.muted,marginBottom:10}}>LIVE STATS</div>
              {[
                {l:"Total Videos",v:allPosts.length,c:C.text},
                {l:"AI Flagged",v:allPosts.filter(p=>{const t=p.ai_votes+p.real_votes+p.unclear_votes||1;return p.ai_votes/t>0.55;}).length,c:C.danger},
                {l:"Verified Real",v:allPosts.filter(p=>{const t=p.ai_votes+p.real_votes+p.unclear_votes||1;return p.real_votes/t>0.55;}).length,c:C.accent},
                {l:"Saved",v:savedIds.length,c:C.purple},
              ].map(s=>(
                <div key={s.l} style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
                  <span style={{fontSize:11,color:C.muted}}>{s.l}</span>
                  <span style={{fontSize:11,fontWeight:700,color:s.c}}>{s.v}</span>
                </div>
              ))}
            </div>
            <div style={{marginTop:"auto",padding:"12px 18px"}}>
              <div onClick={handleLogout} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:10,cursor:"pointer",color:C.danger,background:C.danger+"11",border:`1px solid ${C.danger}22`}}>
                <Ic.logout/><span style={{fontSize:12,fontWeight:700}}>Sign Out</span>
              </div>
            </div>
          </div>
        )}

        {/* Main feed */}
        <div style={{flex:1,position:"relative",overflow:"hidden"}}>
          {/* Tab bar — desktop only (mobile uses sidebar) */}
          {!mob&&(
            <div style={{position:"absolute",top:0,left:0,right:0,zIndex:50,
              background:C.bg+"ee",backdropFilter:"blur(10px)",
              borderBottom:`1px solid ${C.border}`,
              display:"flex",gap:0,padding:"0 16px",height:40,alignItems:"center",overflowX:"auto"}}>
              {navItems.map(({key,label})=>(
                <button key={key} onClick={()=>setActiveTab(key)} style={{
                  padding:"4px 14px",background:"transparent",border:"none",
                  borderBottom:activeTab===key?`2px solid ${C.accent}`:"2px solid transparent",
                  color:activeTab===key?C.accent:C.muted,
                  fontSize:10,fontWeight:700,cursor:"pointer",letterSpacing:1,
                  textTransform:"uppercase",transition:"color 0.2s",whiteSpace:"nowrap",
                }}>{label}</button>
              ))}
              <span style={{marginLeft:"auto",fontSize:10,color:C.muted,flexShrink:0}}>{posts.length} video{posts.length!==1?"s":""}</span>
            </div>
          )}

          {/* Mobile: compact tab bar */}
          {mob&&(
            <div style={{position:"absolute",top:0,left:0,right:0,zIndex:50,
              background:C.bg+"f0",backdropFilter:"blur(10px)",
              borderBottom:`1px solid ${C.border}`,
              display:"flex",height:38,alignItems:"center",overflowX:"auto",
              padding:"0 8px",gap:2}}>
              {navItems.map(({key,label,Icon})=>(
                <button key={key} onClick={()=>setActiveTab(key)} style={{
                  display:"flex",alignItems:"center",gap:4,
                  padding:"4px 10px",background:activeTab===key?C.accent+"22":"transparent",
                  border:`1px solid ${activeTab===key?C.accent:"transparent"}`,
                  borderRadius:16,color:activeTab===key?C.accent:C.muted,
                  fontSize:10,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,
                }}>
                  <Icon/>{label}
                </button>
              ))}
            </div>
          )}

          {/* Video reel */}
          <div style={{position:"absolute",top:mob?38:40,bottom:0,left:0,right:0}}>
            {loading?(
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:12}}>
                <div style={{width:30,height:30,border:`2px solid ${C.border}`,borderTopColor:C.accent,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
                <div style={{color:C.muted,fontSize:11,letterSpacing:2}}>LOADING...</div>
              </div>
            ):posts.length===0?(
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:10}}>
                <div style={{fontSize:40}}>📭</div>
                <div style={{color:C.text,fontSize:14,fontWeight:700}}>{activeTab==="saved"?"No saved videos":"No videos here"}</div>
                <div style={{color:C.muted,fontSize:12}}>{activeTab==="saved"?"Tap Save on any video":"Be the first to submit!"}</div>
                <button onClick={()=>setShowSubmit(true)} style={{marginTop:8,padding:"8px 18px",background:C.accent+"22",border:`1px solid ${C.accent}`,borderRadius:20,color:C.accent,fontSize:11,cursor:"pointer"}}>+ Submit Video</button>
              </div>
            ):(
              <>
                {/* Scroll dots — desktop only */}
                {!mob&&posts.length>1&&(
                  <div style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",display:"flex",flexDirection:"column",gap:5,zIndex:50}}>
                    {posts.map((_,i)=>(
                      <div key={i} onClick={()=>setActiveIndex(i)} style={{
                        width:i===activeIndex?6:4,height:i===activeIndex?6:4,borderRadius:"50%",
                        background:i===activeIndex?C.accent:"rgba(255,255,255,0.2)",cursor:"pointer",
                        transition:"all 0.2s",boxShadow:i===activeIndex?`0 0 6px ${C.accent}`:"none",
                      }}/>
                    ))}
                  </div>
                )}

                {/* Post button on mobile — floating */}
                {mob&&(
                  <button onClick={()=>setShowSubmit(true)} style={{
                    position:"absolute",top:10,right:10,zIndex:60,
                    width:38,height:38,borderRadius:"50%",
                    background:C.accent,border:"none",
                    color:"#080c14",cursor:"pointer",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    boxShadow:`0 0 16px ${C.accent}66`,
                  }}><Ic.plus/></button>
                )}

                <div ref={containerRef} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
                  style={{width:"100%",height:"100%"}}>
                  <div style={{width:"100%",height:"100%",transition:"transform 0.45s cubic-bezier(0.25,0.46,0.45,0.94)",transform:`translateY(-${activeIndex*100}%)`}}>
                    {posts.map((post,i)=>(
                      <div key={post.id} style={{width:"100%",height:"100%"}}>
                        <ReelCard post={post} currentUser={currentUser} onToast={showToast}
                          isActive={i===activeIndex} onSave={id=>setSavedIds(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id])}
                          savedIds={savedIds} mob={mob}/>
                      </div>
                    ))}
                  </div>
                </div>

                {posts.length>1&&activeIndex===0&&(
                  <div style={{position:"absolute",bottom:mob?100:16,left:"50%",transform:"translateX(-50%)",color:"rgba(255,255,255,0.3)",fontSize:11,pointerEvents:"none"}}>
                    {mob?"swipe up ↑":"scroll or swipe up ↑"}
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
