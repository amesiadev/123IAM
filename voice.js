(()=>{
function configuredVoiceEndpoint(){
  const meta=document.querySelector('meta[name="iam-voice-endpoint"]');
  const configured=meta?.content?.trim();
  if(configured)return configured;

  const host=window.location.hostname;
  if(host.endsWith(".vercel.app")||host==="localhost"||host==="127.0.0.1")return "/api/voice";
  return ""
}

class NativeSpeechAdapter{
  isAvailable(){
    return "speechSynthesis" in window&&"SpeechSynthesisUtterance" in window
  }

  speak(text,options={}){
    if(!text||!this.isAvailable())return Promise.resolve(false);

    this.stop();

    const utterance=new SpeechSynthesisUtterance(text);
    utterance.lang=options.lang||"es-CO";
    utterance.rate=Number.isFinite(options.rate)?options.rate:.92;
    utterance.pitch=Number.isFinite(options.pitch)?options.pitch:1.1;
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

  voiceOptions(options={}){
    const world=this.getWorld();
    return{
      lang:"es-CO",
      rate:world===1?.88:.92,
      pitch:1.1,
      volume:1,
      ...options
    }
  }

  async speak(text,options={}){
    if(!text)return false;

    const sequence=++this.sequence;
    this.cancelAdapters();
    const voiceOptions=this.voiceOptions(options);

    if(this.provider&&typeof this.provider.speak==="function"){
      try{
        const result=await this.provider.speak(text,voiceOptions);
        if(sequence!==this.sequence)return false;
        if(result!==false)return true
      }catch{}
    }

    if(sequence!==this.sequence)return false;

    if(this.fallback&&typeof this.fallback.speak==="function"){
      return this.fallback.speak(text,voiceOptions)
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

window.IAMVoiceService=IAMVoiceService;
window.IAMRemoteTTSProvider=RemoteTTSProvider;
window.IAMNativeSpeechAdapter=NativeSpeechAdapter;
})();
