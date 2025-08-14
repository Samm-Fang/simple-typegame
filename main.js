/* TypeGame 重构版：顺序输入 + Roguelike + 滚轮表盘 */
(function(){
	"use strict";

	// DOM
	const startBtn = document.getElementById('startBtn');
	const resetBtn = document.getElementById('resetBtn');
	const progressEl = document.getElementById('progress');
	const wpmEl = document.getElementById('wpm');
	const accuracyEl = document.getElementById('accuracy');
	const streakEl = document.getElementById('streak');
	const currencyEl = document.getElementById('currency');
	const wordSourceStatus = document.getElementById('wordSourceStatus');
	const mdInput = document.getElementById('mdFile');
	const mdDropZone = document.getElementById('mdDropZone');
	const retryMdBtn = document.getElementById('retryMdBtn');
	const mdStatusText = document.getElementById('mdStatusText');
	const overlay = document.getElementById('overlay');
	const hiddenInput = document.getElementById('hiddenInput');
	const dialTrack = document.getElementById('dialTrack');
	const focusWord = document.getElementById('focusWord');
	const focusTrans = document.getElementById('focusTrans');
	const currentBufferEl = document.getElementById('currentBuffer');
	const autocompleteEl = document.getElementById('autocomplete');
	const fallingWordsContainer = document.getElementById('fallingWordsContainer');

	// Basic utils
	const now = ()=> performance.now();
	const clamp = (n, a, b)=> Math.max(a, Math.min(b, n));
	function showToast(text){
		const box = document.getElementById('toastContainer');
		const el = document.createElement('div');
		el.className = 'toast'; el.textContent = text; box.appendChild(el);
		setTimeout(()=>{ el.style.opacity='0'; setTimeout(()=>el.remove(), 260); }, 2200);
	}
	function setRootLightMode(isLight){ const r=document.documentElement; isLight? r.classList.add('light'): r.classList.remove('light'); }
	function shuffle(array){ for(let i=array.length-1; i>0; i--){ const j=Math.floor(Math.random()*(i+1)); [array[i],array[j]]=[array[j],array[i]]; } return array; }

	// Settings
	const settingsKey='typegame:settings:v3';
	const lastSourceKey='typegame:lastSource';
	const soundToggle = document.getElementById('soundToggle');
	const darkToggle = document.getElementById('darkToggle');
	function loadSettings(){
		try{ const s=JSON.parse(localStorage.getItem(settingsKey)||'{}');
			soundToggle.checked = s.sound ?? true;
			darkToggle.checked = !(s.light ?? false);
			setRootLightMode(!darkToggle.checked);
		}catch(_){ soundToggle.checked=true; darkToggle.checked=true; setRootLightMode(false); }
	}
	function saveSettings(){ localStorage.setItem(settingsKey, JSON.stringify({ sound: soundToggle.checked, light: !darkToggle.checked })); setRootLightMode(!darkToggle.checked); }
	soundToggle.addEventListener('change', saveSettings);
	darkToggle.addEventListener('change', saveSettings);
	loadSettings();

	// Audio
	const audioCtx = (window.AudioContext||window.webkitAudioContext) ? new (window.AudioContext||window.webkitAudioContext)() : null;
	function beep(freq=720, ms=40, type='sine', gain=0.02){ if(!soundToggle.checked||!audioCtx) return; const o=audioCtx.createOscillator(), g=audioCtx.createGain(); o.type=type; o.frequency.value=freq; g.gain.value=gain; o.connect(g); g.connect(audioCtx.destination); const t=audioCtx.currentTime; o.start(t); o.stop(t+ms/1000); }

	// Data
	const defaultJsonName='高考核心词汇.json';
	let sequence=[]; // {word, trans}[]
	const fallbackList=[
		{word:'ability', trans:'能力'},
		{word:'absence', trans:'缺席'},
		{word:'absorb', trans:'吸收'},
		{word:'abstract', trans:'摘要/抽象的'},
		{word:'academic', trans:'学术的'},
		{word:'access', trans:'进入; 使用权'},
		{word:'account', trans:'账户; 解释'},
		{word:'accurate', trans:'准确的'},
	];


	const bossWords = [
		{ word: 'supercalifragilisticexpialidocious', trans: '超凡脱俗' },
		{ word: 'pneumonoultramicroscopicsilicovolcanoconiosis', trans: '肺尘病' },
		{ word: 'hippopotomonstrosesquippedaliophobia', trans: '长单词恐惧症' },
		{ word: 'floccinaucinihilipilification', trans: '轻蔑，不屑一顾' },
		{ word: 'antidisestablishmentarianism', trans: '反国教废除主义' },
		{ word: 'honorificabilitudinitatibus', trans: '可敬性' },
		{ word: 'encephalomyeloradiculoneuritis', trans: '脑脊髓神经根炎' },
		{ word: 'otorhinolaryngological', trans: '耳鼻喉科的' },
		{ word: 'psychoneuroimmunology', trans: '精神神经免疫学' },
		{ word: 'disproportionableness', trans: '不成比例性' },
		{ word: 'incomprehensibilities', trans: '费解的事物；难以理解的事物' },
		{ word: 'deinstitutionalization', trans: '非机构化；去制度化' },
		{ word: 'electroencephalograph', trans: '脑电图仪' },
		{ word: 'psychophysicotherapeutics', trans: '心理物理疗法' },
		{ word: 'spectrophotofluorometrically', trans: '分光荧光测定法地' },
		{ word: 'unparliamentarianism', trans: '违反议会规程' },
		{ word: 'interconnectedness', trans: '相互关联性' },
		{ word: 'internationalization', trans: '国际化' },
		{ word: 'individualization', trans: '个性化' },
		{ word: 'conceptualization', trans: '概念化' },
		{ word: 'commercialization', trans: '商业化' },
		{ word: 'disestablishmentarianism', trans: '国教废除主义' },
		{ word: 'crystallization', trans: '结晶；具体化' },
		{ word: 'responsibilities', trans: '责任；职责' },
		{ word: 'unquestionability', trans: '不容置疑性' },
		{ word: 'unconventionality', trans: '非传统性' },
		{ word: 'simultaneously', trans: '同时地' },
		{ word: 'transformation', trans: '转变；变形' },
		{ word: 'communication', trans: '沟通；交流' },
		{ word: 'documentation', trans: '文档；文件' },
		{ word: 'understanding', trans: '理解；谅解' },
		{ word: 'characteristic', trans: '特有的；典型的' },
		{ word: 'overgeneralization', trans: '过度概括' },
		{ word: 'misinterpretation', trans: '误解' },
		{ word: 'institutionalization', trans: '制度化；机构化' },
		{ word: 'conscientiousness', trans: '认真；尽责' },
		{ word: 'interchangeably', trans: '可互换地' },
		{ word: 'decentralization', trans: '分权；去中心化' },
		{ word: 'comprehensively', trans: '全面地' },
		{ word: 'extraordinary', trans: '非凡的' },
		{ word: 'unpredictability', 'trans': '不可预测性' },
		{ word: 'reconceptualize', trans: '重新概念化' },
		{ word: 'inadmissibility', trans: '不容许；不合格' },
		{ word: 'multidisciplinary', trans: '多学科的' },
		{ word: 'counterrevolutionary', trans: '反革命的' },
		{ word: 'unsubstantiated', trans: '未经证实的' },
		{ word: 'reestablishment', trans: '重建；复兴' },
		{ word: 'anthropological', trans: '人类学的' },
		{ word: 'epistemologically', trans: '认识论地' },
		{ word: 'neurophysiological', trans: '神经生理学的' },
		{ word: 'parliamentarianism', trans: '议会制度主义' }
	  ];

	// Parsing
	function fromMarkdown(text){
		const seq=[]; const lines=text.split(/\r?\n/);
		const table=/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/;
		const pair=/^([A-Za-z][A-Za-z\-']{1,})\s*[—\-:：]\s*(.+)$/;
		const pos = /^([A-Za-z][A-Za-z\-']{1,})\s+[a-z]\.[\u4e00-\u9fa5\w，,；;、\.\s]+$/i;
		for(const raw of lines){ const line=raw.trim(); if(!line||/^#|^>|^```/.test(line)) continue; let m=line.match(table); if(m){ seq.push({word:m[1].trim().toLowerCase(), trans:m[2].trim()}); continue;} m=line.match(pair); if(m){ seq.push({word:m[1].trim().toLowerCase(), trans:m[2].trim()}); continue;} m=line.match(pos); if(m){ const en=line.split(/\s+/)[0].toLowerCase(); const zh=line.slice(en.length).replace(/^[^\u4e00-\u9fa5]+/,'').trim(); seq.push({word:en, trans:zh}); continue;} const solo=line.match(/^([A-Za-z][A-Za-z\-']{1,})$/); if(solo){ seq.push({word:solo[1].toLowerCase(), trans:''}); } }
		return seq;
	}
	function fromJson(obj){
		if(Array.isArray(obj)){
			return obj.map(it=>({ word:String(it.word||it.en||'').toLowerCase(), trans:String(it.definition||it.trans||it.cn||it.zh||'') })).filter(it=>it.word);
		}
		if(obj && typeof obj==='object'){
			if(Array.isArray(obj.words)) return fromJson(obj.words);
			return Object.keys(obj).map(k=>({ word:k.toLowerCase(), trans:String(obj[k]||'') }));
		}
		return [];
	}
	function parseJsonSmart(text){
		try{ const parsed=JSON.parse(text); return fromJson(parsed); }catch(_){ /* fallthrough */ }
		// 兼容“多行对象 + 空行分隔”格式：提取所有 {...} 块逐个解析
		const blocks = text.match(/\{[\s\S]*?\}/g) || [];
		const items=[];
		for(const b of blocks){
			try{ const obj=JSON.parse(b); items.push(obj); }catch(_){ /* 跳过不合法块 */ }
		}
		if(items.length>0){
			return items.map(obj=>({ word:String(obj.word||obj.en||'').toLowerCase(), trans:String(obj.definition||obj.trans||obj.cn||obj.zh||'') })).filter(it=>it.word);
		}
		return [];
	}

	function cacheSequenceSafe(seq){
		try{
			const full = { ts: Date.now(), words: seq };
			localStorage.setItem(lastSourceKey, JSON.stringify(full));
		}catch(_){ /* ignore quota exceeded */ }
	}

	async function tryLoadDefault(){
		mdStatusText.textContent='尝试加载 '+defaultJsonName;
		let seq=null;
		try{ const res=await fetch('./'+encodeURI(defaultJsonName), {cache:'no-store'}); if(res.ok){ const text=await res.text(); seq=parseJsonSmart(text); } }
		catch(_){ seq=null }
		if(!seq || seq.length===0){
			// 尝试读取上一次用户导入的内容
			try{ const cache=localStorage.getItem(lastSourceKey); if(cache){ const parsed=JSON.parse(cache); seq=fromJson(parsed); } }catch(_){ }
		}
		if(!seq || seq.length===0){
			seq = fallbackList;
			wordSourceStatus.textContent='词库：使用内置最小词库';
		}else if(!wordSourceStatus.textContent){
			wordSourceStatus.textContent=`词库：高考核心词汇 共 ${seq.length} 词`;
		}
		applySequence(seq);
		game.start(); // 自动开始游戏
	}

	function applySequence(seq){ sequence=shuffle(seq); game.reset(); buildDial(); game.updateHUD(); }

	// Dial (3D perspective + cubic path)
	function buildDial(){ if(!dialTrack) return; dialTrack.innerHTML=''; dialTrack.style.perspective='1200px'; const count = game.state.upgrades.doubleVision ? 21 : 11; for(let i=0;i<count;i++){ const el=document.createElement('div'); el.className='dial-item'; el.innerHTML=`<div class="dial-word"><span class="mono"></span></div><div class="dial-trans"></div><div class="dial-dot"></div>`; dialTrack.appendChild(el);} updateDial(); }
	function curve(t){ // cubic easing for spacing
		// map t[0,1] to s shaped spacing
		return t*t*(3-2*t);
	}
	function updateDial(){
		if(!dialTrack) return; const show=dialTrack.children.length, mid=(show/2)|0; const len=sequence.length;
		const isDouble = game.state.upgrades.doubleVision;
		const spread= isDouble ? Math.PI*1.2 : Math.PI*0.8; // 216° vs 144°
		const rx= isDouble ? 680 : 480, ry=160, rz=120; // ellipse radii
		for(let i=0;i<show;i++){
			const el=dialTrack.children[i]; const off=i-mid; const t=curve((off+mid)/(show-1));
			let ang= -spread/2 + t*spread;
			// 重力反转事件
			if (game.state.eventActive && game.state.eventActive.name === "重力反转" && game.state.eventActive.duration > 0) {
				ang = spread/2 - t*spread; // 反转角度
			}
			const x=Math.sin(ang)*rx; const y=Math.cos(ang)*ry; const z=(1-Math.cos(ang))*rz; const scale=0.8 + (1-Math.abs(off)/mid)*0.22; el.style.transform=`translateX(-50%) translate3d(${x}px, ${y}px, ${-z}px) rotateY(${ang*0.15}rad) scale(${scale})`; el.style.zIndex=String(100+(mid-Math.abs(off))); const idxRaw=game.state.index+off; if(idxRaw<0||idxRaw>=len){ el.style.opacity='0'; el.classList.toggle('center', i===mid); continue;} el.style.opacity=String(0.35+(1-Math.abs(off)/mid)*0.65); el.classList.toggle('center', i===mid); const item=sequence[idxRaw]; const wordEl = el.querySelector('.dial-word'); wordEl.querySelector('.mono').textContent=item?item.word:'';
			// 透视升级：能看到更远的单词的词义
			if (game.state.upgrades.xrayVision) {
				el.querySelector('.dial-trans').textContent=item?(item.trans||''):'';
			} else {
				el.querySelector('.dial-trans').textContent=item && i === mid ? (item.trans||'') : '';
			}
			if (game.state.eventActive && game.state.eventActive.name === "词汇风暴" && off >= 0 && off < game.state.eventActive.duration) { wordEl.classList.add('storm'); } else { wordEl.classList.remove('storm'); } if (i === mid && game.state.isBoss) { wordEl.classList.add('boss'); } else { wordEl.classList.remove('boss'); } }
		const cur=game.item(); focusWord.textContent=cur?cur.word:''; focusTrans.textContent=cur?(cur.trans||'暂无释义'):''; renderBuffer(); }

	function renderBuffer(){
		const cur=game.item();
		if(!cur){ currentBufferEl.textContent=''; return; }
		const exp = game.state.upgrades.lenientCase? cur.word.toLowerCase().replace(/[-_]/g,''): cur.word;
		const raw = game.state.upgrades.lenientCase? game.state.buffer.toLowerCase().replace(/[-_]/g,''): game.state.buffer;
		let i=0;
		while(i<raw.length && i<exp.length && raw[i]===exp[i]) i++;
		
		let ok = raw.slice(0,i);
		let bad = raw.slice(i);
		let rest = exp.slice(game.state.upgrades.hintAlways ? raw.length : i);

		// 隐藏输入事件
		if (game.state.eventActive && game.state.eventActive.name === "隐藏输入" && game.state.eventActive.duration > 0) {
			ok = ok.replace(/./g, '•'); // 替换为圆点
			bad = bad.replace(/./g, '•'); // 替换为圆点
		}

		// 词义风暴事件：只显示词义，不显示单词本身
		if (game.state.eventActive && game.state.eventActive.name === "词义风暴" && game.state.eventActive.duration > 0) {
			focusWord.textContent = cur.trans || '暂无释义'; // 显示词义
			currentBufferEl.innerHTML = `<span class="ok mono">${ok}</span><span class="bad mono">${bad}</span>`; // 不显示 rest
			return;
		}

		currentBufferEl.innerHTML=`<span class="ok mono">${ok}</span><span class="bad mono">${bad}</span><span class="rest mono">${rest}</span>`;
	}

	const randomEvents = [
		{ name: "词汇风暴", description: "接下来5个单词的长度翻倍！", effect: () => {
			game.state.eventActive = { name: "词汇风暴", duration: 5 };
			showToast("词汇风暴来袭！");
			updateDial();
		}},
		{ name: "时间扭曲", description: "游戏速度加快20%！", effect: () => {
			document.body.style.setProperty('--game-speed', '0.8');
			showToast("时间扭曲！");
			setTimeout(() => document.body.style.removeProperty('--game-speed'), 10000);
		}},
		{ name: "幸运时刻", description: "立即获得一个失误护盾！", effect: () => {
			game.state.upgrades.mistakeShield++;
			showToast("天降好运！");
			game.updateHUD();
		}},
		{ name: "模糊挑战", description: "单词和输入引导变得模糊！", effect: () => {
			focusWord.classList.add('blurred');
			currentBufferEl.classList.add('blurred'); // 给输入引导也添加模糊
			setTimeout(() => {
				focusWord.classList.remove('blurred');
				currentBufferEl.classList.remove('blurred');
			}, 3000);
		}},
		{ name: "记忆挑战", description: "单词只显示2秒！", effect: () => {
			const word = focusWord.textContent;
			focusWord.textContent = '';
			setTimeout(() => focusWord.textContent = word, 2000);
		}},
		{ name: "加速", description: "WPM 加速！", effect: () => {
			game.state.eventActive = { name: "加速", duration: 10 };
			showToast("WPM 加速！");
		}},
		{ name: "镜像世界", description: "镜像世界！", effect: () => {
			game.state.eventActive = { name: "镜像世界", duration: 10 };
			showToast("镜像世界！");
		}},
		{ name: "双倍奖励", description: "双倍奖励！", effect: () => {
			game.state.eventActive = { name: "双倍奖励", duration: 10 };
			showToast("双倍奖励！");
		}},
		// 新增随机事件
		{ name: "单词缩短", description: "接下来5个单词的长度减半！", effect: () => {
			game.state.eventActive = { name: "单词缩短", duration: 5 };
			showToast("单词缩短！");
			updateDial();
		}},
		{ name: "词义风暴", description: "只显示词义，需要输入对应的单词！", effect: () => {
			game.state.eventActive = { name: "词义风暴", duration: 5 };
			showToast("词义风暴！");
			updateDial();
		}},
		{ name: "重力反转", description: "滚轮反向滚动！", effect: () => {
			game.state.eventActive = { name: "重力反转", duration: 10 };
			showToast("重力反转！");
			// 这里需要修改 updateDial 中的 transform 逻辑，或者添加一个 CSS class
			// 暂时只显示提示，后续再实现视觉效果
		}},
		{ name: "隐藏输入", description: "输入的字符不可见！", effect: () => {
			game.state.eventActive = { name: "隐藏输入", duration: 5 };
			showToast("隐藏输入！");
			// 这里需要修改 renderBuffer 中的 ok/bad/rest 的显示逻辑
			// 暂时只显示提示，后续再实现视觉效果
		}},
	];

	function triggerRandomEvent() {
		if(Math.random() < 0.25) { // 25% chance
			const event = randomEvents[Math.floor(Math.random() * randomEvents.length)];
			event.effect();
			// 添加全屏视觉提示
			const effectEl = document.createElement('div');
			effectEl.className = 'event-active-effect';
			document.body.appendChild(effectEl);
			setTimeout(() => {
				effectEl.remove();
			}, 1500);
		}
	}

	// Game core (unchanged except calling buildDial)
	const game=(function(){
		const state={ running:false, startedAt:0, correct:0, total:0, streak:0, maxStreak:0, index:0, buffer:'', currency: 0, upgrades:{autoComplete:false,autoCompletePro:false,lenientCase:false,mistakeShield:0,mistakeShieldPro:false,hintAlways:false,hintCorrection:false,bonusCombo:false,bonusComboPro:false,slowMotion:false,slowMotionPro:false,doubleVision:false,xrayVision:false,wordSkip:false,freeSkip:false,spellCorrection:false, curseOfPoverty: false}, phase:15, nextUp:15, eventActive: null, autocomplete: { suggestions: [], selected: 0 }, isBoss: false, fallingWord: {word: null, buffer: ''} };
		function reset(){ Object.assign(state,{ running:false, startedAt:0, correct:0, total:0, streak:0, maxStreak:0, index:0, buffer:'', currency: 0, upgrades:{autoComplete:false,lenientCase:false,mistakeShield:0,hintAlways:false,bonusCombo:false,slowMotion:false,doubleVision:false,wordSkip:false, curseOfPoverty: false}, phase:15, nextUp:15, eventActive: null, autocomplete: { suggestions: [], selected: 0 }, isBoss: false, fallingWord: {word: null, buffer: ''} }); overlay.style.display='flex'; resetBtn.disabled=sequence.length===0; startBtn.disabled=sequence.length===0; currentBufferEl.textContent=''; updateAutocomplete(); }
		function start(){ if(sequence.length===0) {showToast('请导入词库'); return;} state.running=true; state.startedAt=now(); overlay.style.display='none'; resetBtn.disabled=false; startBtn.disabled=true; hiddenInput.focus(); try{ if(audioCtx&&audioCtx.state==='suspended') audioCtx.resume(); }catch(_){} buildDial(); updateHUD(); }
		function item(){
			const originalItem = sequence[state.index]||null;
			if (!originalItem) return null;

			let word = originalItem.word;
			let trans = originalItem.trans;

			if (state.eventActive && state.eventActive.duration > 0) {
				switch (state.eventActive.name) {
					case "词汇风暴":
						word = originalItem.word + originalItem.word;
						break;
					case "镜像世界":
						word = originalItem.word.split('').reverse().join('');
						break;
					case "单词缩短":
						word = originalItem.word.slice(0, Math.ceil(originalItem.word.length / 2));
						break;
					case "词义风暴":
						// 单词不为空，但会在 renderBuffer 中隐藏
						break;
				}
			}
			return { word, trans };
		}
		function norm(s){ return state.upgrades.lenientCase? s.toLowerCase().replace(/[-_]/g,''): s; }
		function type(ch){
			if(!state.running) return;
			if(!/^[a-zA-Z\-']$/.test(ch)) return;
			
			const cur=item();
			if(!cur){finish(); return;}
			const exp=norm(cur.word);
			const potentialBuffer = state.buffer + ch;
			const potentialGot = norm(potentialBuffer);

			if(exp.startsWith(potentialGot)){
				state.total++; // 只有正确输入才增加 total
				state.buffer += ch;
				updateAutocomplete();
				beep(1200, 20, 'sine', 0.01);
				if(potentialGot===exp || (game.state.eventActive && game.state.eventActive.name === "词义风暴" && game.state.eventActive.duration > 0 && potentialGot.length === exp.length)){
					state.correct+=state.buffer.length;
					if (state.eventActive && state.eventActive.name === "加速" && state.eventActive.duration > 0) { state.correct+=state.buffer.length; }
					state.streak=Math.min(999,state.streak+1);
					if (state.eventActive && state.eventActive.name === "双倍奖励" && state.eventActive.duration > 0) { state.streak++; }
					state.maxStreak=Math.max(state.maxStreak,state.streak);
					let currencyGain = cur.word.length;
					if (game.state.upgrades.curseOfPoverty) {
						currencyGain = Math.floor(currencyGain * 0.8);
					}
					if (game.state.upgrades.greed && Math.random() < 0.1) {
						currencyGain *= 2;
						showToast('贪婪！货币双倍！');
					}
					state.currency += currencyGain; // 获得货币
					
					// 护盾获取逻辑
					if(game.state.upgrades.mistakeShield && state.streak > 0 && state.streak % (state.upgrades.mistakeShieldPro ? 10 : 20) === 0) {
						game.state.upgrades.mistakeShield += (state.upgrades.mistakeShieldPro ? 2 : 1);
						showToast('获得一个失误护盾！');
					}
					
					if (game.state.upgrades.investmentActive > 0) {
						game.state.currency += Math.floor(cur.word.length * 0.5);
						game.state.upgrades.investmentActive--;
						if (game.state.upgrades.investmentActive === 0) {
							showToast('投资结束');
						}
					}
					if(state.eventActive) { state.eventActive.duration--; if(state.eventActive.duration <= 0) state.eventActive = null; }
					if(state.isBoss) { showToast('头目已被击败！获得一次额外升级！'); chooseUpgrade(); state.isBoss = false; }
					state.index++; state.buffer=''; updateAutocomplete();
					beep(820+(state.upgrades.bonusCombo?Math.min(state.streak,20)*6:0),45,'triangle',0.02);
					updateDial(); updateHUD();
					if(state.streak > 0 && state.streak % 10 === 0) {
						const streakEl = document.getElementById('streak');
						streakEl.classList.add('streak-glow');
						setTimeout(() => streakEl.classList.remove('streak-glow'), 500);
					}
					// 连击爆发升级
					if (state.upgrades.bonusComboPro && state.streak > 0 && state.streak % 50 === 0) {
						game.state.upgrades.mistakeShield += 1; // 获得一个护盾
						showToast('连击爆发！获得一个失误护盾！');
					}
					if(state.index % 50 === 0 && state.index > 0) { sequence.splice(state.index, 0, bossWords[Math.floor(Math.random() * bossWords.length)]); state.isBoss = true; showToast('头目出现！'); }
					if(state.index % 10 === 0) triggerRandomEvent();
					if(state.index===state.nextUp){ state.phase = Math.floor(state.phase * 1.2); state.nextUp+=state.phase; chooseUpgrade(); }
					if(state.index>=sequence.length){ finish(); }
				} else {
					beep(700,22,'sine',0.01);
				}
			} else {
				// 错误输入处理
				let handledBySpellCorrection = false;
				if (state.upgrades.spellCorrection) {
					// 检查是否可以通过拼写修正来处理
					const currentWord = cur.word;
					const typedWord = state.buffer + ch; // 加上当前输入的字符
					
					// 简单的单字符替换修正
					if (currentWord.length === typedWord.length) {
						let diffCount = 0;
						let firstDiffIndex = -1;
						for (let k = 0; k < currentWord.length; k++) {
							if (currentWord[k] !== typedWord[k]) {
								diffCount++;
								firstDiffIndex = k;
							}
						}
						if (diffCount === 1) {
							// 只有一个字符不同，进行修正
							state.buffer = currentWord; // 直接修正为正确单词
							state.total++; // 算作一次输入
							state.correct += state.buffer.length; // 算作正确字符
							state.streak = Math.min(999, state.streak + 1); // 增加连击
							showToast('拼写修正！');
							beep(1200, 20, 'sine', 0.01);
							handledBySpellCorrection = true;
							
							// 立即完成当前单词
							state.index++;
							state.buffer = '';
							updateAutocomplete();
							beep(820+(state.upgrades.bonusCombo?Math.min(state.streak,20)*6:0),45,'triangle',0.02);
							updateDial();
							updateHUD();
							if(state.streak > 0 && state.streak % 10 === 0) { const streakEl = document.getElementById('streak'); streakEl.classList.add('streak-glow'); setTimeout(() => streakEl.classList.remove('streak-glow'), 500); }
							if(state.index % 50 === 0 && state.index > 0) { sequence.splice(state.index, 0, bossWords[Math.floor(Math.random() * bossWords.length)]); state.isBoss = true; showToast('头目出现！'); }
							if(state.index % 10 === 0) triggerRandomEvent();
							if(state.index===state.nextUp){ state.phase = Math.floor(state.phase * 1.2); state.nextUp+=state.phase; chooseUpgrade(); }
							if(state.index>=sequence.length){ finish(); }
						}
					}
				}

				if (!handledBySpellCorrection) {
					if(state.upgrades.hintCorrection){
						// 开启纠错提示，不清除 buffer，不重置连击，但仍然算作一次错误
						state.total++; // 错误也算一次输入
						state.buffer += ch; // 错误字符也加入 buffer
						beep(160,90,'sawtooth',0.025);
						const f=document.querySelector('.focus'); if(f){ f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake'); }
					} else {
						// 传统错误处理
						if(state.upgrades.mistakeShield>0){
							state.upgrades.mistakeShield--;
							showToast('护盾抵消了一次失误！');
							state.buffer = state.buffer.slice(0, -1); // 护盾抵消后，移除错误的字符
						} else {
							if (state.upgrades.insurance && state.currency >= 25 && state.streak > 10) {
								state.currency -= 25;
								state.streak = Math.floor(state.streak / 2);
								showToast(`保险生效！花费25货币保留了${state.streak}连击！`);
							} else {
								state.streak=0;
							}
							state.buffer=''; // 清空 buffer
						}
						if(state.upgrades.slowMotion){ document.body.style.transition='filter .1s'; document.body.style.filter='blur(2px)'; setTimeout(()=>document.body.style.filter='none', state.upgrades.slowMotionPro ? 4000 : 2000); }
						beep(160,90,'sawtooth',0.025);
						const f=document.querySelector('.focus'); if(f){ f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake'); }
					}
				}
			}
			renderBuffer();
		}
		function backspace(){ if(!state.running) return; if(state.buffer){ state.buffer=state.buffer.slice(0,-1); updateAutocomplete(); renderBuffer(); } }
		function autocomplete(){ if(!state.running||!state.upgrades.autoComplete) return; const cur=item(); if(!cur) return; if(state.autocomplete.suggestions.length > 0) { const word = state.autocomplete.suggestions[state.autocomplete.selected]; for(const char of word.slice(state.buffer.length)) { type(char); } } }
		function skip(){
			if(!state.running || !state.upgrades.wordSkip) return;
			if (!state.upgrades.freeSkip) {
				state.total++; // 计入一次输入
				state.streak = 0; // 重置连击
			}
			state.index++;
			state.buffer='';
			updateAutocomplete();
			updateDial();
			updateHUD();
		}
		function finish(){ state.running=false; startBtn.disabled=false; overlay.style.display='flex'; showToast('完成全部词条'); }
		function updateHUD(){ progressEl.textContent=`${Math.min(state.index,sequence.length)}/${sequence.length}`; const minutes=Math.max(0.001,(now()-state.startedAt)/60000); const wpm=Math.round((state.correct/5)/minutes); wpmEl.textContent=String(isFinite(wpm)?wpm:0); const acc=state.total===0?100:Math.round(100*state.correct/Math.max(1,state.total)); accuracyEl.textContent=acc+'%'; streakEl.textContent=state.streak+'x'; if(game.state.upgrades.mistakeShield>0) streakEl.textContent += ` (${game.state.upgrades.mistakeShield}🛡️)`; currencyEl.textContent = state.currency; }
		return { state, reset, start, item, type, backspace, autocomplete, skip, updateHUD };
	})();

	function updateAutocomplete() {
		if (!game.state.upgrades.autoComplete || !game.state.running) {
			autocompleteEl.style.display = 'none';
			return;
		}
		const buffer = game.state.buffer;
		const suggestions = sequence
			.map(item => item.word)
			.filter(word => word.startsWith(buffer) && !bossWords.some(boss => boss.word === word))
			.sort((a, b) => {
				if (game.state.upgrades.autoCompletePro) {
					return 0; // 不再刻意排序
				}
				return a === game.item().word ? 1 : -1;
			})
			.slice(0, 5);
		
		if (buffer.length === 0 || suggestions.length === 0) {
			autocompleteEl.style.display = 'none';
			return;
		}

		autocompleteEl.style.display = 'flex';

		game.state.autocomplete.suggestions = suggestions;
		game.state.autocomplete.selected = 0;
		autocompleteEl.innerHTML = suggestions
			.map((word, i) => `<div class="autocomplete-item ${i === 0 ? 'selected' : ''}">${word}</div>`)
			.join('');
	}

	function chooseUpgrade(){
		const pool=[
			// S tier
			{k:'autoComplete',n:'自动补全',d:'按 Tab 键可立即完成当前单词的输入',tier:'S', cost: 800},
			{k:'mistakeShield',n:'失误护盾',d:'每20个单词获得一个护盾，能抵消一次输入错误',tier:'S', cost: 700},
			// A tier
			{k:'bonusCombo',n:'连击奖励',d:'连击数越高，打字音效的音调也越高',tier:'A', cost: 500},
			{k:'lenientCase',n:'格式豁免',d:'输入时忽略单词的大小写、连字符和下划线',tier:'A', cost: 600},
			{k:'autoCompletePro',n:'高级补全',d:'自动补全不再刻意将当前单词排在最后',tier:'A', requires:'autoComplete', cost: 400},
			{k:'mistakeShieldPro',n:'强化护盾',d:'护盾获得频率提高，且一个护盾可抵消多次错误',tier:'A', requires:'mistakeShield', cost: 550},
			// B tier
			{k:'hintAlways',n:'永久提示',d:'输入过程中始终显示单词的未输入部分',tier:'B', cost: 250},
			{k:'hintCorrection',n:'纠错提示',d:'输入错误后无需删除，根据提示继续输入即可',tier:'B', requires:'hintAlways', cost: 350},
			{k:'slowMotion',n:'子弹时间',d:'输入错误时，游戏速度减慢2秒',tier:'B', cost: 200},
			{k:'bonusComboPro',n:'连击爆发',d:'达到一定连击数时获得额外奖励',tier:'B', requires:'bonusCombo', cost: 450},
			{k:'spellCorrection',n:'拼写修正',d:'自动修正一些常见的拼写小错误',tier:'B', requires:'lenientCase', cost: 300},
			// C tier
			{k:'doubleVision',n:'双倍视野',d:'单词列表的可见范围扩大一倍',tier:'C', cost: 100},
			{k:'xrayVision',n:'透视',d:'能看到更远的单词的词义',tier:'C', requires:'doubleVision', cost: 150},
			{k:'wordSkip',n:'跳过单词',d:'按 Esc 键可以跳过当前不想输入的单词',tier:'C', cost: 120},
			{k:'freeSkip',n:'自由跳过',d:'跳过单词不再计入失误或影响连击',tier:'C', requires:'wordSkip', cost: 180},
			{k:'slowMotionPro',n:'持久子弹',d:'子弹时间持续更长时间',tier:'C', requires:'slowMotion', cost: 250},
			// Currency related upgrades
			{k:'greed',n:'贪婪',d:'每次获得货币时，有10%概率获得双倍',tier:'A', cost: 750},
			{k:'investment',n:'投资',d:'花费100货币，在接下来20个单词中获得50%额外货币',tier:'B', cost: 100},
			{k:'insurance',n:'保险',d:'连击中断时，可花费50货币保留一半连击数',tier:'B', cost: 200},
			{k:'reroll',n:'刷新商店',d:'花费20货币刷新商店（包括挑战）',tier:'C', cost: 20},
		];

		const negativeEffects = [
			{ k: 'curseOfSlowness', n: '缓慢诅咒', d: '所有单词长度永久增加2', effect: () => { sequence.forEach(item => item.word += '  '); }, currency: 200 },
			{ k: 'curseOfPoverty', n: '贫穷诅咒', d: '获取货币效率永久降低20%', effect: () => { game.state.upgrades.curseOfPoverty = true; }, currency: 300 },
			{ k: 'curseOfBlindness', n: '致盲诅咒', d: '永久性模糊视线', effect: () => { document.body.classList.add('permanent-blur'); }, currency: 400 },
			{ k: 'curseOfFragility', n: '脆弱诅咒', d: '失误护盾上限变为1', effect: () => { game.state.upgrades.mistakeShield = Math.min(game.state.upgrades.mistakeShield, 1); }, currency: 250 },
			{ k: 'curseOfTime', n: '时间诅咒', d: '游戏速度加快10%，持续30秒', effect: () => { document.body.style.setProperty('--game-speed', '0.9'); setTimeout(() => document.body.style.removeProperty('--game-speed'), 30000); }, currency: 150 },
		];

		const availableUpgrades = pool.filter(p => !game.state.upgrades[p.k] && (!p.requires || game.state.upgrades[p.requires]));
		
		const tiers = ['S', 'A', 'B', 'C'];
		const picks = [];
		tiers.forEach(tier => {
			const tierUpgrades = availableUpgrades.filter(u => u.tier === tier);
			if (tierUpgrades.length > 0) {
				picks.push(tierUpgrades[Math.floor(Math.random() * tierUpgrades.length)]);
			}
		});

		const randomCurse = negativeEffects[Math.floor(Math.random() * negativeEffects.length)];

		const mask=document.createElement('div');
		mask.className='overlay';
		mask.innerHTML=`
			<div class="panel">
				<h2>天赋商店</h2>
				<p>当前货币: <span id="shopCurrency">${game.state.currency}</span></p>
				<div class="shop-section">
					<h3>购买天赋</h3>
					<div class="shop-items">
						${availableUpgrades.map(p=>`
							<button class="btn shop-item" data-k="${p.k}" data-cost="${p.cost}" ${game.state.currency < p.cost ? 'disabled' : ''}>
								<strong>${p.n} <span class="tier">(${p.tier})</span></strong>
								<span class="cost">${p.cost} 💰</span>
								<br>
								<span class="desc">${p.d}</span>
							</button>
						`).join('')}
					</div>
				</div>
				<div class="shop-section">
					<h3>购买天赋</h3>
					<div class="shop-items">
						${picks.map(p=>`
							<button class="btn shop-item" data-k="${p.k}" data-cost="${p.cost}" ${game.state.currency < p.cost ? 'disabled' : ''}>
								<strong>${p.n} <span class="tier">(${p.tier})</span></strong>
								<span class="cost">${p.cost} 💰</span>
								<br>
								<span class="desc">${p.d}</span>
							</button>
						`).join('')}
					</div>
				</div>
				<div class="shop-section">
					<h3>接受挑战 (获得货币)</h3>
					<div class="shop-items">
						<button class="btn shop-item negative" data-k="${randomCurse.k}" data-currency="${randomCurse.currency}">
							<strong>${randomCurse.n}</strong>
							<span class="reward">+${randomCurse.currency} 💰</span>
							<br>
							<span class="desc">${randomCurse.d}</span>
						</button>
					</div>
				</div>
				<button id="closeShop" class="btn">关闭</button>
			</div>`;
		document.body.appendChild(mask);

		mask.querySelector('#closeShop').addEventListener('click', () => {
			mask.remove();
			hiddenInput.focus();
		});

		mask.querySelectorAll('.shop-item').forEach(b=>b.addEventListener('click',()=>{
			if (b.classList.contains('negative')) {
				const k = b.getAttribute('data-k');
				const effect = negativeEffects.find(x => x.k === k);
				if (effect) {
					effect.effect();
					game.state.currency += effect.currency;
					showToast(`接受挑战：${effect.n}，获得 ${effect.currency} 货币`);
					b.disabled = true; // 一个挑战只能接受一次
					document.getElementById('shopCurrency').textContent = game.state.currency;
					game.updateHUD();
				}
			} else {
				const k=b.getAttribute('data-k');
				const cost = parseInt(b.getAttribute('data-cost'));
				if (k === 'reroll') {
					if (game.state.currency >= cost) {
						game.state.currency -= cost;
						mask.remove();
						chooseUpgrade();
					} else {
						showToast('货币不足');
					}
					return;
				}
				if (k === 'investment') {
					if (game.state.currency >= cost) {
						game.state.currency -= cost;
						game.state.upgrades.investmentActive = 20; // 持续20个单词
						showToast('投资成功！');
						b.disabled = true;
						b.style.opacity = '0.5';
						document.getElementById('shopCurrency').textContent = game.state.currency;
						game.updateHUD();
					} else {
						showToast('货币不足');
					}
					return;
				}
				if (game.state.currency >= cost) {
					game.state.currency -= cost;
					game.state.upgrades[k]=true;
					showToast('购买成功：'+pool.find(x=>x.k===k).n);
					b.disabled = true;
					b.style.opacity = '0.5';
					document.getElementById('shopCurrency').textContent = game.state.currency;
					game.updateHUD();
					if(k==='doubleVision') buildDial();
				} else {
					showToast('货币不足');
				}
			}
		}));
	}
	// File & DnD
	mdInput.addEventListener('change', async (e)=>{ const f=e.target.files&&e.target.files[0]; if(!f) return; const text=await f.text(); let seq=[]; try{ if(/\.json$/i.test(f.name)){ seq=parseJsonSmart(text); } else { seq=fromMarkdown(text); } cacheSequenceSafe(seq); applySequence(seq); wordSourceStatus.textContent=`词库：${f.name} 共 ${seq.length} 词`; showToast('词库已加载'); }catch(err){ console.error(err); showToast('解析失败'); }});
	retryMdBtn.addEventListener('click', tryLoadDefault);
	mdDropZone.addEventListener('dragover', e=>{ e.preventDefault(); mdDropZone.classList.add('dragover'); });
	mdDropZone.addEventListener('dragleave', ()=> mdDropZone.classList.remove('dragover'));
	mdDropZone.addEventListener('drop', async (e)=>{ e.preventDefault(); mdDropZone.classList.remove('dragover'); const f=e.dataTransfer.files&&e.dataTransfer.files[0]; if(!f) return; const text=await f.text(); let seq=[]; try{ if(/\.json$/i.test(f.name)){ seq=parseJsonSmart(text); } else { seq=fromMarkdown(text); } cacheSequenceSafe(seq); applySequence(seq); wordSourceStatus.textContent=`词库：${f.name} 共 ${seq.length} 词`; showToast('词库已加载'); }catch(err){ console.error(err); showToast('解析失败'); } });

	// Input
	window.addEventListener('keydown', (e)=>{
		if(e.key==='Enter'){ if(overlay.style.display!=='none') game.start(); e.preventDefault(); return; }
		if(e.key==='Tab'){ game.autocomplete(); e.preventDefault(); return; }
		if(e.key==='Backspace'){ game.backspace(); e.preventDefault(); return; }
		if(e.key==='Escape'){ if(game.state.upgrades.wordSkip) game.skip(); e.preventDefault(); return; }
		if (game.state.upgrades.autoComplete && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
			const { suggestions, selected } = game.state.autocomplete;
			if (suggestions.length > 0) {
				let newSelected = selected;
				if (e.key === 'ArrowUp') {
					newSelected = (selected - 1 + suggestions.length) % suggestions.length;
				} else {
					newSelected = (selected + 1) % suggestions.length;
				}
				game.state.autocomplete.selected = newSelected;
				const items = autocompleteEl.querySelectorAll('.autocomplete-item');
				items.forEach((item, i) => {
					item.classList.toggle('selected', i === newSelected);
				});
			}
			e.preventDefault();
			return;
		}
		if(e.shiftKey && e.key.length===1 && /[a-zA-Z\-']/.test(e.key)) {
			handleFallingWordInput(e.key);
			e.preventDefault();
			return;
		}
		if(e.key.length===1 && /[a-zA-Z\-']/.test(e.key)){ game.type(e.key); e.preventDefault(); }
	},{passive:false});

	// Button listeners
	startBtn.addEventListener('click', ()=> game.start());
	resetBtn.addEventListener('click', ()=> game.reset());

	// Init
	game.reset();
	tryLoadDefault();
})();

// Extra: try File System Access API under file:// to open default md next to index
(async function fileSystemAccessFallback(){
	if(location.protocol!=='file:') return; // only under file
	try{
		// Try to fetch relative path first (already done). If small fallback active and user has the real md in same folder, show guidance toast.
		if(sequence.length<=fallbackList.length){
			showToast('提示：将 高考核心词汇.json 放在同目录可自动加载');
		}
	}catch(_){/* noop */}
})();

function triggerFallingWord() {
	if (document.querySelector('.falling-word')) return; // Only one at a time

	const word = sequence[Math.floor(Math.random() * sequence.length)].word;
	game.state.fallingWord.word = word;
	game.state.fallingWord.buffer = '';

	const el = document.createElement('div');
	el.className = 'falling-word mono';
	el.textContent = word;
	el.style.left = `${Math.random() * 90}vw`;
	const duration = 5 + Math.random() * 5;
	el.style.animationDuration = `${duration}s`;

	fallingWordsContainer.appendChild(el);

	el.addEventListener('animationend', () => {
		el.remove();
		if (game.state.fallingWord.word === word) {
			game.state.fallingWord.word = null;
			game.state.fallingWord.buffer = '';
		}
	});
}

function handleFallingWordInput(char) {
	const { fallingWord } = game.state;
	if (!fallingWord.word) return;

	fallingWord.buffer += char;
	const el = document.querySelector('.falling-word');

	if (fallingWord.word.startsWith(fallingWord.buffer)) {
		beep(1400, 20, 'sine', 0.01);
		if (fallingWord.buffer === fallingWord.word) {
			const reward = fallingWord.word.length * 2;
			game.state.currency += reward;
			showToast(`击落彩蛋！+${reward}💰`);
			game.updateHUD();
			el.remove();
			fallingWord.word = null;
			fallingWord.buffer = '';
		}
	} else {
		beep(200, 90, 'sawtooth', 0.025);
		fallingWord.buffer = ''; // reset buffer on mistake
	}
}

setInterval(() => {
	if (game.state.running && Math.random() < 0.05) { // 5% chance every second
		triggerFallingWord();
	}
}, 1000);