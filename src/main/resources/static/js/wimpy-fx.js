(()=>{let muted=false,ctx;const K='wk-mute';try{muted=localStorage.getItem(K)==='1'}catch(e){}
const ac=()=>ctx||(ctx=new(window.AudioContext||window.webkitAudioContext)());
function noise(d,f0,f1,v){const c=ac(),n=c.sampleRate*d,b=c.createBuffer(1,n,c.sampleRate),a=b.getChannelData(0);for(let i=0;i<n;i++)a[i]=(Math.random()*2-1)*(1-i/n);const s=c.createBufferSource();s.buffer=b;const f=c.createBiquadFilter();f.type='bandpass';f.frequency.setValueAtTime(f0,c.currentTime);f.frequency.exponentialRampToValueAtTime(f1,c.currentTime+d);const g=c.createGain();g.gain.value=v;s.connect(f).connect(g).connect(c.destination);s.start()}
function tone(f,d,t,v,e){const c=ac(),o=c.createOscillator(),g=c.createGain();o.type=t;o.frequency.setValueAtTime(f,c.currentTime);o.frequency.exponentialRampToValueAtTime(e,c.currentTime+d);g.gain.setValueAtTime(v,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+d);o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+d)}
const sfx={flip:()=>noise(.35,900,3500,.5),open:()=>{tone(110,.3,'sine',.5,50);noise(.7,300,1400,.35)},scratch:()=>noise(.12,2500,4500,.1)};
const play=n=>{if(muted||(n==='scratch'&&!ctx))return;try{ac().resume();sfx[n]()}catch(e){}};
document.addEventListener('click',e=>{const t=e.target;if(t.closest('#bookCover'))play('open');else if(t.closest('.member-link,.book-controls button,[data-page-target],.bookmark,.page-nav a'))play('flip')},true);
document.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight')play('flip')});
let last=0;document.addEventListener('mouseover',e=>{if(e.target.closest&&e.target.closest('.member-link')&&Date.now()-last>250){last=Date.now();play('scratch')}});
addEventListener('DOMContentLoaded',()=>{const b=document.body,add=(c,h)=>{const d=document.createElement('div');d.className='fx '+c;d.setAttribute('aria-hidden','true');d.innerHTML=h||'';b.appendChild(d)};
add('plane',"<svg viewBox='0 0 70 40' fill='#fffef6' stroke='#17202b' stroke-width='2' stroke-linejoin='round'><path d='M2 20L68 3 40 37 32 24z'/><path d='M32 24L68 3' /></svg>");
add('sticky','TO DO:<br>• nothing<br>• panic<br>• snack');add('cheese');add('ball');
const t=document.createElement('button');t.className='sound-toggle';t.type='button';const r=()=>{t.textContent=muted?'🔇':'🔊';t.setAttribute('aria-pressed',String(!muted));t.title=muted?'Sound off':'Sound on'};r();
t.onclick=()=>{muted=!muted;try{localStorage.setItem(K,muted?'1':'0')}catch(e){}r();play('flip')};b.appendChild(t);const s=document.querySelector('.book-scene');if(s){const m=document.createElement('div');m.className='mat';m.setAttribute('aria-hidden','true');document.querySelectorAll('.fx.sticky,.fx.cheese,.fx.ball').forEach(x=>m.appendChild(x));s.prepend(m)}})})();
