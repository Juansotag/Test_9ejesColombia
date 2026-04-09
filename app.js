// --- Supabase REST API ---
const SUPABASE_URL = 'https://ppdrlciyiwdtryofzwtr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_K0JYSb_ClMwtMqzRxvQkUg_SRJx0paW';

let lastResponseId = null; // guarda el id de la última respuesta guardada

const LIKERT_OPTIONS = [
    { value: 4, text: "Muy de acuerdo" },
    { value: 3, text: "Algo de acuerdo" },
    { value: 2, text: "Algo en desacuerdo" },
    { value: 1, text: "Muy en desacuerdo" }
];

async function saveResponse(answers, userScores, sortedCandidates) {
    try {
        const payload = {
            p_user_agent: navigator.userAgent,
            p_location_hint: userName || 'Anónimo',
            p_responses: Object.entries(answers).map(([qid, a]) => ({
                question_id: parseInt(qid),
                raw_answer: a.raw,
                normalized_score: a.normalized
            })),
            p_user_scores: Object.entries(userScores).map(([aid, score]) => ({
                axis_id: parseInt(aid),
                score: score
            })),
            p_results: sortedCandidates.map((c, i) => ({
                candidate_id: c.id,
                distance: c.distance,
                rank: i + 1
            }))
        };
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/submit_quiz_session`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const data = await response.json();
            lastResponseId = data;
            console.log('[Supabase] Respuesta guardada. ID:', lastResponseId);
            const btn = document.getElementById('feedback-submit-btn');
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Enviar comentario';
            }
        } else {
            const errText = await response.text();
            console.warn('[Supabase] (Ignorado) Error al guardar, quizas schema cache:', response.status, errText);
            const btn = document.getElementById('feedback-submit-btn');
            if (btn) btn.textContent = 'Guardado localmente';
        }
    } catch (e) {
        console.warn('[Supabase] (Ignorado) Error inesperado u offline:', e);
        const btn = document.getElementById('feedback-submit-btn');
        if(btn) btn.textContent = 'Guardado localmente';
    }
}

async function saveComment(comment) {
    if (!lastResponseId) {
        console.warn('[Supabase] No hay respuesta guardada a la que vincular el comentario.');
        return false;
    }
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/rpc/save_session_comment`,
            {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    p_session_id: lastResponseId,
                    p_comment: comment
                })
            }
        );
        return response.ok;
    } catch (e) {
        console.warn('[Supabase] Error al guardar comentario:', e);
        return false;
    }
}
// --- Fin Supabase ---

// --- Compartir resultados ---
const MEDALS = ['🥇', '🥈', '🥉'];

function populateShareCard() {
    const title = document.getElementById('share-card-title');
    const container = document.getElementById('share-card-candidates');
    title.textContent = userName
        ? `${userName}, este es tu perfil ideológico:`
        : 'Este es mi perfil ideológico:';
    
    const axesRaw = document.getElementById('user-profile-axes');
    if (axesRaw) {
        // Reducimos un poco el padding/fuentes si hay muchos ejes y no cabe
        container.style.gap = '0.5rem';
        container.innerHTML = axesRaw.innerHTML;
        // Ajustamos márgenes de los ítems copiados pasados a la versión imagen
        Array.from(container.children).forEach(child => {
            child.style.padding = '0.5rem';
            child.style.transform = 'scale(0.95)';
            child.style.background = 'transparent';
        });
    }
}

async function captureCard() {
    const card = document.getElementById('share-card');
    // Mostrar tarjeta temporalmente fuera de pantalla para capturarla
    card.style.position = 'fixed';
    card.style.left = '-9999px';
    card.style.top = '0';
    card.style.display = 'block';
    await new Promise(r => setTimeout(r, 150)); // esperar render de imágenes
    const canvas = await html2canvas(card, {
        backgroundColor: '#0f172a',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false
    });
    card.style.display = 'none';
    card.style.position = '';
    card.style.left = '';
    card.style.top = '';
    return canvas;
}

async function captureAndDownload() {
    const btn = document.getElementById('btn-download');
    btn.textContent = 'Generando...';
    btn.disabled = true;
    try {
        const canvas = await captureCard();
        const link = document.createElement('a');
        link.download = `test-9-ejes-${(userName || 'resultados').replace(/\s+/g, '-')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    } finally {
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Descargar imagen`;
        btn.disabled = false;
    }
}

function getShareText(top3) {
    const names = top3.slice(0, 3).map((c, i) => `${MEDALS[i]} ${c.name} (${c.percentage}%)`).join(' ');
    const siteUrl = 'https://test-dilema-production.up.railway.app/';
    return userName
        ? `${userName} hizo el Test 9 Ejes Colombia 🗳️\n\nSus candidatos con mayor afinidad son:\n${names}\n\n¿Cuál es el tuyo? ${siteUrl}`
        : `Hice el Test 9 Ejes Colombia 🗳️\n\nMis candidatos con mayor afinidad:\n${names}\n\n¿Cuál es el tuyo? ${siteUrl}`;
}

async function shareToPlatform(platform, top3) {
    const text = getShareText(top3);
    const siteUrl = 'https://test-dilema-production.up.railway.app/';

    // Si estamos en un dispositivo móvil con Web Share API, es la forma nativa de enviar la imagen directamente a la app.
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile && navigator.share && navigator.canShare) {
        try {
            const canvas = await captureCard();
            const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
            const file = new File([blob], 'test-9-ejes.png', { type: 'image/png' });

            let shareText = text;
            if (platform === 'instagram') {
                shareText = "Toma pantalla o comparte tus resultados directamente 😎";
            }

            const shareData = { files: [file], title: 'Test 9 Ejes Colombia', text: shareText };
            if (navigator.canShare(shareData)) {
                await navigator.share(shareData);
                return;
            }
        } catch (e) {
            console.warn("Error en Web Share API", e);
            if (e.name !== 'AbortError') captureAndDownload();
            return;
        }
    }

    // Comportamiento Desktop (o si Web Share no soporta archivos):
    // Como las páginas web no pueden adjuntar imágenes a URLs de Twitter/Facebook, descargamos la imagen primero.
    if (platform === 'native') {
        captureAndDownload();
        setTimeout(() => {
            alert("Tu imagen de resultados ha sido descargada. Compártela con tus amigos.");
            if (navigator.share) {
                navigator.share({ title: 'Test 9 Ejes Colombia', text: '¿Cuál es tu candidato?', url: siteUrl }).catch(() => { });
            }
        }, 500);
        return;
    }

    try {
        await captureAndDownload();
        let url = '';

        if (platform === 'twitter') {
            url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        } else if (platform === 'facebook') {
            url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(siteUrl)}`;
        } else if (platform === 'whatsapp') {
            url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        } else if (platform === 'instagram') {
            setTimeout(() => {
                alert("Tu imagen de resultados ha sido descargada.\n\nSúbela a tu perfil o historia de Instagram.");
            }, 600);
            return;
        }

        if (url) {
            setTimeout(() => {
                const proceed = confirm(`Tu imagen ha sido descargada.\n\nAl continuar se abrirá ${platform}. ¡Asegúrate de adjuntar la imagen descargada a tu publicación!`);
                if (proceed) {
                    window.open(url, '_blank', 'noopener');
                }
            }, 600);
        }

    } catch (e) {
        console.error("Error al compartir", e);
    }
}
// --- Fin compartir ---

let quizData = null;
let currentQuestionIndex = 0;
let userAnswers = {};
let cameFromResults = false;
let userName = '';

const landing = document.getElementById('landing');
const nameScreen = document.getElementById('name-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultsScreen = document.getElementById('results-screen');
const answersScreen = document.getElementById('answers-screen');

const startBtn = document.getElementById('start-btn');
const nameContinueBtn = document.getElementById('name-continue-btn');
const nameInput = document.getElementById('name-input');
const restartBtn = document.getElementById('restart-btn');
const viewAnswersBtn = document.getElementById('view-answers-btn');
const backToLandingBtn = document.getElementById('back-to-landing-btn');

const feedbackText = document.getElementById('feedback-text');
const feedbackSubmitBtn = document.getElementById('feedback-submit-btn');
const feedbackStatus = document.getElementById('feedback-status');
const feedbackCharCount = document.getElementById('feedback-char-count');

// Contador de palabras del textarea
feedbackText.addEventListener('input', () => {
    const text = feedbackText.value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    feedbackCharCount.textContent = `${words} / 200 palabras`;

    if (words > 200) {
        feedbackCharCount.style.color = 'var(--danger, red)';
        feedbackSubmitBtn.disabled = true;
    } else {
        feedbackCharCount.style.color = '';
        feedbackSubmitBtn.disabled = false;
    }
});

// Enviar comentario
feedbackSubmitBtn.addEventListener('click', async () => {
    const text = feedbackText.value.trim();
    const words = text ? text.split(/\s+/).length : 0;

    if (!text) {
        feedbackStatus.textContent = '⚠️ Por favor escribe algo antes de enviar.';
        feedbackStatus.className = 'feedback-status error';
        return;
    }
    if (words > 200) {
        feedbackStatus.textContent = '⚠️ El comentario no puede exceder las 200 palabras.';
        feedbackStatus.className = 'feedback-status error';
        return;
    }
    feedbackSubmitBtn.disabled = true;
    feedbackSubmitBtn.textContent = 'Enviando...';
    const ok = await saveComment(text);
    if (ok) {
        feedbackStatus.textContent = '✅ ¡Gracias por tu comentario!';
        feedbackStatus.className = 'feedback-status success';
        feedbackText.value = '';
        feedbackCharCount.textContent = '0 / 200 palabras';
        feedbackSubmitBtn.textContent = 'Comentario enviado';
    } else {
        feedbackStatus.textContent = '❌ Error al enviar. Intenta de nuevo.';
        feedbackStatus.className = 'feedback-status error';
        feedbackSubmitBtn.disabled = false;
        feedbackSubmitBtn.textContent = 'Enviar comentario';
    }
});


const counter = document.getElementById('counter');
const progressBar = document.getElementById('progress-bar');
const contextTag = document.getElementById('context');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options');
const resultsList = document.getElementById('results-list');

const candidatesGrid = document.getElementById('candidates-grid');
const candidateDetailView = document.getElementById('candidate-detail-view');
const detailPhoto = document.getElementById('detail-photo');
const detailName = document.getElementById('detail-name');
const detailParty = document.getElementById('detail-party');
const detailProfile = document.getElementById('detail-profile');
const answersList = document.getElementById('answers-list');

// Load data desde Supabase
async function init() {
    try {
        const headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
        };

        const [axesRes, qRes, cRes] = await Promise.all([
            fetch(`${SUPABASE_URL}/rest/v1/axes?select=id,name,pole_negative,pole_positive,weight&order=id`, { headers }),
            fetch(`${SUPABASE_URL}/rest/v1/questions?select=id,axis_id,code,statement,pole_direction&order=id`, { headers }),
            fetch(`${SUPABASE_URL}/rest/v1/candidates?select=id,name,party,profile,bio,campaign_url,photo_url,party_logo_url,profile_pic_url,candidate_positions(axis_id,score)&order=id`, { headers })
        ]);

        if (!axesRes.ok || !qRes.ok || !cRes.ok) throw new Error('Error al cargar datos de Supabase');

        const [rawAxes, rawQuestions, rawCandidates] = await Promise.all([axesRes.json(), qRes.json(), cRes.json()]);

        const axes = rawAxes.reduce((acc, ax) => {
            acc[ax.id] = ax;
            return acc;
        }, {});

        const questions = rawQuestions.map(q => ({
            id: q.id,
            axis_id: q.axis_id,
            code: q.code,
            text: q.statement,
            pole_direction: q.pole_direction
        }));

        const candidates = rawCandidates.map(c => ({
            id: c.id,
            name: c.name,
            party: c.party,
            profile: c.profile,
            description: c.bio,
            campaignUrl: c.campaign_url,
            photo: c.photo_url,
            partyLogo: c.party_logo_url,
            profilePic: c.profile_pic_url,
            positions: Object.fromEntries(
                (c.candidate_positions || []).map(p => [String(p.axis_id), p.score])
            )
        }));

        quizData = { axes, questions, candidates };
        console.log(`[Supabase] Datos cargados: ${questions.length} preguntas, ${candidates.length} candidatos`);
    } catch (error) {
        console.error('[Supabase] Error cargando datos:', error);
        alert('Error al cargar los datos. Por favor recarga la página.');
    }
}

function showNameScreen() {
    landing.classList.add('hidden');
    answersScreen.classList.add('hidden');
    resultsScreen.classList.add('hidden');
    nameScreen.classList.remove('hidden');
    nameScreen.classList.add('animate-in');
    nameInput.value = '';
    nameContinueBtn.disabled = true;
    setTimeout(() => nameInput.focus(), 300);
}

function startQuiz() {
    nameScreen.classList.add('hidden');
    quizScreen.classList.remove('hidden');
    quizScreen.classList.add('animate-in');
    currentQuestionIndex = 0;
    userAnswers = {};
    showQuestion();
}

// Habilitar botón Continuar solo si hay nombre
nameInput.addEventListener('input', () => {
    nameContinueBtn.disabled = nameInput.value.trim().length === 0;
});

// Presionar Enter en el input también continúa
nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && nameInput.value.trim().length > 0) {
        userName = nameInput.value.trim();
        startQuiz();
    }
});

nameContinueBtn.addEventListener('click', () => {
    userName = nameInput.value.trim();
    startQuiz();
});

function showAnswersScreen() {
    cameFromResults = false;
    landing.classList.add('hidden');
    answersScreen.classList.remove('hidden');
    answersScreen.classList.add('animate-in');
    candidateDetailView.classList.add('hidden');
    candidatesGrid.classList.remove('hidden');

    candidatesGrid.innerHTML = '';
    quizData.candidates.forEach(candidate => {
        const card = document.createElement('div');
        card.className = 'candidate-selector-card animate-in';

        card.innerHTML = `
            <img src="${candidate.photo || 'https://via.placeholder.com/80'}" alt="${candidate.name}">
            <h3>${candidate.name}</h3>
            <p style="margin-bottom: 8px;">${candidate.party}</p>
        `;
        card.onclick = () => showCandidateDetail(candidate);
        candidatesGrid.appendChild(card);
    });
}


function showCandidateDetail(candidate, fromResults = false) {
    cameFromResults = fromResults;
    if (fromResults) {
        resultsScreen.classList.add('hidden');
        answersScreen.classList.remove('hidden');
        answersScreen.classList.add('animate-in');
    }

    candidatesGrid.classList.add('hidden');
    candidateDetailView.classList.remove('hidden');
    candidateDetailView.classList.add('animate-in');

    // Use a default image if not found
    const detailPhotoPath = candidate.photo || 'https://via.placeholder.com/150?text=Candidato';
    const detailPartyPath = candidate.partyLogo || 'https://via.placeholder.com/60?text=P';
    detailPhoto.src = detailPhotoPath;
    detailName.innerText = candidate.name;
    detailParty.innerHTML = `<img src="${detailPartyPath}" style="height: 24px; vertical-align: middle; margin-right: 8px;"> ${candidate.party}`;
    detailProfile.innerHTML = '';

    // Campaign URL button
    const campaignBtn = document.getElementById('campaign-url-btn');
    if (candidate.campaignUrl) {
        campaignBtn.href = candidate.campaignUrl;
        campaignBtn.classList.remove('hidden');
    } else {
        // fallback: show button linking to a web search if no URL found
        campaignBtn.href = `https://www.google.com/search?q=${encodeURIComponent(candidate.name + ' candidato presidencia Colombia 2026')}`;
        campaignBtn.classList.remove('hidden');
    }


    // Inject profile description
    const profileTextContainer = document.getElementById('candidate-profile-text');
    if (profileTextContainer) {
        profileTextContainer.innerHTML = candidate.description ? candidate.description.split('\n\n').map(p => `<p>${p}</p>`).join('') : '';
    }

    answersList.innerHTML = `
        <div class="disclaimer-box animate-in">
            <i>⚠️</i>
            <p>Estas posiciones representan un análisis frente a 9 ejes ideológicos y de política pública, comparadas con tus propias respuestas.</p>
        </div>
        <div class="axes-comparison"></div>
    `;

    const axesContainer = answersList.querySelector('.axes-comparison');

    if (quizData && quizData.axes) {
        Object.values(quizData.axes).forEach(ax => {
            const candScore = candidate.positions[ax.id] !== undefined ? candidate.positions[ax.id] : 0;
            const userScore = (cameFromResults && window.lastUserAxisScores) ? window.lastUserAxisScores[ax.id] : null;

            const candPct = ((candScore + 1) / 2) * 100;
            let userMarkerHtml = '';
            if (userScore !== null) {
                const userPct = ((userScore + 1) / 2) * 100;
                userMarkerHtml = `<div class="user-marker" style="left: ${userPct}%;" title="Tú"></div>`;
            }

            const item = document.createElement('div');
            item.className = 'axis-item animate-in';
            item.innerHTML = `
                <div class="axis-header">
                    <span class="axis-pole-negative">${ax.pole_negative}</span>
                    <span class="axis-name">${ax.name}</span>
                    <span class="axis-pole-positive">${ax.pole_positive}</span>
                </div>
                <div class="axis-bar-container">
                    <span class="axis-center-line"></span>
                    <div class="axis-track"></div>
                    <div class="cand-marker" style="left: ${candPct}%;">
                       ${candidate.photo ? `<img src="${candidate.photo}">` : ''}
                    </div>
                    ${userMarkerHtml}
                </div>
            `;
            axesContainer.appendChild(item);
        });
    }
}

function showQuestion() {
    const question = quizData.questions[currentQuestionIndex];

    counter.innerText = `Pregunta ${currentQuestionIndex + 1} de ${quizData.questions.length}`;
    progressBar.style.width = `${((currentQuestionIndex + 1) / quizData.questions.length) * 100}%`;

    const axis = quizData.axes[question.axis_id];
    contextTag.innerText = axis ? `Eje: ${axis.name}` : 'General';
    questionText.innerText = question.text;

    optionsContainer.innerHTML = '';

    LIKERT_OPTIONS.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn animate-in';
        btn.style.animationDelay = `${index * 0.1}s`;
        btn.innerText = opt.text;
        btn.onclick = () => selectOption(opt.value);
        optionsContainer.appendChild(btn);
    });
}

function selectOption(value) {
    const question = quizData.questions[currentQuestionIndex];
    // Normalizar a [-1, 1] y aplicar la dirección del polo
    const normalized = ((value - 2.5) / 1.5) * question.pole_direction;
    userAnswers[question.id] = { raw: value, normalized };

    if (currentQuestionIndex < quizData.questions.length - 1) {
        currentQuestionIndex++;
        showQuestion();
    } else {
        showResults();
    }
}

function showResults() {
    quizScreen.classList.add('hidden');
    resultsScreen.classList.remove('hidden');
    resultsScreen.classList.add('animate-in');

    // Personalizar título con el nombre del usuario
    const resultsTitle = document.getElementById('results-title');
    const resultsSubtitle = document.getElementById('results-subtitle');
    if (userName) {
        resultsTitle.textContent = `${userName}, este es tu perfil ideológico`;
        resultsSubtitle.textContent = `Basado en tus respuestas, estas son tus posturas en los diferentes ejes:`;
    } else {
        resultsTitle.textContent = 'Tu Perfil Ideológico';
        resultsSubtitle.textContent = 'Basado en tus respuestas, estas son tus posturas en los diferentes ejes:';
    }

    // Calculate user_axis_scores
    const axisSums = {};
    const axisCounts = {};
    Object.values(quizData.axes).forEach(ax => {
        axisSums[ax.id] = 0;
        axisCounts[ax.id] = 0;
    });

    Object.entries(userAnswers).forEach(([qId, ans]) => {
        const q = quizData.questions.find(x => x.id === parseInt(qId));
        if (q) {
            axisSums[q.axis_id] += ans.normalized;
            axisCounts[q.axis_id]++;
        }
    });

    const userAxisScores = {};
    Object.values(quizData.axes).forEach(ax => {
        userAxisScores[ax.id] = axisCounts[ax.id] > 0 ? (axisSums[ax.id] / axisCounts[ax.id]) : 0;
    });
    window.lastUserAxisScores = userAxisScores;

    const maxDistance = Math.sqrt(Object.keys(quizData.axes).length * Math.pow(2, 2));

    const candidates = quizData.candidates.map(candidate => {
        let sumSq = 0;
        Object.values(quizData.axes).forEach(ax => {
            const candScore = candidate.positions[ax.id] !== undefined ? candidate.positions[ax.id] : 0;
            const diff = userAxisScores[ax.id] - candScore;
            sumSq += diff * diff;
        });
        const distance = Math.sqrt(sumSq);
        const percentage = Math.max(0, 100 * (1 - (distance / maxDistance)));
        return { ...candidate, distance, percentage: Math.round(percentage) };
    });

    // Sort by percentage descending
    candidates.sort((a, b) => b.percentage - a.percentage);

    // Deshabilitar botón de comentario hasta que el guardado termine
    const fbBtn = document.getElementById('feedback-submit-btn');
    if (fbBtn) {
        fbBtn.disabled = true;
        fbBtn.textContent = 'Guardando...';
    }

    // Guardar en Supabase (sin bloquear la UI)
    saveResponse(userAnswers, window.lastUserAxisScores, candidates);

    // ===================================
    // Render user profile axes
    // ===================================
    const userProfileAxes = document.getElementById('user-profile-axes');
    if (userProfileAxes) {
        const profileGen = generateProfileSummary(userAxisScores);
        userProfileAxes.innerHTML = `
            <div id="user-profile-summary" style="margin-bottom: 1.5rem; padding: 1.25rem; background: rgba(59, 130, 246, 0.1); border-left: 4px solid var(--primary); border-radius: 8px;">
                <h3 style="color: var(--primary); margin: 0 0 0.5rem 0; font-size: 1.35rem; font-weight: 700;">${profileGen.title}</h3>
                <p style="line-height: 1.5; font-size: 0.95rem; margin: 0; color: var(--text-main);">${profileGen.desc}</p>
            </div>
        `;

        const axesArray = Object.values(quizData.axes);
        axesArray.forEach((ax, index) => {
            const userScore = userAxisScores[ax.id];
            const userPct = ((userScore + 1) / 2) * 100;
            
            let tendencyText = '';
            if (userScore < -0.2) tendencyText = ax.pole_negative;
            else if (userScore > 0.2) tendencyText = ax.pole_positive;
            else tendencyText = "Centro / Moderado";

                // Obtener iconos SVG
                const axId = ax.id;
                let negIcon = '';
                let posIcon = '';
                switch(axId) {
                    case 1: // Económico
                        negIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>';
                        posIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>';
                        break;
                    case 2: // Seguridad
                        negIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>';
                        posIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>';
                        break;
                    case 3: // Moral
                        negIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
                        posIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>';
                        break;
                    case 4: // Cultural
                        negIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
                        posIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>';
                        break;
                    case 5: // Ambiental
                        negIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>';
                        posIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>';
                        break;
                    case 6: // Internacional
                        negIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>';
                        posIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>';
                        break;
                    case 7: // Liderazgo
                        negIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="3"></circle><line x1="12" y1="22" x2="12" y2="8"></line><path d="M5 12H2a10 10 0 0 0 20 0h-3"></path></svg>';
                        posIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>';
                        break;
                    case 8: // Institucional
                        negIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>';
                        posIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>';
                        break;
                    case 9: // Política social
                        negIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>';
                        posIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>';
                        break;
                    default:
                        negIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>';
                        posIcon = negIcon;
                }

            const item = document.createElement('div');
            item.className = 'axis-item animate-in';
            item.style.padding = '0.75rem 0';
            if (index !== axesArray.length - 1) {
                item.style.borderBottom = '1px solid rgba(255, 255, 255, 0.05)';
            }
            
            item.innerHTML = `
                <div class="axis-header" style="justify-content: space-between; margin-bottom: 0.5rem; display: flex;">
                    <span class="axis-pole-negative" style="display:flex; align-items:center; gap:0.4rem; flex:1; text-align:left; ${userScore < -0.2 ? 'font-weight:bold;color:var(--primary)' : 'opacity:0.6'}">
                        ${negIcon} ${ax.pole_negative}
                    </span>
                    <span class="axis-pole-positive" style="display:flex; align-items:center; justify-content:flex-end; gap:0.4rem; flex:1; text-align:right; ${userScore > 0.2 ? 'font-weight:bold;color:var(--danger)' : 'opacity:0.6'}">
                        ${ax.pole_positive} ${posIcon}
                    </span>
                </div>
                <div class="axis-bar-container" style="height: 12px; margin: 12px 0;">
                    <span class="axis-center-line"></span>
                    <div class="axis-track" style="height: 12px; border-radius: 6px;"></div>
                    <div class="user-marker" style="left: ${userPct}%; width: 22px; height: 22px; border-radius: 50%; background: #ffcd00; border: 2.5px solid #fff; box-shadow: 0 2px 7px rgba(0,0,0,0.5);"></div>
                </div>
            `;
            userProfileAxes.appendChild(item);
        });
    }

    resultsList.innerHTML = '';
    candidates.forEach((c, index) => {
        const card = document.createElement('div');
        card.className = 'candidate-card';
        card.style.cursor = 'pointer';
        card.onclick = () => showCandidateDetail(c, true);

        // Use a default image if not found
        const photoPath = c.photo || 'https://via.placeholder.com/150?text=Lider';
        const partyPath = c.partyLogo || 'https://via.placeholder.com/60?text=P';


        card.innerHTML = `
            <div class="rank-number">#${index + 1}</div>
            <div class="candidate-image-container">
                <img src="${photoPath}" alt="${c.name}" class="candidate-photo">
                <img src="${partyPath}" alt="${c.party}" class="party-logo-mini">
            </div>
            <div class="candidate-info">
                <div class="candidate-name">${c.name}</div>
                <div class="candidate-party">${c.party}</div>
                <div class="match-bar-bg">
                    <div class="match-bar-fill" style="width: ${c.percentage}%"></div>
                </div>
            </div>
            <div class="match-percentage">
                <div class="percentage-value">${c.percentage}%</div>
                <div class="percentage-label">Afinidad</div>
            </div>
        `;
        resultsList.appendChild(card);
    });

    // Llenar y conectar botones de compartir
    const top3 = candidates.slice(0, 3);
    populateShareCard();
    document.getElementById('btn-download').onclick = () => captureAndDownload();
    document.getElementById('btn-share-native').onclick = () => shareToPlatform('native', top3);
    document.getElementById('btn-twitter').onclick = () => shareToPlatform('twitter', top3);
    document.getElementById('btn-facebook').onclick = () => shareToPlatform('facebook', top3);
    document.getElementById('btn-whatsapp').onclick = () => shareToPlatform('whatsapp', top3);
    document.getElementById('btn-instagram').onclick = () => shareToPlatform('instagram', top3);

    // Conectar botón para revelar líderes
    const btnShowLeaders = document.getElementById('btn-show-leaders');
    const leadersContainer = document.getElementById('secondary-results-container');
    if (btnShowLeaders && leadersContainer) {
        btnShowLeaders.onclick = () => {
            if (leadersContainer.style.display === 'none') {
                leadersContainer.style.display = 'block';
                leadersContainer.classList.add('animate-in');
                btnShowLeaders.textContent = 'Ocultar líderes similares';
            } else {
                leadersContainer.style.display = 'none';
                leadersContainer.classList.remove('animate-in');
                btnShowLeaders.textContent = 'Ver líderes similares';
            }
        };
    }
}

startBtn.onclick = showNameScreen;
viewAnswersBtn.onclick = showAnswersScreen;
backToLandingBtn.onclick = () => {
    if (cameFromResults) {
        answersScreen.classList.add('hidden');
        resultsScreen.classList.remove('hidden');
        resultsScreen.classList.add('animate-in');
        cameFromResults = false;
    } else {
        if (!candidateDetailView.classList.contains('hidden')) {
            candidateDetailView.classList.add('hidden');
            candidatesGrid.classList.remove('hidden');
            candidatesGrid.classList.add('animate-in');
        } else {
            answersScreen.classList.add('hidden');
            landing.classList.remove('hidden');
            landing.classList.add('animate-in');
        }
    }
};
restartBtn.onclick = () => {
    resultsScreen.classList.add('hidden');
    landing.classList.remove('hidden');
    landing.classList.add('animate-in');
};

init();

// --- Generación Automática de Perfil ---
function generateProfileSummary(s) {
    let title = "Centro / Moderado";
    let desc = "Presentas una postura equilibrada y pragmática, valorando el consenso y evitando los extremos ideológicos y las dogmatizaciones polarizantes.";

    // Umbrales para claridad
    const has = (axis, dir, threshold = 0.3) => (dir > 0) ? s[axis] > threshold : s[axis] < -threshold;

    const isEconInterv = has(1, -1);
    const isEconFree = has(1, 1);
    const isPunitive = has(2, 1);
    const isMoralNeutral = has(3, -1);
    const isMoral = has(3, 1);
    const isProgCult = has(4, -1);
    const isConsvCult = has(4, 1);
    const isTech = has(7, 1) && has(8, -1); // Pragmatismo + Institucionalidad
    const isRuptura = has(8, 1);

    // Combinaciones principales
    const isProg = isProgCult && isMoralNeutral;
    const isConsv = isConsvCult && isMoral;
    const isUribista = isPunitive && isEconFree && isConsvCult;
    const isLibertarian = isEconFree && isMoralNeutral && isProgCult;
    const isIzquierdaRadical = isEconInterv && isRuptura && isProg;

    if (isIzquierdaRadical) {
        title = "Izquierda / Rupturista";
        desc = "Crees en transformaciones sociales y económicas de raíz. Prefieres una fuerte intervención del Estado en el mercado y no temes alterar el modelo institucional tradicional para lograr equidad real.";
    } else if (isUribista) {
        title = "Derecha / Conservador Punitivo";
        desc = "Privilegias fuertemente el orden, la mano dura en seguridad y confías en la máxima libertad de mercado, alineándote con visiones clásicas de la derecha histórica colombiana.";
    } else if (isLibertarian) {
        title = "Liberalismo Puro / Libertario";
        desc = "Valoras la libertad individual frente a todo: crees en el libre mercado puro y rechazas tajantemente que el Estado imponga dogmas morales, directrices culturales o reglas económicas.";
    } else if (isProg && isEconInterv) {
        title = "Centro-Izquierda / Progresista";
        desc = "Defiendes a un Estado social que actúe para reducir desigualdades, de la mano de una visión moderna que busca avanzar en libertades humanas y prevenir la inseguridad sobre bases sociales.";
    } else if (isTech && isProg) {
        title = "Tecnócrata Progresista";
        desc = "Respaldas avances sociales, inclusivos y de derechos civiles, pero crees firmemente que esos logros se deben estructurar cuidando la economía, el pragmatismo estadístico y las instituciones.";
    } else if (isTech && isConsv) {
        title = "Tecnócrata Conservador";
        desc = "Combinas un profundo sentido tradicional de respeto por los valores y costumbres y las instituciones, y exiges resultados pragmáticos y de evidencia en la gestión del progreso estatal.";
    } else if (isConsv && isEconInterv) {
        title = "Conservador Social";
        desc = "Tus prioridades morales te hacen rechazar los movimientos culturales progresistas, pero distas de la derecha pura porque sí apoyas intervenciones del Estado para cuidar a los más vulnerables en la economía.";
    } else if (isProg) {
        title = "Liberal Progresista";
        desc = "Te identificas fuertemente con la tolerancia cultural, el avance de nuevos derechos identitarios y el progreso de las libertades sociales, priorizándolo mucho en tu agenda política.";
    } else if (isConsv) {
        title = "Conservador / Statu Quo";
        desc = "Tu visión resplandece en proteger los valores tradicionales de la familia, el orden y las costumbres. Desconfías profundamente de rupturas morales y de un progresismo cultural acelerado.";
    } else if (isTech) {
        title = "Centro Institucional / Pragmatista";
        desc = "Rechazas el fanatismo ideológico visceral. Valoras tomar decisiones frías apoyadas con datos, defenderás todo aquello que asegure fortaleza para las instituciones e impulso económico de largo plazo.";
    }

    // Matices
    let matices = [];
    if (s[5] < -0.5) matices.push("Destacas por tu compromiso riguroso en temas ambientales y de defensa del clima.");
    if (s[6] < -0.5) matices.push("Tienes un fuerte tinte soberanista protector sobre las importaciones e intervenciones externas.");
    
    if (matices.length > 0) {
        desc += " " + matices.slice(0, 1).join(" ");
    }

    return { title, desc };
}
