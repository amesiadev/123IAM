(()=>{
function configuredVoiceEndpoint(){
  const meta=document.querySelector('meta[name="iam-voice-endpoint"]');
  const configured=meta?.content?.trim();
  if(configured)return configured;

  const host=window.location.hostname;
  if(host.endsWith(".vercel.app")||host==="localhost"||host==="127.0.0.1")return "/api/voice";
  return ""
}

function normalizeForSpeech(text){
  return String(text||"")
    .replace(/\b123\s*IAM\b/gi,"uno dos tres Íam")
    .replace(/\bIAM\b/gi,"Íam")
    .replace(/×/g," por ")
    .replace(/\+/g," más ")
    .replace(/[−–]/g," menos ")
    .replace(/÷/g," dividido entre ")
    .replace(/=/g," es igual a ")
    .replace(/\s+/g," ")
    .trim()
}

function inferVoiceContext(text){
  const value=String(text||"").toLowerCase();
  if(/misión completada|medalla|excelente aventura/.test(value))return"celebration";
  if(/fantástico|lo hiciste genial|muy bien|excelente trabajo|respuesta es/.test(value))return"success";
  if(/casi|buen intento|otra vez|mira con calma|no pasa nada/.test(value))return"retry";
  if(/pista|contemos|dos opciones|recarga de energía/.test(value))return"hint";
  if(/hola|bienvenido|aventura comienza|comienza tu misión/.test(value))return"welcome";
  if(value.includes("?"))return"question";
  return"default"
}

const LATAM_SPANISH_REGIONS=new Set(["es-419","es-mx","es-us","es-ar","es-cl","es-pe","es-ve","es-ec","es-uy","es-bo","es-cr","es-pa","es-do","es-gt","es-hn","es-ni","es-sv","es-pr"]);

class NativeSpeechAdapter{
  constructor(){
    this.voices=[];
    this.selectedVoice=null;
    this.refreshVoices();
    if(this.isAvailable()&&typeof window.speechSynthesis.addEventListener==="function"){
      window.speechSynthesis.addEventListener("voiceschanged",()=>this.refreshVoices())
    }
  }

  isAvailable(){
    return "speechSynthesis" in window&&"SpeechSynthesisUtterance" in window
  }

  refreshVoices(){
    if(!this.isAvailable())return;
    this.voices=window.speechSynthesis.getVoices()||[];
    this.selectedVoice=null
  }

  scoreVoice(voice,preferredLang="es-CO"){
    const lang=(voice?.lang||"").toLowerCase();
    const preferred=String(preferredLang||"es-CO").toLowerCase();
    let score=0;

    if(lang===preferred)score+=140;
    else if(lang==="es-419")score+=130;
    else if(LATAM_SPANISH_REGIONS.has(lang))score+=120;
    else if(lang.startsWith("es-"))score+=85;
    else if(lang==="es")score+=75;
    else return-1;

    if(voice.localService)score+=8;
    if(voice.default)score+=4;
    return score
  }

  selectVoice(preferredLang="es-CO"){
    if(!this.isAvailable())return null;
    const available=window.speechSynthesis.getVoices()||[];
    if(available.length!==this.voices.length)this.refreshVoices();
    if(this.selectedVoice)return this.selectedVoice;

    const ranked=this.voices
      .map(voice=>({voice,score:this.scoreVoice(voice,preferredLang)}))
      .filter(item=>item.score>=0)
      .sort((a,b)=>b.score-a.score);

    this.selectedVoice=ranked[0]?.voice||null;
    return this.selectedVoice
  }

  speak(text,options={}){
    if(!text||!this.isAvailable())return Promise.resolve(false);

    this.stop();

    const utterance=new SpeechSynthesisUtterance(text);
    const voice=this.selectVoice(options.lang||"es-CO");
    if(voice)utterance.voice=voice;
    utterance.lang=voice?.lang||options.lang||"es-CO";
    utterance.rate=Number.isFinite(options.rate)?options.rate:.92;
    utterance.pitch=Number.isFinite(options.pitch)?options.pitch:1.02;
    utterance.volume=Number.isFinite(options.volume)?options.volume:1;

    return new Promise(resolve=>{
      utterance.onend=()=>resolve(true);
      utterance.onerror=()=>resolve(false);
      window.speechSynthesis.speak(utterance)
    })
  }

  stop(){
    if(this.isAvailable())window.speechSynthesis.cancel()
  }
}

class RemoteTTSProvider{
  constructor({endpoint=configuredVoiceEndpoint(),timeoutMs=6500}={}){
    this.endpoint=endpoint;
    this.timeoutMs=timeoutMs;
    this.audio=new Audio();
    this.abortController=null;
    this.objectUrl=null;
    this.sequence=0
  }

  isAvailable(){
    return Boolean(this.endpoint&&"fetch" in window&&"Audio" in window)
  }

  async speak(text,options={}){
    if(!text||!this.isAvailable())return false;

    this.stop();
    const sequence=++this.sequence;
    const controller=new AbortController();
    this.abortController=controller;
    const timeout=setTimeout(()=>controller.abort(),this.timeoutMs);

    try{
      const response=await fetch(this.endpoint,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({text,context:options.context||"default"}),
        signal:controller.signal
      });

      if(!response.ok||sequence!==this.sequence)return false;

      const blob=await response.blob();
      if(!blob.type.startsWith("audio/")||sequence!==this.sequence)return false;

      const url=URL.createObjectURL(blob);
      this.objectUrl=url;
      this.audio.src=url;
      this.audio.volume=Number.isFinite(options.volume)?options.volume:1;
      await this.audio.play();
      return sequence===this.sequence
    }catch{
      return false
    }finally{
      clearTimeout(timeout);
      if(this.abortController===controller)this.abortController=null
    }
  }

  stop(){
    this.sequence++;
    if(this.abortController){
      this.abortController.abort();
      this.abortController=null
    }
    this.audio.pause();
    this.audio.removeAttribute("src");
    this.audio.load();
    if(this.objectUrl){
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl=null
    }
  }
}

class IAMVoiceService{
  constructor({provider=undefined,fallback=null,getWorld=null}={}){
    this.provider=provider===undefined?new RemoteTTSProvider():provider;
    this.fallback=fallback||new NativeSpeechAdapter();
    this.getWorld=typeof getWorld==="function"?getWorld:()=>null;
    this.sequence=0
  }

  voiceOptions(text,options={}){
    const world=this.getWorld();
    const context=options.context||inferVoiceContext(text);
    const profile={
      default:{rate:1,pitch:1.02},
      welcome:{rate:.96,pitch:1.04},
      question:{rate:.94,pitch:1},
      success:{rate:1.02,pitch:1.06},
      retry:{rate:.94,pitch:1},
      hint:{rate:.9,pitch:.98},
      celebration:{rate:1.02,pitch:1.07}
    }[context]||{rate:1,pitch:1.02};
    const baseRate=world===1?.88:.92;

    return{
      lang:"es-CO",
      rate:baseRate*profile.rate,
      pitch:profile.pitch,
      volume:1,
      ...options,
      context
    }
  }

  async speak(text,options={}){
    if(!text)return false;

    const sequence=++this.sequence;
    this.cancelAdapters();
    const preparedText=normalizeForSpeech(text);
    const voiceOptions=this.voiceOptions(preparedText,options);

    if(this.provider&&typeof this.provider.speak==="function"){
      try{
        const result=await this.provider.speak(preparedText,voiceOptions);
        if(sequence!==this.sequence)return false;
        if(result!==false)return true
      }catch{}
    }

    if(sequence!==this.sequence)return false;

    if(this.fallback&&typeof this.fallback.speak==="function"){
      return this.fallback.speak(preparedText,voiceOptions)
    }

    return false
  }

  cancelAdapters(){
    try{this.provider?.stop?.()}catch{}
    try{this.fallback?.stop?.()}catch{}
  }

  stop(){
    this.sequence++;
    this.cancelAdapters()
  }
}

window.IAMNormalizeForSpeech=normalizeForSpeech;
window.IAMVoiceService=IAMVoiceService;
window.IAMRemoteTTSProvider=RemoteTTSProvider;
window.IAMNativeSpeechAdapter=NativeSpeechAdapter;
})();
