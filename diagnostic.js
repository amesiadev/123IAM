(()=>{
const VERSION=1,PLAYER_KEY="123iam_player",PROGRESS_PREFIX="123iam_progress";
const form=document.getElementById("playerForm");
if(!form)return;
const originalSubmit=form.onsubmit;
let state=null;

function load(k,f){try{const v=localStorage.getItem(k);return v?JSON.parse(v):f}catch{return f}}
function save(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}
function slug(name){return (name||"jugador").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"jugador"}
function progressKey(profile){return `${PROGRESS_PREFIX}:${slug(profile.nombre)}:${profile.edad||0}`}
function eligible(age){return age===7||age===8}
function baselineWorld(age){return age===7?2:age===8?3:(age<=5?1:age===9?4:2)}
function ri(a,b){return Math.floor(Math.random()*(b-a+1))+a}
function pick(a){return a[ri(0,a.length-1)]}
function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=ri(0,i);[a[i],a[j]]=[a[j],a[i]]}return a}
function clamp(n,min,max){return Math.max(min,Math.min(max,n))}
function speak(text){if(!("speechSynthesis" in window)||!text)return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang="es-CO";u.rate=.92;u.pitch=1.08;window.speechSynthesis.speak(u)}

function buildOptions(answer,max=100){
 const s=new Set([answer]);let guard=0;
 const delta=max<=10?3:max<=50?8:14;
 while(s.size<3&&guard++<80){const v=clamp(answer+ri(-delta,delta),0,max);if(v!==answer)s.add(v)}
 for(let i=0;s.size<3&&i<=max;i++)s.add(i);
 return shuffle([...s]).slice(0,3)
}
function question(id,world,skills,q,speechText,answer,max=100,visual="🧭"){
 return{id,world,skills,q,speech:speechText||q,answer,max,visual,options:buildOptions(answer,max)}
}
function bankForAge(age){
 if(age===7){
   const a1=ri(24,48),b1=ri(11,Math.min(35,89-a1));
   const a2=ri(52,89),b2=ri(14,Math.min(39,a2-1));
   const t=pick([2,3,5]),f=ri(4,9);
   const f4=ri(3,8),f6=ri(2,7),missing=pick([4,6]),missFactor=ri(3,7);
   return[
     question("a7-add2",2,["add2"],`${a1} + ${b1} = ¿cuánto?`,`Primer reto. ¿Cuánto es ${a1} más ${b1}?`,a1+b1,99,"🌴➕"),
     question("a7-sub2",2,["sub2"],`${a2} − ${b2} = ¿cuánto?`,`¿Cuánto es ${a2} menos ${b2}?`,a2-b2,99,"🌴➖"),
     question("a7-base-table",2,[`table-${t}`],`${t} × ${f} = ¿cuánto?`,`¿Cuánto es ${t} por ${f}?`,t*f,50,"🐒✖️"),
     question("a7-table4",3,["table-4"],`4 × ${f4} = ¿cuánto?`,`Puente galáctico. ¿Cuánto es cuatro por ${f4}?`,4*f4,40,"🚀4️⃣"),
     question("a7-table6",3,["table-6"],`6 × ${f6} = ¿cuánto?`,`¿Cuánto es seis por ${f6}?`,6*f6,50,"🪐6️⃣"),
     question("a7-missing",3,[`table-${missing}`,"spatial"],`${missing} × ? = ${missing*missFactor}. ¿Qué número falta?`,`Encuentra el número que falta. ${missing} por qué número es igual a ${missing*missFactor}?`,missFactor,10,"🔎🪐")
   ]
 }
 const factors=[ri(3,8),ri(3,8),ri(3,8),ri(3,8)],tables=[4,6,7,8];
 const missingTable=pick([6,7,8]),missingFactor=ri(3,8),groups=ri(3,6),each=pick([6,7,8]);
 return[
   ...tables.map((table,i)=>question(`a8-table${table}`,3,[`table-${table}`],`${table} × ${factors[i]} = ¿cuánto?`,`¿Cuánto es ${table} por ${factors[i]}?`,table*factors[i],80,"🚀🪐")),
   question("a8-missing",3,[`table-${missingTable}`,"spatial"],`${missingTable} × ? = ${missingTable*missingFactor}. ¿Qué número falta?`,`Encuentra el factor perdido. ${missingTable} por qué número es igual a ${missingTable*missingFactor}?`,missingFactor,10,"🔎🌌"),
   question("a8-applied",3,[`table-${each}`,"applied"],`Hay ${groups} estaciones con ${each} bicicletas cada una. ¿Cuántas bicicletas hay?`,`Problema final. Hay ${groups} estaciones con ${each} bicicletas cada una. ¿Cuántas bicicletas hay en total?`,groups*each,80,"🚲🏙️")
 ]
}
function decide(age,firstTry,total,avgMs){
 const strong=firstTry>=5;
 const gaps=firstTry<=2;
 if(age===7){
   if(strong)return{outcome:"advance",assignedWorld:3,label:"¡Listo para despegar!",message:"Tu ruta comienza en la Galaxia de las Tablas. IAM seguirá ajustando los retos mientras juegas."};
   if(gaps)return{outcome:"reinforcement",assignedWorld:2,label:"Vamos a fortalecer tu base",message:"Empezaremos en la Selva Matemática con retos adaptados para ganar confianza y avanzar paso a paso."};
   return{outcome:"expected",assignedWorld:2,label:"Tu nivel está muy bien ubicado",message:"La Selva Matemática es el mejor punto de partida. IAM irá subiendo la dificultad cuando estés listo."}
 }
 if(strong)return{outcome:"advance",assignedWorld:4,label:"¡Reto de maestro desbloqueado!",message:"Tu ruta comienza en la Ciudad de los Maestros, con repaso adaptativo de todas las tablas."};
 if(gaps)return{outcome:"reinforcement",assignedWorld:2,label:"Primero reforzaremos algunos poderes",message:"Volveremos un momento a la Selva Matemática para fortalecer bases y luego avanzar de nuevo."};
 return{outcome:"expected",assignedWorld:3,label:"La Galaxia es tu mejor ruta",message:"Comenzarás en la Galaxia de las Tablas y IAM ajustará cada misión según tu progreso."}
}
function seedProgress(profile,answers,result){
 const key=progressKey(profile),p=load(key,{});
 answers.forEach(a=>{
   const q=a.question,wkey=`world${q.world}`;p[wkey]=p[wkey]||{};p[wkey].skills=p[wkey].skills||{};
   q.skills.forEach(skill=>{
     const r=p[wkey].skills[skill]||{seen:0,mastery:50,firstTryCorrect:0,totalAttempts:0,hintsUsed:0,totalResponseMs:0,streak:0};
     const first=a.attempts===1,delta=first?10:a.attempts===2?2:-7;
     r.seen=(r.seen||0)+1;r.firstTryCorrect=(r.firstTryCorrect||0)+(first?1:0);r.totalAttempts=(r.totalAttempts||0)+a.attempts;r.hintsUsed=(r.hintsUsed||0)+(a.attempts>2?1:0);r.totalResponseMs=(r.totalResponseMs||0)+a.responseMs;r.streak=first?(r.streak||0)+1:0;r.mastery=clamp((Number.isFinite(r.mastery)?r.mastery:50)+delta+(first&&a.responseMs<=12000?2:0),15,100);r.lastPlayedAt=result.completedAt;p[wkey].skills[skill]=r
   })
 });
 p.diagnostic=result;save(key,p)
}
function existingDiagnostic(profile){const p=load(progressKey(profile),{});return p?.diagnostic?.version===VERSION?p.diagnostic:null}
function saveAssignedPlayer(profile,result){
 const stored=load(PLAYER_KEY,{}),created=stored?.nombre===profile.nombre&&Number(stored?.edad)===profile.edad?stored.creadoEn:null;
 save(PLAYER_KEY,{nombre:profile.nombre,edad:profile.edad,mundo:result.assignedWorld,creadoEn:created||new Date().toISOString(),diagnosticoVersion:VERSION,diagnosticoResultado:result.outcome})
}
function hideBaseScreens(){document.querySelectorAll(".screen").forEach(el=>el.classList.remove("active"))}
function ensureUi(){
 let root=document.getElementById("diagnosticScreen");if(root)return root;
 root=document.createElement("section");root.id="diagnosticScreen";root.className="diagnostic-screen";root.innerHTML=`<div class="diagnostic-card"><div id="diagnosticMascot" class="diagnostic-mascot">🦊🧭</div><div id="diagnosticBadge" class="diagnostic-badge">Ruta de aventura</div><h1 id="diagnosticTitle">IAM quiere conocerte mejor</h1><p id="diagnosticIntro" class="diagnostic-intro"></p><div id="diagnosticProgress" class="diagnostic-progress" hidden><div class="diagnostic-track"><div id="diagnosticBar" class="diagnostic-bar"></div></div><span id="diagnosticCount"></span></div><div id="diagnosticVisual" class="diagnostic-visual"></div><div id="diagnosticQuestion" class="diagnostic-question"></div><button id="diagnosticRepeat" class="secondary" type="button" hidden>🔊 Escuchar</button><div id="diagnosticAnswers" class="diagnostic-answers"></div><div id="diagnosticFeedback" class="diagnostic-feedback" aria-live="polite"></div><div id="diagnosticHint" class="diagnostic-hint" aria-live="polite"></div><button id="diagnosticStart" class="primary" type="button">🧭 Descubrir mi ruta</button><button id="diagnosticContinue" class="primary" type="button" hidden>🚀 Ir a mi mundo</button></div>`;
 document.querySelector("main.app")?.appendChild(root);return root
}
function start(profile){
 if("speechSynthesis" in window)window.speechSynthesis.cancel();
 hideBaseScreens();ensureUi().classList.add("active");
 state={profile,questions:bankForAge(profile.edad),index:-1,answers:[],attempts:0,questionStartedAt:0,locked:false,firstMiss:false};
 document.getElementById("diagnosticIntro").textContent=`${profile.nombre}, esto no es un examen. Son 6 retos cortos para que IAM encuentre la aventura que mejor encaja contigo.`;
 document.getElementById("diagnosticVisual").textContent="🦊🗺️✨";document.getElementById("diagnosticQuestion").textContent="Aquí puedes probar, pensar y volver a intentarlo. ¡Cada respuesta ayuda a construir tu ruta!";
 document.getElementById("diagnosticAnswers").innerHTML="";document.getElementById("diagnosticFeedback").textContent="";document.getElementById("diagnosticHint").textContent="";
 document.getElementById("diagnosticStart").hidden=false;document.getElementById("diagnosticContinue").hidden=true;document.getElementById("diagnosticProgress").hidden=true;document.getElementById("diagnosticRepeat").hidden=true;
 speak(`${profile.nombre}, haremos seis retos cortos. No es un examen. Solo quiero encontrar la aventura que mejor encaja contigo.`)
}
function startQuestions(){document.getElementById("diagnosticStart").hidden=true;document.getElementById("diagnosticProgress").hidden=false;document.getElementById("diagnosticRepeat").hidden=false;state.index=0;renderQuestion()}
function renderQuestion(){
 const q=state.questions[state.index];state.attempts=0;state.firstMiss=false;state.locked=false;state.questionStartedAt=Date.now();
 document.getElementById("diagnosticBadge").textContent="Diagnóstico adaptativo";document.getElementById("diagnosticTitle").textContent="Encuentra tu mejor ruta";
 document.getElementById("diagnosticCount").textContent=`Reto ${state.index+1} de ${state.questions.length}`;document.getElementById("diagnosticBar").style.width=`${state.index/state.questions.length*100}%`;
 document.getElementById("diagnosticVisual").textContent=q.visual;document.getElementById("diagnosticQuestion").textContent=q.q;document.getElementById("diagnosticFeedback").textContent="";document.getElementById("diagnosticHint").textContent="";
 renderDiagnosticAnswers(q.options);speak(q.speech)
}
function renderDiagnosticAnswers(values){
 const box=document.getElementById("diagnosticAnswers");box.innerHTML="";
 values.forEach(v=>{const b=document.createElement("button");b.type="button";b.className="diagnostic-answer";b.textContent=v;b.onclick=()=>answer(v,b);box.appendChild(b)})
}
function answer(value,button){
 if(state.locked)return;const q=state.questions[state.index];state.attempts++;
 if(value===q.answer){
   state.locked=true;button.classList.add("good");const responseMs=clamp(Date.now()-state.questionStartedAt,0,120000);state.answers.push({question:q,attempts:state.attempts,responseMs});
   document.getElementById("diagnosticFeedback").textContent=state.attempts===1?"¡Excelente! 🌟":"¡Lo encontraste! 🎉";speak(state.attempts===1?"¡Excelente!":"¡Lo encontraste!");
   setTimeout(()=>{state.index++;if(state.index>=state.questions.length)finishDiagnostic();else renderQuestion()},700);return
 }
 button.disabled=true;button.classList.add("try-again");document.getElementById("diagnosticFeedback").textContent=state.attempts===1?"¡Casi! Mira las opciones otra vez 🌟":"¡Buen intento! Te doy una pista 💡";speak(document.getElementById("diagnosticFeedback").textContent);
 if(state.attempts>=2){document.getElementById("diagnosticHint").textContent=`💡 Piensa en grupos iguales o descompón los números. La respuesta está entre las opciones que quedan.`;const remaining=q.options.filter(v=>v===q.answer||![...document.querySelectorAll(".diagnostic-answer:disabled")].some(b=>Number(b.textContent)===v));renderDiagnosticAnswers(shuffle([q.answer,...remaining.filter(v=>v!==q.answer)].slice(0,2)))}
}
function finishDiagnostic(){
 const firstTry=state.answers.filter(a=>a.attempts===1).length,total=state.questions.length,totalAttempts=state.answers.reduce((s,a)=>s+a.attempts,0),avgMs=Math.round(state.answers.reduce((s,a)=>s+a.responseMs,0)/Math.max(1,total));
 const decision=decide(state.profile.edad,firstTry,total,avgMs),completedAt=new Date().toISOString();
 const result={version:VERSION,completedAt,age:state.profile.edad,score:firstTry,total,firstTryCorrect:firstTry,totalAttempts,avgResponseMs:avgMs,outcome:decision.outcome,assignedWorld:decision.assignedWorld};
 seedProgress(state.profile,state.answers,result);saveAssignedPlayer(state.profile,result);
 document.getElementById("diagnosticBar").style.width="100%";document.getElementById("diagnosticProgress").hidden=true;document.getElementById("diagnosticRepeat").hidden=true;document.getElementById("diagnosticVisual").textContent={2:"🌴🐒",3:"🚀🪐",4:"🏙️🏆"}[decision.assignedWorld]||"🧭";
 document.getElementById("diagnosticTitle").textContent=decision.label;document.getElementById("diagnosticQuestion").textContent=decision.message;document.getElementById("diagnosticFeedback").textContent=`Lograste ${firstTry} de ${total} retos al primer intento.`;document.getElementById("diagnosticHint").textContent="IAM seguirá aprendiendo contigo. Tu mundo puede ajustar la dificultad a medida que avanzas.";document.getElementById("diagnosticAnswers").innerHTML="";document.getElementById("diagnosticContinue").hidden=false;
 speak(`${decision.label}. ${decision.message}`)
}
function resumeOrStart(profile){
 const d=existingDiagnostic(profile);
 if(d){saveAssignedPlayer(profile,d);location.reload();return}
 save(PLAYER_KEY,{nombre:profile.nombre,edad:profile.edad,mundo:baselineWorld(profile.edad),creadoEn:new Date().toISOString(),diagnosticoPendiente:VERSION});start(profile)
}
form.onsubmit=e=>{
 const nombre=document.getElementById("nombre")?.value.trim(),edad=Number(document.getElementById("edad")?.value);
 if(!nombre||!edad)return originalSubmit?.call(form,e);
 if(!eligible(edad))return originalSubmit?.call(form,e);
 e.preventDefault();resumeOrStart({nombre,edad})
};

document.addEventListener("click",e=>{
 if(e.target?.id==="diagnosticStart")startQuestions();
 if(e.target?.id==="diagnosticRepeat"&&state?.index>=0)speak(state.questions[state.index]?.speech);
 if(e.target?.id==="diagnosticContinue")location.reload()
});

const stored=load(PLAYER_KEY,null);
if(stored&&eligible(Number(stored.edad))){
 const profile={nombre:stored.nombre,edad:Number(stored.edad)},d=existingDiagnostic(profile);
 if(d){
   if(stored.mundo!==d.assignedWorld||stored.diagnosticoVersion!==VERSION){saveAssignedPlayer(profile,d);location.reload()}
 }else start(profile)
}
})();
