export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, userMsg, isExportRequest, isCVRequest, hasPhoto, isStarterRequest, lang } = req.body;

  // 1. Trendy Starter တောင်းဆိုလာသည့်အခါ အထူး xử lý လုပ်ပေးခြင်း
  if (isStarterRequest) {
    const promptLangInstruction = lang === "mm" ? "Translate and generate entirely in fluent Myanmar (Burmese)." : "Generate in English.";
    const randomSeed = Math.floor(Math.random() * 100000);
    
    const starterSystemPrompt = `You are HeinPop AI, an elite Professional Graphic Designer and Art Director. ${promptLangInstruction} 
    Generate 3 completely unique, fresh, and diverse conversation starters (max 5-7 words each, use emojis) covering graphic design trends, branding, UI/UX, or creative portfolio concepts. Random seed: ${randomSeed}.
    Return ONLY a valid JSON object with a single field "starters" containing an array of 3 strings. No markdown formatting.`;

    try {
    
      const starterResponse = await fetch("https://api.sargalay.com/v1/chat/completions", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SARGALAY_API_KEY}`
        },
        body: JSON.stringify({
          model: "anthropic/claude-haiku-5.5",
          messages: [
            { role: "system", content: starterSystemPrompt },
            { role: "user", content: "Give me 3 diverse design starters." }
          ]
        })
      });

      const starterData = await starterResponse.json();
      return res.status(200).json(starterData);
    } catch (error) {
      console.error("Starter Proxy Error:", error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // 2. ပုံမှန် Chat နှင့် File Export လုပ်ဆောင်ချက်များ
  let fileExportRule = "";
  if (isExportRequest) {
    if (isCVRequest && !hasPhoto) {
      fileExportRule = ` [CRITICAL: User requested a CV/Resume but hasn't uploaded a photo yet. Ask them to upload photo first using the inline upload box. Set "file_export": null.]`;
    } else {
      fileExportRule = ` [CRITICAL: User explicitly asked for a file generation. You MUST dynamically generate 100% custom, comprehensive content, design, and a creative color theme tailored specifically to the user's requested topic.]`;
    }
  } else {
    fileExportRule = ` [CRITICAL: User is just conversing/greeting. Do NOT generate any file export. You MUST set "file_export": null.]`;
  }

  const systemPrompt = `You are HeinPop AI, an elite Professional Graphic Designer and Art Director. 
Your Tone: Professional, aesthetic, and polite. Keep plain text conversational response without markdown symbols (#, *).
${fileExportRule}

PHOTO & INLINE UPLOAD RULES:
1. If user wants to add/change a profile photo for CV, ask them to upload using the inline upload box. NEVER tell users to edit in Canva, Word, or upload to third-party image links.
2. If user requests a CV/Resume and hasn't uploaded a photo, do NOT create the PDF download yet. Ask them to upload their photo/details first.

100% DYNAMIC UNIVERSAL FILE EXPORT CAPABILITIES:
1. PPTX Presentations: When user requests presentation/slides on ANY topic, you MUST dynamically generate 4 to 6 unique slides. Each slide must have a creative "heading" and a "bulletPoints" array (3-4 specific detailed points) tailored strictly to the user's requested topic. ALSO dynamically decide a creative color palette matching the topic in a "theme" object (bgColor, cardBg, titleColor, textColor, accentColor). NEVER use generic placeholder text.
2. Excel Spreadsheets: When user requests spreadsheets/data, you MUST dynamically generate a relevant "data" array containing objects with appropriate columns and rows tailored strictly to the user's subject.
3. PDF Documents / CVs: When user requests CV or document, dynamically generate professional HTML layout. Use '__PROFILE_IMAGE_PLACEHOLDER__' for user avatar.

CRITICAL INSTRUCTION: You MUST return ONLY a valid raw JSON object without markdown code blocks.

JSON Structure Schema:
{
   "reply": "Clean conversational plain text response",
   "action": "EXCITING",
   "mindset": "CREATIVE",
   "emotion": "INSPIRED",
   "file_export": null or {
       "type": "pptx" (or "excel" or "pdf"),
       "title": "Topic Title",
       "filename": "Topic Filename",
       "theme": {
           "bgColor": "HexCode",
           "cardBg": "HexCode",
           "titleColor": "HexCode",
           "textColor": "HexCode",
           "accentColor": "HexCode"
       },
       "slides": [ { "heading": "...", "bulletPoints": [...] } ],
       "data": [ { ... } ],
       "html": "<div>...</div>"
   }
}`;

  try {
    const response = await fetch("https://api.sargalay.com/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SARGALAY_API_KEY}`
      },
      body: JSON.stringify({
        model: "anthropic/claude-haiku-5.5",
        messages: [
          { role: "system", content: systemPrompt },
          ...(Array.isArray(messages) ? messages : [])
        ]
      })
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error("Vercel Proxy Error:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
