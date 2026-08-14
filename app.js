(()=>{
const PLAYER_KEY="123iam_player",PROGRESS_KEY="123iam_progress",ADAPTIVE_VERSION=1;
const $=id=>document.getElementById(id);
const screens={setup:$("setup"),world:$("world"),game:$("game"),complete:$("complete")};
const mundos={
1:{name:"🌈 El Valle de los Números",desc:"Aquí conoceremos números, contaremos objetos y resolveremos sumas y restas muy divertidas.",art:"🦊🔢",bg:"linear-gradient(180deg,#8be7ff 0 58%,#9ee57a 58% 100%)",rounds:8,kicker:"🌈 El Valle de los Números"},
2:{name:"🌴 La Selva Matemática",desc:"Exploraremos la selva resolviendo sumas y restas de dos dígitos y descubriendo las tablas del 1, 2, 3 y 5.",art:"🐒🌴",bg:"linear-gradient(180deg,#77d6ff 0 52%,#62c86e 52% 100%)",rounds:10,kicker:"🌴 La Selva Matemática"},
3:{name:"🚀 La Galaxia de las Tablas",desc:"Viajaremos por planetas matemáticos con retos de velocidad, precisión y lógica espacial mientras practicamos las tablas del 4, 6, 7 y 8.",art:"🚀🪐",bg:"radial-gradient(circle at 30% 20%,#6358c7,#211657 70%)",rounds:10,kicker:"🚀 La Galaxia de las Tablas"},
4:{name:"🏙️ La Ciudad de los Maestros",desc:"Resolveremos problemas aplicados, dominaremos las tablas del 9 y 10 y pondremos a prueba todas las tablas del 1 al 10.",art:"🏙️🏆",bg:"linear-gradient(180deg,#79d7ff 0 55%,#e7bd76 55% 100%)",rounds:12,kicker:"🏙️ La Ciudad de los Maestros"}
};
const objects=[{e:"🍎",n:"manzanas"},{e:"⭐",n:"estrellas"},{e:"🐞",n:"mariquitas"},{e:"🌼",n:"flores"},{e:"🦋",n:"mariposas"},{e:"🍓",n:"fresas"},{e:"🥭",n:"mangos"},{e:"🐒",n:"monitos"}];
const good=["¡Fantástico! 🌟","¡Lo hiciste genial! 🎉","¡Muy bien, explorador! 🚀","¡Excelente trabajo! ⭐"];
const gentle=["¡Casi! Inténtalo otra vez 💪","¡Buen intento! Vamos una vez más 🌟","¡Vas muy bien! Mira con calma 😊"];
let player=load(PLAYER_KEY,null),current=null,round=0,stars=0,hints=0,misses=0,locked=false;
let timerId=null,timerStartId=null,timeLeft=0,speedHits=0;
let challengeStartedAt=0,attemptsThisChallenge=0,hintUsedThisChallenge=false,missionFirstTry=0;
function load(k,f){try{const v=localStorage.getItem(k);return v?JSON.parse(v):f}catch{return f}}
function save(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}
function playerProgressKey(){
 const raw=(player?.nombre||"jugador").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"jugador";
 return `${PROGRESS_KEY}:${raw}:${player?.edad||0}`
}
function loadProgress(){
 const key=playerProgressKey(),own=load(key,null);if(own)return own;
 const legacy=load(PROGRESS_KEY,null);
 if(legacy&&!legacy.__migrated){const migrated={...legacy};delete migrated.__migrated;save(key,migrated);legacy.__migrated=true;save(PROGRESS_KEY,legacy);return migrated}
 return {}
}
function saveProgress(v){save(playerProgressKey(),v)}
function show(name){Object.entries(screens).forEach(([k,v])=>v.classList.toggle("active",k===name));window.scrollTo({top:0,behavior:"smooth"})}
function mundo(edad){if(edad<=5)return 1;if(edad<=7)return 2;if(edad===8)return 3;return 4}
function totalRounds(){return mundos[player?.mundo]?.rounds||8}
function speak(text){if(!("speechSynthesis" in window)||!text)return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang="es-CO";u.rate=player?.mundo===1?.88:.92;u.pitch=1.1;u.volume=1;window.speechSynthesis.speak(u)}
function welcome(){speak("¡Hola! Soy IAM. Bienvenido a 123 IAM. Primero dime cómo te llamas y cuántos años tienes.")}
function configureWorld(){
 if(!player)return;
 const w=mundos[player.mundo];
 $("worldBadge").textContent=`Mundo ${player.mundo}`;
 $("worldTitle").textContent=`¡${player.nombre}, tu aventura comienza en ${w.name}!`;
 $("worldDescription").textContent=w.desc;
 $("worldArt").textContent=w.art;
 $("worldArt").style.background=w.bg;
 $("miniName").textContent=player.nombre;
 if(player.mundo===1){$("enterWorld").textContent="🌟 ¡Entrar al Valle!";$("enterWorld").disabled=false;$("worldNote").textContent="Misión disponible: conteo, suma y resta hasta 10."}
 else if(player.mundo===2){$("enterWorld").textContent="🌴 ¡Explorar la Selva!";$("enterWorld").disabled=false;$("worldNote").textContent="Misión disponible: suma, resta y multiplicación como suma repetida."}
 else if(player.mundo===3){$("enterWorld").textContent="🚀 ¡Despegar a la Galaxia!";$("enterWorld").disabled=false;$("worldNote").textContent="Misión disponible: tablas 4, 6, 7 y 8 con velocidad, precisión y lógica espacial."}
 else if(player.mundo===4){$("enterWorld").textContent="🏙️ ¡Entrar a la Ciudad!";$("enterWorld").disabled=false;$("worldNote").textContent="Misión de maestría: tablas 9 y 10, repaso 1–10, factores faltantes y problemas aplicados."}
 else{$("enterWorld").textContent="🔒 Mundo en preparación";$("enterWorld").disabled=true;$("worldNote").textContent="Este mundo ya está asignado a tu perfil y se habilitará en una próxima etapa."}
}
function ri(a,b){return Math.floor(Math.random()*(b-a+1))+a}
function pick(a){return a[ri(0,a.length-1)]}
function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=ri(0,i);[a[i],a[j]]=[a[j],a[i]]}return a}
function clamp(n,min,max){return Math.max(min,Math.min(max,n))}
function skillSnapshot(skill){
 const p=loadProgress(),w=p[`world${player?.mundo}`]||{},r=(w.skills||{})[skill]||{};
 return{seen:r.seen||0,mastery:Number.isFinite(r.mastery)?r.mastery:50}
}
function adaptiveBand(skill){
 const r=skillSnapshot(skill);if(r.seen<3)return"baseline";if(r.mastery<42)return"support";if(r.mastery>=75)return"stretch";return"standard"
}
function pickFocusTable(tables){
 const stats=tables.map(table=>({table,...skillSnapshot(`table-${table}`)}));
 if(!stats.some(s=>s.seen>0)||Math.random()>.68)return pick(tables);
 const min=Math.min(...stats.filter(s=>s.seen>0).map(s=>s.mastery));
 const focus=stats.filter(s=>s.seen===0||s.mastery<=min+8).map(s=>s.table);
 return pick(focus.length?focus:tables)
}
function questionSkills(c){return c?.skills?.length?c.skills:[c?.skill||`world${c?.world||player?.mundo}-general`]}
function recordAdaptiveSuccess(){
 if(!current)return;
 const elapsed=clamp(Date.now()-challengeStartedAt,0,120000),attempts=Math.max(1,attemptsThisChallenge),firstTry=attempts===1&&!hintUsedThisChallenge;
 const target={1:12000,2:15000,3:10000,4:12000}[current.world]||12000;
 let delta=firstTry?8:attempts===2?3:-4;if(hintUsedThisChallenge)delta-=4;if(attempts>=3)delta-=2;if(firstTry&&elapsed<=target)delta+=2;if(elapsed>target*2)delta-=1;
 const p=loadProgress(),key=`world${current.world}`;p[key]=p[key]||{};p[key].skills=p[key].skills||{};
 questionSkills(current).forEach(skill=>{
   const r=p[key].skills[skill]||{seen:0,mastery:50,firstTryCorrect:0,totalAttempts:0,hintsUsed:0,totalResponseMs:0,streak:0};
   r.seen=(r.seen||0)+1;r.firstTryCorrect=(r.firstTryCorrect||0)+(firstTry?1:0);r.totalAttempts=(r.totalAttempts||0)+attempts;r.hintsUsed=(r.hintsUsed||0)+(hintUsedThisChallenge?1:0);r.totalResponseMs=(r.totalResponseMs||0)+elapsed;r.streak=firstTry?(r.streak||0)+1:0;r.mastery=clamp((Number.isFinite(r.mastery)?r.mastery:50)+delta,15,100);r.lastPlayedAt=new Date().toISOString();p[key].skills[skill]=r
 });
 const a=p[key].adaptive||{version:ADAPTIVE_VERSION,challenges:0,firstTryCorrect:0,totalAttempts:0,hintsUsed:0,totalResponseMs:0};
 a.version=ADAPTIVE_VERSION;a.challenges=(a.challenges||0)+1;a.firstTryCorrect=(a.firstTryCorrect||0)+(firstTry?1:0);a.totalAttempts=(a.totalAttempts||0)+attempts;a.hintsUsed=(a.hintsUsed||0)+(hintUsedThisChallenge?1:0);a.totalResponseMs=(a.totalResponseMs||0)+elapsed;a.lastPlayedAt=new Date().toISOString();p[key].adaptive=a;
 saveProgress(p);if(firstTry)missionFirstTry++
}
function obj(n,e,removed=false){return Array.from({length:n},(_,i)=>`<span class="obj${removed?" removed":""}" style="animation-delay:${i*35}ms">${e}</span>`).join("")}
function challengeWorld1(){
 const type=pick(["count","add","sub"]),o=pick(objects.slice(0,6)),band=adaptiveBand(type);
 const limit=band==="support"?5:band==="stretch"?10:band==="standard"?8:(player.edad===4?6:10);
 if(type==="count"){const a=ri(1,limit);return{world:1,type,skills:["count"],a,b:0,answer:a,o,maxOption:10,q:`¿Cuántas ${o.n} ves?`,speech:`¿Cuántas ${o.n} ves? Cuenta con calma y toca el número correcto.`}}
 if(type==="add"){const a=ri(1,Math.max(1,limit-1)),b=ri(1,Math.max(1,limit-a));return{world:1,type,skills:["add"],a,b,answer:a+b,o,maxOption:10,q:`${a} + ${b} = ¿cuánto?`,speech:`Tenemos ${a} ${o.n} y llegan ${b} más. ¿Cuántas hay ahora?`}}
 const a=ri(2,Math.max(2,limit)),b=ri(1,a);return{world:1,type,skills:["sub"],a,b,answer:a-b,o,maxOption:10,q:`${a} − ${b} = ¿cuánto?`,speech:`Había ${a} ${o.n} y se fueron ${b}. ¿Cuántas quedan?`}
}
function challengeWorld2(){
 const age=player.edad,type=pick(["add2","sub2","mult","mult"]);
 if(type==="add2"){
   const band=adaptiveBand("add2"),baseline=age===6?49:79,max=band==="support"?(age===6?39:49):band==="stretch"?(age===6?69:89):band==="standard"?(age===6?49:69):baseline;
   const a=ri(10,max),b=ri(10,Math.min(max,99-a));return{world:2,type,skills:["add2"],a,b,answer:a+b,maxOption:99,q:`${a} + ${b} = ¿cuánto?`,speech:`Cruza el río de la suma. ¿Cuánto es ${a} más ${b}?`}
 }
 if(type==="sub2"){
   const band=adaptiveBand("sub2"),baseline=age===6?69:99,max=band==="support"?(age===6?49:69):band==="stretch"?(age===6?89:99):band==="standard"?(age===6?69:89):baseline;
   const a=ri(20,max),b=ri(10,a-1);return{world:2,type,skills:["sub2"],a,b,answer:a-b,maxOption:99,q:`${a} − ${b} = ¿cuánto?`,speech:`Ayuda al explorador. ¿Cuánto es ${a} menos ${b}?`}
 }
 const table=pickFocusTable([1,2,3,5]),skill=`table-${table}`,band=adaptiveBand(skill),factorMin=band==="stretch"?4:(age===6?1:2),factorMax=band==="support"?5:(age===6&&band==="baseline"?6:10),factor=ri(factorMin,Math.max(factorMin,factorMax)),o=pick(objects.slice(6));
 return{world:2,type:"mult",skills:[skill],a:table,b:factor,answer:table*factor,o,maxOption:50,q:`${factor} grupos de ${table} = ¿cuántos?`,speech:`Tenemos ${factor} grupos con ${table} ${o.n} en cada grupo. ¿Cuántos ${o.n} hay en total?`}
}
function challengeWorld3(){
 const table=pickFocusTable([4,6,7,8]),skill=`table-${table}`,band=adaptiveBand(skill),factor=ri(band==="stretch"?4:2,band==="support"?6:10),type=pick(["speed","precision","spatial"]);
 if(type==="speed")return{world:3,type,skills:[skill,"speed"],a:table,b:factor,answer:table*factor,maxOption:80,q:`⚡ ${table} × ${factor} = ¿cuánto?`,speech:`Pulso orbital. ¿Cuánto es ${table} por ${factor}? Responde antes de que termine la energía, pero recuerda: aquí siempre puedes intentarlo de nuevo.`};
 if(type==="precision")return{world:3,type,skills:[skill,"precision"],a:table,b:factor,answer:table*factor,maxOption:80,q:`🎯 Señala el resultado de ${table} × ${factor}`,speech:`Radar de precisión. Encuentra el resultado de ${table} por ${factor}. Mira las opciones con atención.`};
 const missing=Math.random()<.45;
 if(missing)return{world:3,type:"spatial",skills:[skill,"spatial"],mode:"missing",a:table,b:factor,total:table*factor,answer:factor,maxOption:10,q:`🪐 ${table} filas forman ${table*factor} planetas. ¿Cuántas columnas hay?`,speech:`Constelación espacial. Hay ${table} filas y ${table*factor} planetas en total. ¿Cuántas columnas tiene la constelación?`};
 return{world:3,type:"spatial",skills:[skill,"spatial"],mode:"total",a:table,b:factor,answer:table*factor,maxOption:80,q:`🪐 ${table} filas de ${factor} planetas. ¿Cuántos hay?`,speech:`Constelación espacial. Observa ${table} filas con ${factor} planetas en cada fila. ¿Cuántos planetas hay en total?`}
}
function challengeWorld4(){
 const type=pick(["master","master","review","missing","problem"]);
 if(type==="master"){
   const table=pickFocusTable([9,10]),skill=`table-${table}`,band=adaptiveBand(skill),factor=ri(band==="stretch"?5:2,band==="support"?6:10);
   return{world:4,type,skills:[skill],a:table,b:factor,answer:table*factor,maxOption:100,q:`🏆 ${table} × ${factor} = ¿cuánto?`,speech:`Desafío de maestro. ¿Cuánto es ${table} por ${factor}?`}
 }
 if(type==="review"){
   const table=pickFocusTable([1,2,3,4,5,6,7,8,9,10]),skill=`table-${table}`,band=adaptiveBand(skill),factor=ri(band==="stretch"?5:2,band==="support"?6:10);
   return{world:4,type,skills:[skill],a:table,b:factor,answer:table*factor,maxOption:100,q:`🧠 Repaso total: ${table} × ${factor} = ¿cuánto?`,speech:`Repaso de la ciudad. ¿Cuánto es ${table} por ${factor}?`}
 }
 if(type==="missing"){
   const table=pickFocusTable([2,3,4,5,6,7,8,9,10]),skill=`table-${table}`,band=adaptiveBand("factor-missing"),factor=ri(2,band==="support"?6:10),total=table*factor;
   return{world:4,type,skills:[skill,"factor-missing"],a:table,b:factor,total,answer:factor,maxOption:10,q:`🔎 ${table} × ? = ${total}. ¿Qué número falta?`,speech:`Encuentra el factor perdido. ${table} por qué número es igual a ${total}?`}
 }
 const context=pick([
   {icon:"🚌",thing:"autobuses",unit:"niños"},
   {icon:"🏢",thing:"edificios",unit:"ventanas"},
   {icon:"🌳",thing:"parques",unit:"árboles"},
   {icon:"🚲",thing:"estaciones",unit:"bicicletas"}
 ]),band=adaptiveBand("applied"),groups=ri(2,band==="support"?5:8),each=pickFocusTable([3,4,5,6,7,8,9,10]),total=groups*each;
 return{world:4,type:"problem",skills:["applied",`table-${each}`],a:groups,b:each,answer:total,maxOption:80,context,q:`${context.icon} Hay ${groups} ${context.thing} con ${each} ${context.unit} en cada uno. ¿Cuántos ${context.unit} hay en total?`,speech:`Problema de la ciudad. Hay ${groups} ${context.thing} con ${each} ${context.unit} en cada uno. ¿Cuántos ${context.unit} hay en total?`}
}
function challenge(){if(player.mundo===4)return challengeWorld4();if(player.mundo===3)return challengeWorld3();if(player.mundo===2)return challengeWorld2();return challengeWorld1()}
function planetGrid(rows,cols){
 const cells=Array.from({length:rows*cols},(_,i)=>`<span class="planet" style="animation-delay:${i*20}ms">•</span>`).join("");
 return `<div><div class="planet-grid" style="grid-template-columns:repeat(${cols},auto)">${cells}</div><div class="equation-strip">${rows} filas × ${cols} columnas</div></div>`
}
function renderVisual(c){
 const box=$("visual");box.classList.toggle("space",c.world===3);box.classList.toggle("city",c.world===4);
 if(c.world===1){
   if(c.type==="count"){box.innerHTML=obj(c.a,c.o.e);return}
   if(c.type==="add"){box.innerHTML=`<span>${obj(c.a,c.o.e)}</span><span class="symbol">+</span><span>${obj(c.b,c.o.e)}</span>`;return}
   box.innerHTML=`<span>${obj(c.a-c.b,c.o.e)}${obj(c.b,c.o.e,true)}</span>`;return
 }
 if(c.world===2){
   if(c.type==="add2"){const aT=Math.floor(c.a/10),aU=c.a%10,bT=Math.floor(c.b/10),bU=c.b%10;box.innerHTML=`<div><div class="equation-strip">Decenas y unidades</div><div class="group-wrap"><div class="math-group">🔟 × ${aT}<br>• × ${aU}</div><span class="symbol">+</span><div class="math-group">🔟 × ${bT}<br>• × ${bU}</div></div></div>`;return}
   if(c.type==="sub2"){box.innerHTML=`<div><div class="equation-strip">Piensa cuánto falta para llegar de ${c.b} a ${c.a}</div><div class="group-wrap"><div class="math-group">${c.b}</div><span class="symbol">➜</span><div class="math-group">?</div><span class="symbol">➜</span><div class="math-group">${c.a}</div></div></div>`;return}
   const groups=Array.from({length:c.b},()=>`<div class="math-group">${obj(c.a,c.o.e)}</div>`).join(""),repeated=Array.from({length:c.b},()=>c.a).join(" + ");
   box.innerHTML=`<div><div class="group-wrap">${groups}</div><div class="equation-strip">${repeated} = ?</div></div>`;return
 }
 if(c.world===3){
   if(c.type==="spatial"){box.innerHTML=planetGrid(c.a,c.b);return}
   box.innerHTML=`<div><div style="font-size:clamp(3rem,14vw,6rem)">🚀</div><div class="equation-strip">${c.a} × ${c.b} = ?</div></div>`;return
 }
 if(c.type==="problem"){
   box.innerHTML=`<div class="problem-card"><div style="font-size:2.4rem">${c.context.icon}</div>${c.a} ${c.context.thing} × ${c.b} ${c.context.unit} cada uno</div>`;return
 }
 if(c.type==="missing"){
   box.innerHTML=`<div class="city-scene"><div class="building">${c.a}<small>grupos</small></div><span class="symbol">×</span><div class="building">?<small>en cada grupo</small></div><span class="symbol">=</span><div class="building">${c.total}<small>total</small></div></div>`;return
 }
 box.innerHTML=`<div class="city-scene"><div class="building">${c.a}<small>tabla</small></div><span class="symbol">×</span><div class="building">${c.b}<small>factor</small></div><span class="symbol">=</span><div class="building">?<small>resultado</small></div></div>`
}
function optionRange(){if(player.mundo===1)return{min:0,max:10,delta:3};if(player.mundo===4)return{min:0,max:current?.maxOption||100,delta:current?.maxOption===10?3:15};if(player.mundo===3)return{min:0,max:current?.maxOption||80,delta:current?.maxOption===10?3:12};return{min:0,max:current?.maxOption||99,delta:10}}
function options(ans,n=3){
 const {min,max,delta}=optionRange(),s=new Set([ans]);let guard=0;
 while(s.size<n&&guard++<100){const v=Math.max(min,Math.min(max,ans+ri(-delta,delta)));if(v!==ans)s.add(v)}
 for(let i=min;s.size<n&&i<=max;i++)s.add(i);
 return shuffle([...s]).slice(0,n)
}
function renderAnswers(values){
 const box=$("answers");box.innerHTML="";box.classList.toggle("two",values.length===2);
 values.forEach(v=>{const b=document.createElement("button");b.type="button";b.className="answer";b.textContent=v;b.setAttribute("aria-label",`Respuesta ${v}`);b.onclick=()=>choose(v,b);box.appendChild(b)})
}
function update(){const total=totalRounds();$("roundText").textContent=`Reto ${Math.min(round+1,total)} de ${total}`;$("bar").style.width=`${round/total*100}%`;$("starCount").textContent=`⭐ ${stars}`}
function clearTimer(){
 if(timerId){clearInterval(timerId);timerId=null}
 if(timerStartId){clearTimeout(timerStartId);timerStartId=null}
 $("timer").classList.remove("show","low");$("timer").textContent=""
}
function startSpeedTimer(){
 if(locked||player?.mundo!==3||current?.type!=="speed")return;
 timeLeft=15;$("timer").textContent=`⏱️ ${timeLeft}`;$("timer").classList.add("show");
 timerId=setInterval(()=>{
   timeLeft--;$("timer").textContent=`⏱️ ${Math.max(0,timeLeft)}`;$("timer").classList.toggle("low",timeLeft<=5);
   if(timeLeft<=0){clearTimer();$("feedback").textContent="¡Recarga de energía! Te doy una pista para seguir 🚀";speak("¡Recarga de energía! No pasa nada. Te doy una pista para seguir.");hint(true)}
 },1000)
}
function next(){
 if(round>=totalRounds())return finish();
 clearTimer();locked=false;misses=0;current=challenge();challengeStartedAt=Date.now();attemptsThisChallenge=0;hintUsedThisChallenge=false;
 $("gameKicker").textContent=mundos[player.mundo].kicker;$("question").textContent=current.q;$("feedback").textContent="";$("hint").classList.remove("show");$("hint").innerHTML="";
 renderVisual(current);renderAnswers(options(current.answer));update();speak(current.speech);
 if(current.world===3&&current.type==="speed")timerStartId=setTimeout(startSpeedTimer,1800)
}
function choose(v,button){
 if(locked||!current)return;attemptsThisChallenge++;
 if(v===current.answer){
   if(current.world===3&&current.type==="speed"&&timerId&&timeLeft>0)speedHits++;
   recordAdaptiveSuccess();clearTimer();locked=true;button.classList.add("good");stars++;const m=pick(good);$("feedback").textContent=m;$("starCount").textContent=`⭐ ${stars}`;speak(`${m} La respuesta es ${current.answer}.`);round++;$("bar").style.width=`${round/totalRounds()*100}%`;setTimeout(next,1050);return
 }
 misses++;const m=pick(gentle);$("feedback").textContent=m;speak(m);
 if(button.animate)button.animate([{transform:"translateX(0)"},{transform:"translateX(-7px)"},{transform:"translateX(7px)"},{transform:"translateX(0)"}],{duration:280});
 if(misses>=2)hint(false)
}
function hintWorld1(){
 const a=current.answer,nums=Array.from({length:a},(_,i)=>`<span>${i+1}</span>`).join("");
 $("hint").innerHTML=`<div>💡 ${a===0?"No queda ningún objeto. Cuando no queda ninguno usamos el número cero.":"Vamos a contar juntos, despacito."}</div>${a>0?`<div class="hint-count">${nums}</div>`:""}`;
 return a>0?`Aquí tienes una pista. Contemos: ${Array.from({length:a},(_,i)=>i+1).join(", ")}. Ahora elige entre dos opciones.`:"Aquí tienes una pista. No queda ninguno. La respuesta puede ser cero."
}
function hintWorld2(){
 if(current.type==="mult"){const repeated=Array.from({length:current.b},()=>current.a).join(" + ");$("hint").innerHTML=`<div>💡 Multiplicar también es sumar el mismo número varias veces.</div><div class="hint-count"><span>${repeated}</span><span>=</span><span>${current.answer}</span></div>`;return`Pista: suma ${current.a}, ${current.b} veces. ${repeated}.`}
 const tensA=Math.floor(current.a/10),onesA=current.a%10,tensB=Math.floor(current.b/10),onesB=current.b%10;
 if(current.type==="add2"){$("hint").innerHTML=`<div>💡 Separa decenas y unidades.</div><div class="hint-count"><span>${tensA*10}</span><span>+</span><span>${onesA}</span><span>y</span><span>${tensB*10}</span><span>+</span><span>${onesB}</span></div>`;return`Pista: separa ${current.a} y ${current.b} en decenas y unidades. Luego suma las partes.`}
 const step=Math.ceil(current.b/10)*10;$("hint").innerHTML=`<div>💡 Busca el salto desde ${current.b} hasta ${current.a}.</div><div class="hint-count"><span>${current.b}</span><span>➜</span><span>${Math.min(step,current.a)}</span><span>➜</span><span>${current.a}</span></div>`;return`Pista: piensa cuánto debes avanzar desde ${current.b} para llegar a ${current.a}.`
}
function hintWorld3(){
 clearTimer();
 if(current.type==="spatial"){
   if(current.mode==="missing"){$("hint").innerHTML=`<div>💡 Mira la constelación por filas y columnas.</div><div class="hint-count"><span>${current.a}</span><span>×</span><span>${current.answer}</span><span>=</span><span>${current.total}</span></div>`;return`Pista espacial: ${current.a} filas por ${current.answer} columnas forman ${current.total} planetas.`}
   $("hint").innerHTML=`<div>💡 Multiplica filas por columnas.</div><div class="hint-count"><span>${current.a}</span><span>×</span><span>${current.b}</span><span>=</span><span>${current.answer}</span></div>`;return`Pista espacial: ${current.a} filas por ${current.b} columnas forman ${current.answer} planetas.`
 }
 const repeated=Array.from({length:current.b},()=>current.a).join(" + ");
 $("hint").innerHTML=`<div>💡 Puedes transformar la multiplicación en una suma repetida.</div><div class="hint-count"><span>${repeated}</span><span>=</span><span>${current.answer}</span></div>`;
 return`Pista galáctica: suma ${current.a}, ${current.b} veces. El resultado es ${current.answer}.`
}
function hintWorld4(){
 if(current.type==="missing"){
   $("hint").innerHTML=`<div>💡 Busca cuántas veces cabe ${current.a} dentro de ${current.total}.</div><div class="hint-count"><span>${current.total}</span><span>÷</span><span>${current.a}</span><span>=</span><span>${current.answer}</span></div>`;
   return`Pista de maestro: divide ${current.total} entre ${current.a}. El factor que falta es ${current.answer}.`
 }
 if(current.type==="problem"){
   const repeated=Array.from({length:current.a},()=>current.b).join(" + ");
   $("hint").innerHTML=`<div>💡 Convierte el problema en grupos iguales.</div><div class="hint-count"><span>${repeated}</span><span>=</span><span>${current.answer}</span></div>`;
   return`Pista: tienes ${current.a} grupos de ${current.b}. Puedes sumar ${current.b}, ${current.a} veces.`
 }
 if(current.a===9){
   $("hint").innerHTML=`<div>💡 Truco del 9: multiplica por 10 y luego resta una vez el factor.</div><div class="hint-count"><span>10 × ${current.b}</span><span>−</span><span>${current.b}</span><span>=</span><span>${current.answer}</span></div>`;
   return`Pista del nueve: diez por ${current.b} son ${10*current.b}; resta ${current.b} y obtienes ${current.answer}.`
 }
 if(current.a===10){
   $("hint").innerHTML=`<div>💡 En la tabla del 10, agrega un cero al factor.</div><div class="hint-count"><span>${current.b}</span><span>→</span><span>${current.answer}</span></div>`;
   return`Pista del diez: agrega un cero a ${current.b}. Obtienes ${current.answer}.`
 }
 const repeated=Array.from({length:current.b},()=>current.a).join(" + ");
 $("hint").innerHTML=`<div>💡 Recuerda: multiplicar es formar grupos iguales.</div><div class="hint-count"><span>${repeated}</span><span>=</span><span>${current.answer}</span></div>`;
 return`Pista de repaso: suma ${current.a}, ${current.b} veces.`
}
function hint(auto=false){
 if(!current||$("hint").classList.contains("show"))return;
 hintUsedThisChallenge=true;hints++;const text=player.mundo===4?hintWorld4():player.mundo===3?hintWorld3():player.mundo===2?hintWorld2():hintWorld1();$("hint").classList.add("show");
 let other=options(current.answer).find(v=>v!==current.answer);if(other===undefined)other=Math.max(0,current.answer-1);
 renderAnswers(shuffle([current.answer,other]));speak(`${text} Ahora tienes solo dos opciones.`);
 if(auto)misses=Math.max(misses,2)
}
function startGame(){
 clearTimer();round=0;stars=0;hints=0;misses=0;locked=false;speedHits=0;missionFirstTry=0;show("game");const w=mundos[player.mundo];speak(`¡Vamos, ${player.nombre}! Comienza tu misión en ${w.name}.`);setTimeout(next,650)
}
function finish(){
 clearTimer();const key=`world${player.mundo}`;let p=loadProgress();
 p[key]=p[key]||{missionsCompleted:0,bestStars:0,hintsUsed:0};
 p[key].missionsCompleted=(p[key].missionsCompleted||0)+1;p[key].bestStars=Math.max(p[key].bestStars||0,stars);p[key].bestFirstTry=Math.max(p[key].bestFirstTry||0,missionFirstTry);p[key].firstTryTotal=(p[key].firstTryTotal||0)+missionFirstTry;p[key].hintsUsed=(p[key].hintsUsed||0)+hints;p[key].lastPlayedAt=new Date().toISOString();
 if(player.mundo===3)p[key].speedHits=(p[key].speedHits||0)+speedHits;
 if(player.mundo===4&&missionFirstTry===totalRounds()&&hints===0)p[key].perfectMissions=(p[key].perfectMissions||0)+1;
 saveProgress(p);
 $("correctStat").textContent=stars;$("hintStat").textContent=hints;
 const mascot={1:"🦊🏆",2:"🐒🏆",3:"🚀🏆",4:"🏙️🏆"}[player.mundo]||"🏆";$("completeMascot").textContent=mascot;
 const place={1:"el Valle de los Números",2:"la Selva Matemática",3:"la Galaxia de las Tablas",4:"la Ciudad de los Maestros"}[player.mundo]||"tu mundo";
 const speedText=player.mundo===3&&speedHits?` Activaste ${speedHits} pulso${speedHits===1?"":"s"} de velocidad.`:"";
 const firstTryText=` Resolviste ${missionFirstTry} de ${totalRounds()} retos al primer intento.`;
 const masteryText=player.mundo===4?(missionFirstTry===totalRounds()&&hints===0?" ¡Medalla de Maestría Perfecta! 🥇":missionFirstTry>=Math.ceil(totalRounds()*.75)?" ¡Ganaste la Medalla de Maestro Matemático! 🏅":" Seguiste construyendo tu maestría matemática. 🌟"):"";
 $("completeMessage").textContent=`¡${player.nombre}, completaste tu recorrido por ${place}! Cada intento hizo crecer tu poder matemático.${firstTryText}${speedText}${masteryText}`;
 show("complete");speak(`¡Misión completada, ${player.nombre}! Lograste ${stars} retos.${firstTryText}${speedText}${masteryText} ¡Excelente aventura matemática!`)
}
$("playerForm").onsubmit=e=>{e.preventDefault();const nombre=$("nombre").value.trim(),edad=Number($("edad").value);if(!nombre||!edad)return;player={nombre,edad,mundo:mundo(edad),creadoEn:new Date().toISOString()};save(PLAYER_KEY,player);configureWorld();show("world");const w=mundos[player.mundo];speak(`¡Excelente, ${nombre}! Tu aventura comienza en ${w.name}. ${w.desc}`)};
$("listenWelcome").onclick=welcome;
$("enterWorld").onclick=()=>{if(player&&player.mundo<=4)startGame()};
$("changePlayer").onclick=()=>{clearTimer();player=null;try{localStorage.removeItem(PLAYER_KEY)}catch{}$("nombre").value="";$("edad").value="";show("setup");setTimeout(welcome,200)};
$("home").onclick=()=>{clearTimer();if("speechSynthesis" in window)window.speechSynthesis.cancel();configureWorld();show("world")};
$("repeat").onclick=()=>speak(current?.speech);
$("again").onclick=startGame;
$("backWorld").onclick=()=>{clearTimer();configureWorld();show("world")};
if(player?.nombre&&player?.edad&&player?.mundo){$("nombre").value=player.nombre;$("edad").value=String(player.edad);configureWorld();show("world")}else show("setup");
})();
