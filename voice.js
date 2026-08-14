(()=>{
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

class IAMVoiceService{
  constructor({provider=null,fallback=null,getWorld=null}={}){
    this.provider=provider;
    this.fallback=fallback||new NativeSpeechAdapter();
    this.getWorld=typeof getWorld==="function"?getWorld:()=>null
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

    this.stop();
    const voiceOptions=this.voiceOptions(options);

    if(this.provider&&typeof this.provider.speak==="function"){
      try{
        const result=await this.provider.speak(text,voiceOptions);
        if(result!==false)return true
      }catch{}
    }

    if(this.fallback&&typeof this.fallback.speak==="function"){
      return this.fallback.speak(text,voiceOptions)
    }

    return false
  }

  stop(){
    try{this.provider?.stop?.()}catch{}
    try{this.fallback?.stop?.()}catch{}
  }
}

window.IAMVoiceService=IAMVoiceService;
window.IAMNativeSpeechAdapter=NativeSpeechAdapter;
})();
