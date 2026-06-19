"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Completing sign in...");

  useEffect(() => {
    const run = async () => {
      // 1. Check if there's a code in the URL (PKCE flow)
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const errorParam = url.searchParams.get("error");
      const errorDesc = url.searchParams.get("error_description");

      if (errorParam) {
        setStatus("Sign in failed: " + (errorDesc || errorParam));
        setTimeout(() => router.replace("/login?error=" + encodeURIComponent(errorDesc || errorParam)), 2000);
        return;
      }

      if (code) {
        setStatus("Verifying with Google...");
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setStatus("Error: " + error.message);
          setTimeout(() => router.replace("/login?error=" + encodeURIComponent(error.message)), 2000);
          return;
        }
        setStatus("Success! Taking you in...");
        router.replace("/dashboard");
        return;
      }

      // 2. No code — check if session already exists (implicit flow via hash)
      // Give Supabase a moment to parse the hash
      await new Promise(r => setTimeout(r, 500));
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setStatus("Success! Taking you in...");
        router.replace("/dashboard");
        return;
      }

      // 3. Nothing worked
      setStatus("Could not sign in. Redirecting...");
      setTimeout(() => router.replace("/login"), 1500);
    };

    run();
  }, [router]);

  return (
    <div style={{
      minHeight:"100vh", display:"flex", alignItems:"center",
      justifyContent:"center", background:"#F7F3EF",
      fontFamily:"Plus Jakarta Sans, system-ui, sans-serif"
    }}>
      <div style={{ textAlign:"center" }}>
        <div style={{
          width:40, height:40, border:"3px solid #DDD5CC",
          borderTopColor:"#E85D3D", borderRadius:"50%",
          animation:"spin 0.8s linear infinite", margin:"0 auto 16px"
        }} />
        <p style={{ fontSize:15, fontWeight:600, color:"#0F2544", marginBottom:4 }}>StayFind</p>
        <p style={{ fontSize:13, color:"#9FB3C8" }}>{status}</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
