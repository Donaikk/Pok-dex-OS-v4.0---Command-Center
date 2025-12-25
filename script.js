// Configurações Globais
const TYPE_ICONS = "https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/";
let allPokes = [];
let fuse;
let currentLang = localStorage.getItem('poke_lang') || 'pt';

// Dicionário de Tradução da Interface
const i18n = {
    pt: {
        home: "HOME",
        scan: "SCANNER",
        coll: "COLEÇÃO",
        sys: "SISTEMA",
        fact: "CURIOSIDADE DO DIA",
        empty: "Nenhum sinal catalogado.",
        btnCap: "CATALOGAR CAPTURA",
        btnSaved: "REGISTRO SALVO",
        searchPlaceholder: "IDENTIFICAR ESPÉCIME...",
        memTitle: "MEMÓRIA",
        memBtn: "APAGAR TODOS OS REGISTROS",
        langLabel: "IDIOMA DO SISTEMA",
        themeLabel: "COR DO TEMA (HUD)"
    },
    en: {
        home: "HOME",
        scan: "SCANNER",
        coll: "COLLECTION",
        sys: "SYSTEM",
        fact: "RANDOM FACT",
        empty: "No signals found.",
        btnCap: "CATALOG CAPTURE",
        btnSaved: "SAVED RECORD",
        searchPlaceholder: "IDENTIFY SPECIMEN...",
        memTitle: "MEMORY",
        memBtn: "WIPE ALL RECORDS",
        langLabel: "SYSTEM LANGUAGE",
        themeLabel: "THEME COLOR (HUD)"
    }
};

// Inicialização do Aplicativo
async function init() {
    const savedColor = localStorage.getItem('poke_theme') || '#00f2ff';
    changeTheme(savedColor);
    
    // Configura o seletor de idioma no menu sistema
    const langSelect = document.getElementById('lang-select');
    if(langSelect) langSelect.value = currentLang;

    try {
        const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1000');
        const data = await res.json();
        allPokes = data.results;
        fuse = new Fuse(allPokes, { keys: ['name'], threshold: 0.4 });
    } catch (e) {
        console.error("Falha ao carregar base de dados.");
    }
    
    loadRandomFact();
    updateUI();
}

// Funções de Configuração (Sistema)
function changeTheme(color) {
    document.documentElement.style.setProperty('--primary', color);
    localStorage.setItem('poke_theme', color);
}

function changeLang(lang) {
    currentLang = lang;
    localStorage.setItem('poke_lang', lang);
    updateUI();
    loadRandomFact(); // Atualiza o fato da home para o novo idioma
}

function updateUI() {
    const t = i18n[currentLang];
    
    // Atualiza links da navegação
    document.getElementById('link-home').innerText = t.home;
    document.getElementById('link-scanner').innerText = t.scan;
    document.getElementById('link-collection').innerText = t.coll;
    document.getElementById('link-settings').innerText = t.sys;
    
    // Atualiza textos da Home
    const factTitle = document.getElementById('txt-fact-title');
    if(factTitle) factTitle.innerText = t.fact;
    
    // Atualiza textos do Scanner
    const searchInput = document.getElementById('search');
    if(searchInput) searchInput.placeholder = t.searchPlaceholder;
}

// Lógica de Busca de Texto (Flavor Text) com Fallback
function getFlavorText(entries, lang) {
    // Procura por 'pt' ou 'pt-BR'
    let entry = entries.find(e => e.language.name === 'pt' || e.language.name === 'pt-BR');
    
    // Se não encontrar e o usuário quiser inglês, ou se não houver PT disponível, usa 'en'
    if (!entry) {
        entry = entries.find(e => e.language.name === 'en');
    }

    return entry ? entry.flavor_text.replace(/[\f\n]/g, ' ') : "Descrição não disponível.";
}

// Carrega Curiosidade Aleatória na Home
async function loadRandomFact() {
    const randomId = Math.floor(Math.random() * 151) + 1; // Foca nos 151 originais (mais chances de PT)
    try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${randomId}`);
        const data = await res.json();
        const fact = getFlavorText(data.flavor_text_entries, currentLang);
        const factArea = document.getElementById('fact-text');
        if(factArea) factArea.innerText = `${data.name.toUpperCase()}: ${fact}`;
    } catch (e) {
        if(document.getElementById('fact-text')) 
            document.getElementById('fact-text').innerText = "Erro ao carregar curiosidade.";
    }
}

// Funções do Scanner
function updateSuggestions(val) {
    const box = document.getElementById('suggestions');
    if (val.length < 2) { box.style.display = 'none'; return; }
    
    const results = fuse.search(val).slice(0, 5);
    box.innerHTML = results.map(r => {
        const id = r.item.url.split('/')[6];
        return `<div class="suggestion-item" onclick="loadPokemon('${r.item.name}')">
            <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png" width="40">
            <span>${r.item.name.toUpperCase()}</span>
        </div>`;
    }).join('');
    box.style.display = 'block';
}

async function loadPokemon(name) {
    const box = document.getElementById('suggestions');
    if(box) box.style.display = 'none';
    
    try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
        const pokeData = await res.json();
        
        const speciesRes = await fetch(pokeData.species.url);
        const speciesData = await speciesRes.json();
        
        const fact = getFlavorText(speciesData.flavor_text_entries, currentLang);

        // Efeito Visual Gengar
        if(pokeData.name === 'gengar') document.body.classList.add('gengar-mode');
        else document.body.classList.remove('gengar-mode');
        
        renderCard(pokeData, fact);
    } catch (e) {
        console.error("Erro ao carregar Pokémon.");
    }
}

function renderCard(data, fact) {
    const saved = JSON.parse(localStorage.getItem('my_pokes')) || {};
    const resultArea = document.getElementById('poke-result');
    const t = i18n[currentLang];
    
    const statLabels = {
        "hp": "HP", "attack": "ATAQUE", "defense": "DEFESA", 
        "special-attack": "ATQ. ESP", "special-defense": "DEF. ESP", "speed": "VELOCIDADE"
    };

    resultArea.innerHTML = `
        <div class="poke-card">
            <div style="text-align:center">
                <img src="${data.sprites.other['official-artwork'].front_default}" style="width:100%; max-width:220px; filter: drop-shadow(0 0 15px var(--primary));">
                <div style="margin: 15px 0;">
                    ${data.types.map(t => `<img src="${TYPE_ICONS}${t.type.name}.svg" style="width:30px; margin:0 5px; filter:invert(1)">`).join('')}
                </div>
            </div>
            <h2 style="font-family:'Orbitron'; color:var(--primary); margin-bottom:10px;">${data.name.toUpperCase()}</h2>
            <div style="background:rgba(0,0,0,0.4); padding:15px; border-radius:10px; margin-bottom:15px; font-size:0.95rem; border-left:3px solid var(--primary); font-style: italic;">
                "${fact}"
            </div>
            ${data.stats.map(s => `
                <div style="margin-bottom:8px">
                    <div style="display:flex; justify-content:space-between; font-size:0.75rem; font-family:'Orbitron'">
                        <span>${statLabels[s.stat.name] || s.stat.name.toUpperCase()}</span>
                        <span>${s.base_stat}</span>
                    </div>
                    <div class="bar-bg"><div class="bar-fill" style="width:${(s.base_stat/255)*100}%"></div></div>
                </div>
            `).join('')}
            <button class="cap-btn ${saved[data.id] ? 'active' : ''}" onclick="toggleSave(${data.id}, '${data.name}', '${data.sprites.front_default}')">
                ${saved[data.id] ? t.btnSaved : t.btnCap}
            </button>
        </div>
    `;
}

// Funções de Coleção
function toggleSave(id, name, img) {
    let saved = JSON.parse(localStorage.getItem('my_pokes')) || {};
    if(saved[id]) delete saved[id];
    else saved[id] = { name, img };
    localStorage.setItem('my_pokes', JSON.stringify(saved));
    loadPokemon(name);
}

function updateCollectionUI() {
    const saved = JSON.parse(localStorage.getItem('my_pokes')) || {};
    const list = document.getElementById('collection-list');
    const t = i18n[currentLang];

    list.innerHTML = Object.values(saved).map(p => `
        <div class="captured-card" style="background:var(--glass); padding:10px; border-radius:15px; text-align:center; border:1px solid rgba(0,242,255,0.1);" onclick="showPage('scanner'); loadPokemon('${p.name}')">
            <img src="${p.img}" width="80">
            <div style="font-size:0.7rem; font-family:'Orbitron'">${p.name.toUpperCase()}</div>
        </div>
    `).join('') || `<p style="grid-column:1/-1; text-align:center; opacity:0.5">${t.empty}</p>`;
}

// Navegação
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    document.getElementById('link-' + pageId).classList.add('active');
    if(pageId === 'collection') updateCollectionUI();
}

function clearData() {
    if(confirm(currentLang === 'pt' ? "Deseja resetar todos os dados?" : "Reset all data?")) {
        localStorage.removeItem('my_pokes');
        updateCollectionUI();
    }
}

init();