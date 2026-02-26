import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { skills, interests, target_role, resume_text } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // If resume_text provided, extract skills via AI first
    let extractedSkills: string[] = skills || [];
    let extractedRole = target_role || "";
    let extractedInterests = interests || "";

    if (resume_text && resume_text.trim().length > 0) {
      const extractResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "Extract structured information from this resume. Be thorough in identifying all technical and soft skills." },
            { role: "user", content: resume_text.slice(0, 15000) },
          ],
          tools: [{
            type: "function",
            function: {
              name: "extract_resume",
              description: "Extract skills, role, and interests from resume",
              parameters: {
                type: "object",
                properties: {
                  skills: { type: "array", items: { type: "string" }, description: "All technical and soft skills found" },
                  current_role: { type: "string", description: "Current or most recent job title" },
                  interests: { type: "string", description: "Inferred career interests based on experience" },
                  experience_years: { type: "number", description: "Total years of experience" },
                  education: { type: "string", description: "Highest education level and field" },
                },
                required: ["skills", "current_role", "interests"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "extract_resume" } },
        }),
      });

      if (extractResp.ok) {
        const extractData = await extractResp.json();
        const toolCall = extractData.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall) {
          const parsed = JSON.parse(toolCall.function.arguments);
          extractedSkills = [...new Set([...(skills || []), ...(parsed.skills || [])])];
          if (!target_role && parsed.current_role) extractedRole = parsed.current_role;
          if (!interests && parsed.interests) extractedInterests = parsed.interests;
        }
      }
    }

    // Get successful alumni profiles for comparison
    const { data: alumni } = await supabase
      .from("profiles")
      .select("full_name, company, designation, industry, skills, experience_years, department, is_mentor")
      .order("engagement_score", { ascending: false })
      .limit(50);

    const alumniContext = alumni?.map(a =>
      `${a.full_name} | ${a.designation || ''} at ${a.company || 'N/A'} | Industry: ${a.industry || ''} | Skills: ${(a.skills || []).join(', ')} | Exp: ${a.experience_years}yr | Mentor: ${a.is_mentor}`
    ).join('\n') || 'Limited alumni data available.';

    const resumeSection = resume_text ? `\nRESUME CONTENT (extracted):\n${resume_text.slice(0, 5000)}\n` : '';

    const systemPrompt = `You are a Career Skills Gap Analyzer for AlumniOS. Analyze the student's current skills against successful alumni profiles and provide actionable guidance.

SUCCESSFUL ALUMNI PROFILES:
${alumniContext}

STUDENT INPUT:
- Current Skills: ${extractedSkills.join(', ')}
- Interests: ${extractedInterests || 'Not specified'}
- Target Role: ${extractedRole || 'Not specified'}
${resumeSection}
INSTRUCTIONS:
Provide a structured analysis in markdown:

## 🎯 Skill Gap Analysis

### ✅ Strengths
List skills the student has that align with successful alumni in their target area.

### ⚠️ Missing Skills
List critical skills they need to develop, ranked by importance. Compare with what top alumni in similar roles have.

### 👥 Recommended Mentors
From the alumni database, suggest 2-3 alumni who could mentor this student based on skill/industry alignment.

### 🛤️ Suggested Career Path
Based on alumni progression patterns, suggest a realistic career path with milestones.

### 📚 Action Plan
Provide 3-5 concrete next steps to close the skill gaps.

Be specific, data-driven, and reference actual alumni patterns when possible.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze my skill gaps. My skills: ${extractedSkills.join(', ')}. Interests: ${extractedInterests || 'general'}. Target role: ${extractedRole || 'any'}.` },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("skill-gap error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
