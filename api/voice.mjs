const DEFAULT_ALLOWED_ORIGINS=[
  "https://amesiadev.github.io",
  "http://localhost:3000",
  "http://localhost:5500",
  "http://localhost:8000",
  "http://127.0.0.1:5500",
  "http://127.0.0.1:8000"
];

function allowedOrigins(){
  const configured=(process.env.IAM_ALLOWED_ORIGINS||"")
    .split(",")
    .map(value=>value.trim())
    .filter(Boolean);
  return new Set([...DEFAULT_ALLOWED_ORIGINS,...configured])
}

function corsHeaders(request){
  const origin=request.headers.get("origin");
  const headers={
    "Access-Control-Allow-Headers":"Content-Type",
    "Access-Control-Allow-Methods":"POST, OPTIONS",
    "Vary":"Origin",
    "X-Content-Type-Options":"nosniff"
  };
  if(origin&&allowedOrigins().has(origin))headers["Access-Control-Allow-Origin"]=origin;
  return headers
}

function json(body,status,headers={}){
  return new Response(JSON.stringify(body),{
    status,
    headers:{"Content-Type":"application/json; charset=utf-8",...headers}
  })
}

function requestOriginAllowed(request){
  const origin=request.headers.get("origin");
  return !origin||allowedOrigins().has(origin)
}

export default {
  async fetch(request){
    const headers=corsHeaders(request);

    if(request.method==="OPTIONS"){
      if(!requestOriginAllowed(request))return new Response(null,{status:403,headers});
      return new Response(null,{status:204,headers})
    }

    if(request.method!=="POST")return json({error:"METHOD_NOT_ALLOWED"},405,{...headers,"Allow":"POST, OPTIONS"});
    if(!requestOriginAllowed(request))return json({error:"ORIGIN_NOT_ALLOWED"},403,headers);
    if(!process.env.OPENAI_API_KEY)return json({error:"VOICE_SERVICE_NOT_CONFIGURED"},503,headers);

    let body;
    try{
      body=await request.json()
    }catch{
      return json({error:"INVALID_JSON"},400,headers)
    }

    const text=typeof body?.text==="string"?body.text.trim():"";
    const context=typeof body?.context==="string"?body.context:"default";
    const validContexts=new Set(["default","welcome","question","success","retry","hint","celebration"]);

    if(!text)return json({error:"TEXT_REQUIRED"},400,headers);
    if(text.length>1000)return json({error:"TEXT_TOO_LONG"},413,headers);
    if(!validContexts.has(context))return json({error:"INVALID_CONTEXT"},400,headers);

    const payload={
      model:process.env.OPENAI_TTS_MODEL||"gpt-4o-mini-tts",
      voice:process.env.OPENAI_TTS_VOICE||"coral",
      input:text,
      instructions:process.env.OPENAI_TTS_INSTRUCTIONS||"Habla en español latinoamericano con pronunciación clara y natural, tono cálido y ritmo moderado.",
      response_format:"mp3"
    };

    let upstream;
    try{
      upstream=await fetch("https://api.openai.com/v1/audio/speech",{
        method:"POST",
        headers:{
          "Authorization":`Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type":"application/json"
        },
        body:JSON.stringify(payload)
      })
    }catch{
      return json({error:"TTS_UPSTREAM_UNREACHABLE"},502,headers)
    }

    if(!upstream.ok){
      console.error("OpenAI TTS error",upstream.status);
      return json({error:"TTS_GENERATION_FAILED"},502,headers)
    }

    return new Response(await upstream.arrayBuffer(),{
      status:200,
      headers:{
        ...headers,
        "Content-Type":"audio/mpeg",
        "Cache-Control":"no-store"
      }
    })
  }
};
