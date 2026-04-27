// Initialization & Mock Database Setup
if (!localStorage.getItem('users')) {
    localStorage.setItem('users', JSON.stringify([
        { username: 'student', pass: '123', role: 'student' },
        { username: 'admin', pass: '123', role: 'admin' },
        { username: 'sarah_dev', pass: '123', role: 'student' },
        { username: 'alex_ml', pass: '123', role: 'student' }
    ]));
}

{
    const users = JSON.parse(localStorage.getItem('users')) || [];
    let changed = false;
    [
        { username: 'sarah_dev', pass: '123', role: 'student' },
        { username: 'alex_ml', pass: '123', role: 'student' }
    ].forEach((seedUser) => {
        if (!users.find((u) => u.username === seedUser.username)) {
            users.push(seedUser);
            changed = true;
        }
    });
    if (changed) localStorage.setItem('users', JSON.stringify(users));
}

if (!localStorage.getItem('projects')) {
    localStorage.setItem('projects', JSON.stringify([
        {
            id: 1,
            author: 'sarah_dev',
            time: Date.now() - 7200000,
            title: 'Campus Lost & Found App',
            desc: 'Building a cross-platform app using React Native for students to report lost items. Need a UI designer!',
            likes: ['admin'],
            comments: [{ user: 'admin', text: 'I can help with the Figma designs!' }]
        },
        {
            id: 2,
            author: 'alex_ml',
            time: Date.now() - 18000000,
            title: 'Library Seat Predictor',
            desc: 'Using historical occupancy data to train a model that predicts library availability during finals week.',
            likes: [],
            comments: []
        }
    ]));
}

if (!localStorage.getItem('collabRequests')) localStorage.setItem('collabRequests', JSON.stringify([]));
if (!localStorage.getItem('messages')) localStorage.setItem('messages', JSON.stringify([]));

{
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const projects = JSON.parse(localStorage.getItem('projects')) || [];
    const reqs = JSON.parse(localStorage.getItem('collabRequests')) || [];
    if (currentUser && currentUser.role === 'admin') {
        const inboxRequests = reqs.filter((r) => r.to === currentUser.username && r.status === 'pending');
        if (!inboxRequests.length && projects.length) {
            const seedProject = projects[0];
            if (!reqs.find((r) => r.projectId === seedProject.id && r.from === seedProject.author && r.to === currentUser.username)) {
                reqs.push({ from: seedProject.author, to: currentUser.username, projectId: seedProject.id, status: 'pending', time: Date.now() });
                localStorage.setItem('collabRequests', JSON.stringify(reqs));
            }
        }
    }
}

let currentFeedMode = 'explore';
const SESSION_TIMEOUT_MS = 20 * 1000;
let sessionTimerId = null;
let activityListenersAttached = false;

window.onload = () => {
    initUI();
    checkAuth();
    runStats();
};

function initUI() {
    window.addEventListener('scroll', () => {
        const nav = document.getElementById('top-nav');
        if (window.scrollY > 20) nav.classList.add('nav-scrolled');
        else nav.classList.remove('nav-scrolled');
    });

    window.openAuth = openAuth;
    window.closeAuth = closeAuth;
    window.loginUser = loginUser;
    window.registerUser = registerUser;
    window.logout = logout;
    window.postProject = postProject;
    window.toggleComments = toggleComments;
    window.addComment = addComment;
    window.requestCollab = requestCollab;
    window.handleCollabAction = handleCollabAction;
    window.sendMessage = sendMessage;
    window.showExploreFeed = () => switchTab(0, 'explore');
    window.showMyProjects = () => switchTab(1, 'my_projects');
    window.showCollabRequests = () => switchTab(2, 'requests');
    window.toggleLike = toggleLike;
}

function loadWithDelay(callback) {
    const feed = document.getElementById('explore-feed');
    const loader = document.getElementById('feed-loader');
    feed.innerHTML = '';
    loader.classList.remove('hidden');

    setTimeout(() => {
        loader.classList.add('hidden');
        callback();
    }, 600);
}

function checkAuth() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const authEls = document.querySelectorAll('.auth-required');
    const hero = document.getElementById('hero-section');
    const btnLogin = document.getElementById('btn-login');

    if (user) {
        hero.classList.add('hidden');
        btnLogin.classList.add('hidden');
        document.getElementById('display-user').innerText = `@${user.username}`;
        document.getElementById('display-role').innerText = user.role;
        document.getElementById('nav-avatar').innerText = user.username.charAt(0).toUpperCase();
        document.getElementById('display-avatar').innerText = user.username.charAt(0).toUpperCase();

        authEls.forEach((el) => el.classList.remove('hidden'));
        ensureActivityListeners();
        startSessionTimer();
        updateBadges();
        updatePulse();
        switchTab(0, 'explore');
    } else {
        stopSessionTimer();
        hero.classList.remove('hidden');
        btnLogin.classList.remove('hidden');
        authEls.forEach((el) => el.classList.add('hidden'));
    }
}

function ensureActivityListeners() {
    if (activityListenersAttached) return;

    const events = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];
    events.forEach((eventName) => {
        window.addEventListener(eventName, resetSessionTimer, { passive: true });
    });

    activityListenersAttached = true;
}

function startSessionTimer() {
    resetSessionTimer();
}

function stopSessionTimer() {
    if (sessionTimerId) {
        clearTimeout(sessionTimerId);
        sessionTimerId = null;
    }
}

function resetSessionTimer() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
        stopSessionTimer();
        return;
    }

    stopSessionTimer();
    sessionTimerId = setTimeout(() => {
        autoEndSession();
    }, SESSION_TIMEOUT_MS);
}

function autoEndSession() {
    localStorage.removeItem('currentUser');
    checkAuth();
    showToast('Session ended due to 20 seconds of inactivity.', 'info');
}

function switchTab(index, mode) {
    const links = document.querySelectorAll('.side-links li');
    links.forEach((li, i) => li.classList.toggle('active-link', i === index));
    currentFeedMode = mode;

    loadWithDelay(() => {
        if (mode === 'explore') {
            document.getElementById('project-composer').classList.remove('hidden');
            renderFeed();
        } else if (mode === 'my_projects') {
            const user = JSON.parse(localStorage.getItem('currentUser'));
            const projects = JSON.parse(localStorage.getItem('projects')).filter((p) => p.author === user.username);
            document.getElementById('project-composer').classList.remove('hidden');
            renderFeed(projects);
        } else if (mode === 'requests') {
            document.getElementById('project-composer').classList.add('hidden');
            renderRequests();
        }
    });
}

function renderFeed(customProjects = null) {
    const feed = document.getElementById('explore-feed');
    const projects = customProjects || JSON.parse(localStorage.getItem('projects'));
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const requests = JSON.parse(localStorage.getItem('collabRequests'));

    if (!projects.length) {
        feed.innerHTML = `<div class="card empty-state"><i class="fa-solid fa-ghost fa-2x"></i><p>It's quiet here. Post the first project!</p></div>`;
        return;
    }

    const sorted = [...projects].sort((a, b) => b.time - a.time);

    feed.innerHTML = sorted
        .map((p, index) => {
            const isAuthor = user && p.author === user.username;
            const likes = p.likes || [];
            const hasLiked = user && likes.includes(user.username);
            const comments = p.comments || [];

            let collabStatus = null;
            if (user && !isAuthor) {
                collabStatus = requests.find((r) => r.projectId === p.id && r.from === user.username)?.status;
            }

            const likeAnimDelay = index * 0.1;

            return `
        <article class="card post" style="animation: slideIn 0.4s ease forwards ${likeAnimDelay}s; opacity: 0; transform: translateY(20px);">
            <div class="post-header">
                <div class="avatar">${p.author.charAt(0).toUpperCase()}</div>
                <div>
                    <div class="post-author">@${p.author}</div>
                    <div class="post-time">${formatTime(p.time)}</div>
                </div>
            </div>
            <h3 class="post-title">${escapeHTML(p.title)}</h3>
            <p class="post-content">${escapeHTML(p.desc)}</p>

            <div class="post-footer">
                <button class="action-btn ${hasLiked ? 'liked' : ''}" onclick="toggleLike(${p.id})">
                    <i class="fa-${hasLiked ? 'solid' : 'regular'} fa-heart"></i> ${likes.length}
                </button>
                <button class="action-btn" onclick="toggleComments(${p.id})">
                    <i class="fa-regular fa-comment"></i> ${comments.length}
                </button>
                ${!isAuthor ? `
                    <button class="action-btn action-collab" onclick="requestCollab(${p.id})" ${collabStatus ? 'disabled' : ''}>
                        <i class="fa-solid fa-handshake"></i> ${collabStatus === 'pending' ? 'Request Sent' : collabStatus === 'accepted' ? 'Collaborating' : 'Request Collab'}
                    </button>
                ` : ''}
            </div>

            <div id="comments-${p.id}" class="comments-section hidden">
                ${comments.length ? comments.map((c) => `
                    <div class="chat-message received" style="margin-bottom: 8px;">
                        <strong>@${escapeHTML(c.user)}</strong>
                        ${escapeHTML(c.text)}
                    </div>
                `).join('') : '<p style="color: var(--text-muted); font-size: 0.9rem;">No comments yet.</p>'}
                <div style="display: flex; gap: 8px; margin-top: 12px;">
                    <input type="text" id="comment-input-${p.id}" class="app-input" style="margin:0;" placeholder="Add a constructive thought...">
                    <button class="btn btn-primary" onclick="addComment(${p.id})"><i class="fa-solid fa-paper-plane"></i></button>
                </div>
            </div>
        </article>
        `;
        })
        .join('');
}

function toggleLike(projectId) {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return openAuth('login');

    const projects = JSON.parse(localStorage.getItem('projects'));
    const p = projects.find((x) => x.id === projectId);
    if (!p.likes) p.likes = [];

    if (p.likes.includes(user.username)) {
        p.likes = p.likes.filter((u) => u !== user.username);
    } else {
        p.likes.push(user.username);
    }

    localStorage.setItem('projects', JSON.stringify(projects));
    if (currentFeedMode === 'explore') renderFeed();
    else if (currentFeedMode === 'my_projects') showMyProjects();
}

function postProject() {
    const title = document.getElementById('new-project-title').value.trim();
    const desc = document.getElementById('new-project-desc').value.trim();
    const user = JSON.parse(localStorage.getItem('currentUser'));

    if (!title || !desc) return showToast('Please fill out both fields.', 'error');

    const projects = JSON.parse(localStorage.getItem('projects'));
    projects.push({ id: Date.now(), author: user.username, time: Date.now(), title, desc, likes: [], comments: [] });

    localStorage.setItem('projects', JSON.stringify(projects));
    document.getElementById('new-project-title').value = '';
    document.getElementById('new-project-desc').value = '';

    showToast('Project launched successfully!', 'success');
    switchTab(0, 'explore');
    updatePulse();
}

function renderRequests() {
    const feed = document.getElementById('explore-feed');
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const reqs = JSON.parse(localStorage.getItem('collabRequests')).filter((r) => r.to === user.username || r.from === user.username);

    if (!reqs.length) {
        feed.innerHTML = `<div class="card empty-state"><i class="fa-solid fa-mug-hot fa-2x"></i><p>No active collaborations or requests yet.</p></div>`;
        return;
    }

    feed.innerHTML = [...reqs]
        .reverse()
        .map((r) => {
            const isInbox = r.to === user.username;
            const otherUser = isInbox ? r.from : r.to;

            let actionsHtml = '';
            if (isInbox && r.status === 'pending') {
                actionsHtml = `
                <div style="display:flex; gap: 8px; margin-top: 12px;">
                    <button class="btn btn-primary" onclick="handleCollabAction(${r.projectId}, '${r.from}', 'accepted')">Accept</button>
                    <button class="btn btn-ghost" onclick="handleCollabAction(${r.projectId}, '${r.from}', 'rejected')">Decline</button>
                </div>
            `;
            }

            let chatHtml = '';
            if (r.status === 'accepted') {
                chatHtml = `
                <div class="chat-history" id="chat-${r.projectId}-${otherUser}">
                    ${renderChatBubbles(r.projectId, user.username, otherUser)}
                </div>
                <div style="display: flex; gap: 8px;">
                    <input type="text" id="msg-${r.projectId}-${otherUser}" class="app-input" style="margin:0;" placeholder="Message @${otherUser}..." onkeypress="if(event.key === 'Enter') sendMessage(${r.projectId}, '${otherUser}')">
                    <button class="btn btn-primary" onclick="sendMessage(${r.projectId}, '${otherUser}')"><i class="fa-solid fa-paper-plane"></i></button>
                </div>
            `;
            }

            return `
            <div class="card post" style="animation: slideIn 0.3s ease forwards;">
                <div style="display:flex; align-items:center; gap: 10px; margin-bottom: 10px;">
                    <div class="avatar">${otherUser.charAt(0).toUpperCase()}</div>
                    <div>
                        <strong>@${otherUser}</strong>
                        <div style="font-size:0.8rem; color:var(--text-muted);">Regarding Project #${r.projectId}</div>
                    </div>
                    <span class="badge" style="background: ${r.status === 'accepted' ? '#10b981' : r.status === 'rejected' ? '#f43f5e' : '#f59e0b'}; margin-left:auto;">
                        ${r.status.toUpperCase()}
                    </span>
                </div>
                ${actionsHtml}
                ${chatHtml}
            </div>
        `;
        })
        .join('');

    setTimeout(() => {
        document.querySelectorAll('.chat-history').forEach((el) => {
            el.scrollTop = el.scrollHeight;
        });
    }, 50);
}

function renderChatBubbles(projectId, me, them) {
    const msgs = JSON.parse(localStorage.getItem('messages')).filter(
        (m) => m.projectId === projectId && ((m.from === me && m.to === them) || (m.from === them && m.to === me))
    );
    if (!msgs.length) return `<p style="text-align:center; color:var(--text-muted); font-size:0.9rem;">Start the conversation!</p>`;

    return msgs
        .map(
            (m) => `
        <div class="chat-message ${m.from === me ? 'sent' : 'received'}">
            ${m.from !== me ? `<strong>@${m.from}</strong>` : ''}
            ${escapeHTML(m.text)}
        </div>
    `
        )
        .join('');
}

function sendMessage(projectId, toUser) {
    const input = document.getElementById(`msg-${projectId}-${toUser}`);
    if (!input || !input.value.trim()) return;

    const user = JSON.parse(localStorage.getItem('currentUser'));
    const msgs = JSON.parse(localStorage.getItem('messages'));
    msgs.push({ projectId, from: user.username, to: toUser, text: input.value.trim(), time: Date.now() });

    localStorage.setItem('messages', JSON.stringify(msgs));
    renderRequests();
}

function requestCollab(projectId) {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return openAuth('login');

    const projects = JSON.parse(localStorage.getItem('projects'));
    const p = projects.find((x) => x.id === projectId);

    const reqs = JSON.parse(localStorage.getItem('collabRequests'));
    const duplicate = reqs.find((r) => r.projectId === projectId && r.from === user.username && r.status === 'pending');
    if (duplicate) return;

    reqs.push({ from: user.username, to: p.author, projectId, status: 'pending', time: Date.now() });
    localStorage.setItem('collabRequests', JSON.stringify(reqs));

    showToast(`Request sent to @${p.author}!`, 'success');
    renderFeed();
}

function handleCollabAction(projectId, fromUser, action) {
    const reqs = JSON.parse(localStorage.getItem('collabRequests'));
    const idx = reqs.findIndex((r) => r.projectId === projectId && r.from === fromUser);
    if (idx > -1) {
        reqs[idx].status = action;
        localStorage.setItem('collabRequests', JSON.stringify(reqs));
        renderRequests();
        updateBadges();
    }
}

function openAuth(type) {
    const modal = document.getElementById('auth-modal');
    modal.classList.remove('hidden');
    document.getElementById('form-login').classList.toggle('active', type === 'login');
    document.getElementById('form-login').classList.toggle('hidden', type !== 'login');
    document.getElementById('form-register').classList.toggle('active', type === 'register');
    document.getElementById('form-register').classList.toggle('hidden', type !== 'register');
    document.getElementById('auth-title').innerText = type === 'login' ? 'Welcome Back' : 'Join Platform';
}

function closeAuth() {
    document.getElementById('auth-modal').classList.add('hidden');
}

function loginUser() {
    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value.trim();
    const user = JSON.parse(localStorage.getItem('users')).find((x) => x.username === u && x.pass === p);
    if (user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
        closeAuth();
        checkAuth();
        resetSessionTimer();
        showToast(`Welcome back, @${user.username}!`, 'success');
    } else {
        showToast('Invalid credentials.', 'error');
    }
}

function registerUser() {
    const u = document.getElementById('reg-username').value.trim();
    const p = document.getElementById('reg-password').value.trim();
    const r = document.getElementById('reg-role').value;
    const users = JSON.parse(localStorage.getItem('users'));

    if (!u || !p) return showToast('Fill all fields.', 'error');
    if (users.find((x) => x.username === u)) return showToast('Username taken.', 'error');

    users.push({ username: u, pass: p, role: r });
    localStorage.setItem('users', JSON.stringify(users));
    showToast('Account created! Please log in.', 'success');
    openAuth('login');
}

function logout() {
    localStorage.removeItem('currentUser');
    stopSessionTimer();
    checkAuth();
    showToast('Signed out successfully.');
}

function toggleComments(id) {
    document.getElementById(`comments-${id}`).classList.toggle('hidden');
}

function addComment(projectId) {
    const val = document.getElementById(`comment-input-${projectId}`).value.trim();
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return openAuth('login');
    if (!val) return;

    const projects = JSON.parse(localStorage.getItem('projects'));
    projects.find((p) => p.id === projectId).comments.push({ user: user.username, text: val });
    localStorage.setItem('projects', JSON.stringify(projects));

    if (currentFeedMode === 'explore') renderFeed();
    else showMyProjects();

    setTimeout(() => toggleComments(projectId), 50);
    updatePulse();
}

function showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const t = document.createElement('div');
    const icon = type === 'success' ? 'circle-check' : type === 'error' ? 'circle-exclamation' : 'bell';
    t.className = 'toast';
    t.innerHTML = `<i class="fa-solid fa-${icon}"></i> ${msg}`;
    container.appendChild(t);
    setTimeout(() => {
        t.classList.add('fade-out');
        setTimeout(() => t.remove(), 300);
    }, 3000);
}

function updateBadges() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;
    const reqs = JSON.parse(localStorage.getItem('collabRequests')).filter((r) => r.to === user.username && r.status === 'pending');
    const badge = document.getElementById('req-badge');
    badge.innerText = reqs.length > 0 ? reqs.length : '';
    badge.style.display = reqs.length ? 'inline-block' : 'none';
}

function updatePulse() {
    const p = JSON.parse(localStorage.getItem('projects'));
    const totalComms = p.reduce((acc, curr) => acc + (curr.comments?.length || 0), 0);
    document.getElementById('live-pulse-text').innerHTML = `
        <strong>${p.length}</strong> active projects tracking<br>
        <strong>${totalComms}</strong> thoughts shared<br>
        <span style="color:var(--accent-a); font-size:0.85rem; display:block; margin-top:8px;">Updated just now</span>
    `;
}

function formatTime(ms) {
    const diff = Date.now() - ms;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    return Math.floor(diff / 86400000) + 'd ago';
}

function escapeHTML(str) {
    return String(str).replace(/[&<>'"]/g, (tag) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag]));
}

function runStats() {
    document.querySelectorAll('.stat-box h2').forEach((el) => {
        const target = Number(el.getAttribute('data-target'));
        let c = 0;
        const timer = setInterval(() => {
            c += Math.ceil(target / 40);
            if (c >= target) {
                clearInterval(timer);
                el.innerText = target + '+';
            } else {
                el.innerText = String(c);
            }
        }, 30);
    });
}
