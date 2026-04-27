// --- 1. INITIALIZE DATABASE ---
function initializeData() {
    if (!localStorage.getItem('users')) {
        localStorage.setItem('users', JSON.stringify([
            { username: "student", pass: "123", role: "student", joinedClasses: ["KL-1234"] },
            { username: "admin", pass: "123", role: "admin" },
            { username: "sarah", pass: "123", role: "student", joinedClasses: [] }
        ]));
    }
    if (!localStorage.getItem('classrooms')) {
        localStorage.setItem('classrooms', JSON.stringify([{
            classCode: "KL-1234", className: "FSAD Section A", adminName: "admin",
            students: ["student"], requests: [], 
            posts: [{ id: 1, type: "announcement", title: "Reviews tomorrow.", time: "1 day ago" }]
        }]));
    }
    if (!localStorage.getItem('projects')) {
        localStorage.setItem('projects', JSON.stringify([
            { id: 1, author: "sarah", role: "student", time: "2h ago", title: "React Native UI", desc: "Need feedback on color contrast.", comments: [] }
        ]));
    }
    if (!localStorage.getItem('collabRequests')) {
        localStorage.setItem('collabRequests', JSON.stringify([
            { id: 101, from: "sarah", to: "admin", projectTitle: "React Native UI", status: "pending" }
        ]));
    }
    if (!localStorage.getItem('messages')) {
        localStorage.setItem('messages', JSON.stringify([
            { id: 1, from: "sarah", to: "student", text: "Hey! Thanks for accepting the collab.", time: "10:00 AM" }
        ]));
    }
}
initializeData();
let activeClassCode = null;
let currentChatUser = null;
const SESSION_TIMEOUT_MS = 2 * 1000;
let sessionTimerId = null;
let activityListenersAttached = false;

// --- 2. AUTH & ROUTING ---
window.onload = function() { checkAuth(); };

function checkAuth() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (user) {
        document.getElementById('hero-section').style.display = 'none';
        document.getElementById('top-nav').style.display = 'none';
        document.getElementById('app-layout').classList.remove('hidden');
        
        document.getElementById('display-user').innerText = "@" + user.username;
        document.getElementById('nav-avatar').innerText = user.username.charAt(0).toUpperCase();
        document.getElementById('display-role').innerText = user.role.toUpperCase();
        
        ensureActivityListeners();
        startSessionTimer();
        switchTab('explore');
        checkNotifications();
    } else {
        stopSessionTimer();
        document.getElementById('hero-section').style.display = 'flex';
        document.getElementById('top-nav').style.display = 'flex';
        document.getElementById('app-layout').classList.add('hidden');
    }
}

function switchTab(tab) {
    document.querySelectorAll('.side-links li').forEach(el => el.classList.remove('active-link'));
    const navItem = document.getElementById(`nav-${tab}`);
    if(navItem) navItem.classList.add('active-link');

    document.querySelectorAll('main.feed').forEach(el => el.classList.add('hidden'));
    const viewItem = document.getElementById(`view-${tab}`);
    if(viewItem) viewItem.classList.remove('hidden');

    if (tab === 'explore') renderExploreFeed();
    if (tab === 'classroom') renderClassroomsList();
    if (tab === 'collabs') renderCollabs();
    if (tab === 'messages') renderMessages();
}

function checkNotifications() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if(!user) return;
    const reqs = JSON.parse(localStorage.getItem('collabRequests')) || [];
    
    const pendingReqs = reqs.filter(r => r.to === user.username && r.status === 'pending').length;
    const badge = document.getElementById('collab-badge');
    if (pendingReqs > 0) { 
        badge.classList.remove('hidden'); 
        badge.innerText = pendingReqs; 
    } else { 
        badge.classList.add('hidden'); 
    }
}

// --- 3. EXPLORE FEED ---
function renderExploreFeed() {
    const feed = document.getElementById('explore-feed');
    const projects = JSON.parse(localStorage.getItem('projects')) || [];
    feed.innerHTML = ''; 

    if (projects.length === 0) {
        feed.innerHTML = '<p style="color:#86868b; text-align:center;">No projects in the explore feed yet.</p>';
        return;
    }

    projects.slice().reverse().forEach(p => {
        const commentsArr = p.comments || []; 
        let commentsHTML = '';
        if (commentsArr.length > 0) {
            commentsArr.forEach(c => { 
                commentsHTML += `<div class="comment"><strong>@${c.user}</strong><span>${c.text}</span></div>`; 
            });
        }

        feed.innerHTML += `
            <div class="glass-card post fade-in-up">
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
                    <div class="avatar">${p.author.charAt(0).toUpperCase()}</div>
                    <div><div style="font-weight:600; font-size:15px;">@${p.author}</div><div style="color:#86868b; font-size:12px;">${p.time}</div></div>
                </div>
                <div style="font-size:18px; font-weight:600; margin-bottom:8px;">${p.title}</div>
                <div style="color:#1d1d1f; line-height:1.5; margin-bottom:15px;">${p.desc}</div>
                
                <div style="display:flex; gap:15px; border-top:1px solid #e5e5ea; padding-top:12px;">
                    <button style="background:none; border:none; color:#86868b; font-weight:600; cursor:pointer;" onclick="toggleComments(${p.id})">💬 Comment (${commentsArr.length})</button>
                    <button style="background:none; border:none; color:#0071e3; font-weight:600; cursor:pointer;" onclick="sendCollabRequest('${p.author}', '${p.title}')">🤝 Request Collab</button>
                </div>

                <div id="comments-${p.id}" class="comments-section hidden" onclick="event.stopPropagation()">
                    ${commentsHTML}
                    <div style="display:flex; gap:10px; margin-top:10px;">
                        <input type="text" id="comment-input-${p.id}" class="light-input focus-ring" placeholder="Write a constructive review..." style="margin-bottom:0;">
                        <button class="primary-btn hover-scale" onclick="addComment(${p.id})">Post</button>
                    </div>
                </div>
            </div>`;
    });
}

function postProject() {
    const title = document.getElementById('new-project-title').value.trim();
    const desc = document.getElementById('new-project-desc').value.trim();
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!title || !desc) return alert("Please enter a title and description.");

    let projects = JSON.parse(localStorage.getItem('projects')) || [];
    projects.push({ id: Date.now(), author: user.username, role: user.role, time: "Just now", title, desc, comments: [] });
    localStorage.setItem('projects', JSON.stringify(projects));
    document.getElementById('new-project-title').value = '';
    document.getElementById('new-project-desc').value = '';
    renderExploreFeed();
}

function toggleComments(id) { 
    const el = document.getElementById(`comments-${id}`);
    if(el) el.classList.toggle('hidden'); 
}

function addComment(projectId) {
    const input = document.getElementById(`comment-input-${projectId}`);
    const text = input.value.trim();
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!text) return;
    
    let projects = JSON.parse(localStorage.getItem('projects'));
    let project = projects.find(p => p.id === projectId);
    
    if(!project.comments) project.comments = []; 
    project.comments.push({ user: user.username, text: text });
    
    localStorage.setItem('projects', JSON.stringify(projects));
    renderExploreFeed();
    setTimeout(() => toggleComments(projectId), 10); 
}

// --- 4. COLLAB REQUESTS ---
function sendCollabRequest(toUser, projectTitle) {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (user.username === toUser) return alert("You can't request collaboration with yourself!");
    let reqs = JSON.parse(localStorage.getItem('collabRequests')) || [];
    if (reqs.find(r => r.from === user.username && r.to === toUser && r.projectTitle === projectTitle)) {
        return alert("Request already sent!");
    }
    reqs.push({ id: Date.now(), from: user.username, to: toUser, projectTitle: projectTitle, status: 'pending' });
    localStorage.setItem('collabRequests', JSON.stringify(reqs));
    alert(`Collaboration request sent to @${toUser}!`);
}

function renderCollabs() {
    const feed = document.getElementById('collabs-feed');
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const reqs = JSON.parse(localStorage.getItem('collabRequests')) || [];
    const myRequests = reqs.filter(r => r.to === user.username);

    if (myRequests.length === 0) {
        feed.innerHTML = '<p style="color:#86868b; text-align:center;">You have no collaboration requests yet.</p>';
        return;
    }

    feed.innerHTML = '';
    myRequests.slice().reverse().forEach(req => {
        let actionHTML = '';
        if (req.status === 'pending') {
            actionHTML = `<div style="display:flex; gap:10px; margin-top: 15px;">
                    <button class="btn-small btn-accept" onclick="handleCollab(${req.id}, 'accepted')">Accept Request</button>
                    <button class="btn-small btn-remove" onclick="handleCollab(${req.id}, 'rejected')">Decline</button>
                </div>`;
        } else if (req.status === 'accepted') {
            actionHTML = `<div style="margin-top:15px; color:#137333; font-weight:600; font-size:13px;">✅ You are now collaborating! Check the Messages tab.</div>`;
        } else {
            actionHTML = `<div style="margin-top:15px; color:#c5221f; font-weight:600; font-size:13px;">❌ Request declined.</div>`;
        }

        feed.innerHTML += `
            <div class="glass-card fade-in-up" style="margin-bottom:15px; padding:20px; border-left: 4px solid #0071e3;">
                <div style="font-size: 14px; color: #1d1d1f;"><strong style="color:#0071e3;">@${req.from}</strong> wants to collaborate with you on:</div>
                <div style="font-size: 18px; font-weight: 600; margin-top: 5px;">${req.projectTitle}</div>
                ${actionHTML}
            </div>`;
    });
    checkNotifications();
}

function handleCollab(reqId, newStatus) {
    let reqs = JSON.parse(localStorage.getItem('collabRequests'));
    let request = reqs.find(r => r.id === reqId);
    if (request) request.status = newStatus;
    localStorage.setItem('collabRequests', JSON.stringify(reqs));
    renderCollabs();
}

// --- 5. CHAT LOGIC ---
function renderMessages() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const reqs = JSON.parse(localStorage.getItem('collabRequests')) || [];
    
    let collaborators = new Set();
    reqs.forEach(r => {
        if (r.status === 'accepted') {
            if (r.from === user.username) collaborators.add(r.to);
            if (r.to === user.username) collaborators.add(r.from);
        }
    });

    const sidebar = document.getElementById('chat-contacts');
    sidebar.innerHTML = '';

    if (collaborators.size === 0) {
        sidebar.innerHTML = '<p style="color:#86868b; text-align:center; margin-top:20px; font-size:14px;">No active collaborations yet.<br>Accept a request to chat!</p>';
        return;
    }

    collaborators.forEach(contact => {
        const isActive = (currentChatUser === contact) ? 'active-chat' : '';
        sidebar.innerHTML += `
            <div class="contact-item ${isActive}" onclick="openChat('${contact}')">
                <div class="avatar" style="width:30px; height:30px; font-size:14px;">${contact.charAt(0).toUpperCase()}</div>
                <div>@${contact}</div>
            </div>`;
    });
}

function openChat(contactName) {
    currentChatUser = contactName;
    document.getElementById('chat-placeholder').classList.add('hidden');
    document.getElementById('chat-window').classList.remove('hidden');
    document.getElementById('chat-with-name').innerText = `@${contactName}`;
    renderMessages(); 
    renderChatHistory();
}

function renderChatHistory() {
    if (!currentChatUser) return;
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const allMsgs = JSON.parse(localStorage.getItem('messages')) || [];
    const historyDiv = document.getElementById('chat-history');
    
    const chatMsgs = allMsgs.filter(m => 
        (m.from === user.username && m.to === currentChatUser) || 
        (m.to === user.username && m.from === currentChatUser)
    );

    historyDiv.innerHTML = '';
    chatMsgs.forEach(m => {
        const isSent = m.from === user.username;
        const bubbleClass = isSent ? 'chat-sent' : 'chat-received';
        historyDiv.innerHTML += `<div class="chat-bubble ${bubbleClass}">${m.text}</div>`;
    });
    historyDiv.scrollTop = historyDiv.scrollHeight;
}

function sendMessage() {
    if (!currentChatUser) return;
    const input = document.getElementById('chat-message-input');
    const text = input.value.trim();
    if (!text) return;

    const user = JSON.parse(localStorage.getItem('currentUser'));
    let allMsgs = JSON.parse(localStorage.getItem('messages')) || [];
    
    allMsgs.push({ id: Date.now(), from: user.username, to: currentChatUser, text: text, time: "Just now" });
    localStorage.setItem('messages', JSON.stringify(allMsgs));
    
    input.value = '';
    renderChatHistory();
}

// --- 6. CLASSROOM HUB ---
function renderClassroomsList() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const classrooms = JSON.parse(localStorage.getItem('classrooms')) || [];
    
    document.getElementById('admin-single-class-view').classList.add('hidden');
    document.getElementById('student-single-class-view').classList.add('hidden');

    if (user.role === 'admin') {
        document.getElementById('admin-classroom-hub').classList.remove('hidden');
        document.getElementById('student-classroom-hub').classList.add('hidden');
        document.getElementById('admin-class-list-view').classList.remove('hidden');
        const myClasses = classrooms.filter(c => c.adminName === user.username);
        const listDiv = document.getElementById('admin-active-classes');
        listDiv.innerHTML = myClasses.length ? '' : '<p style="color:#86868b;">No active classrooms.</p>';
        myClasses.forEach(c => {
            const stuCount = c.students ? c.students.length : 0;
            listDiv.innerHTML += `<div class="glass-card class-post fade-in-up" onclick="openSingleClass('${c.classCode}', 'admin')"><h3 style="color:#0071e3; margin-bottom:5px;">${c.className}</h3><p style="font-size:13px; color:#86868b;">Code: ${c.classCode} • Students: ${stuCount}</p></div>`;
        });
    } else {
        document.getElementById('student-classroom-hub').classList.remove('hidden');
        document.getElementById('admin-classroom-hub').classList.add('hidden');
        document.getElementById('student-class-list-view').classList.remove('hidden');
        const listDiv = document.getElementById('student-active-classes');
        
        const joined = user.joinedClasses || [];
        listDiv.innerHTML = joined.length ? '' : '<p style="color:#86868b;">You have not joined any classes yet.</p>';
        
        joined.forEach(code => {
            const cls = classrooms.find(c => c.classCode === code);
            if (cls && cls.students && cls.students.includes(user.username)) {
                listDiv.innerHTML += `<div class="glass-card class-post fade-in-up" onclick="openSingleClass('${cls.classCode}', 'student')"><h3 style="color:#0071e3; margin-bottom:5px;">${cls.className}</h3><p style="font-size:13px; color:#86868b;">Teacher: @${cls.adminName}</p></div>`;
            }
        });
    }
}

function openSingleClass(code, role) {
    activeClassCode = code;
    const cls = JSON.parse(localStorage.getItem('classrooms')).find(c => c.classCode === code);
    if (role === 'admin') {
        document.getElementById('admin-class-list-view').classList.add('hidden');
        document.getElementById('admin-single-class-view').classList.remove('hidden');
        document.getElementById('single-class-title').innerText = cls.className;
        document.getElementById('single-class-code').innerText = cls.classCode;
        renderAdminClassData(cls);
    } else {
        document.getElementById('student-class-list-view').classList.add('hidden');
        document.getElementById('student-single-class-view').classList.remove('hidden');
        document.getElementById('student-class-title').innerText = cls.className;
        renderStudentClassFeed(cls);
    }
}

function closeSingleClass() { activeClassCode = null; renderClassroomsList(); }

function createClass() {
    const name = document.getElementById('new-class-name').value.trim();
    if(!name) return;
    const user = JSON.parse(localStorage.getItem('currentUser'));
    let classrooms = JSON.parse(localStorage.getItem('classrooms')) || [];
    classrooms.push({ classCode: "KL-" + Math.floor(Math.random() * 10000), className: name, adminName: user.username, students: [], requests: [], posts: [] });
    localStorage.setItem('classrooms', JSON.stringify(classrooms));
    document.getElementById('new-class-name').value = '';
    renderClassroomsList();
}

function toggleAdminTabs(tab) {
    document.querySelectorAll('.class-tab').forEach(el => el.classList.add('hidden'));
    document.getElementById(`tab-${tab}`).classList.remove('hidden');
}

function renderAdminClassData(cls) {
    const reqs = cls.requests || [];
    const stus = cls.students || [];
    const posts = cls.posts || [];

    const reqList = document.getElementById('admin-request-list');
    reqList.innerHTML = reqs.length ? '' : '<li style="background:transparent; border:none; color:#86868b;">No pending requests.</li>';
    reqs.forEach(req => { reqList.innerHTML += `<li><span>@${req}</span> <button class="btn-small btn-accept" onclick="acceptStudent('${req}')">Accept</button></li>`; });

    const stuList = document.getElementById('admin-student-list');
    stuList.innerHTML = stus.length ? '' : '<li style="background:transparent; border:none; color:#86868b;">No students enrolled.</li>';
    stus.forEach(stu => { stuList.innerHTML += `<li><span>@${stu}</span> <button class="btn-small btn-remove" onclick="removeStudent('${stu}')">Remove</button></li>`; });

    const feed = document.getElementById('admin-class-feed');
    feed.innerHTML = posts.length ? '' : '<p style="color:#86868b;">No posts yet.</p>';
    posts.slice().reverse().forEach(post => {
        const isAnnounce = post.type === 'announcement';
        let subHTML = '';
        if (!isAnnounce) {
            const subs = post.submissions || [];
            const submittedUsers = subs.map(s => s.user);
            const notSubmittedUsers = stus.filter(stu => !submittedUsers.includes(stu));
            
            let subListHTML = subs.map(s => `<div class="sub-item"><span>@${s.user}</span> <a href="${s.link}" target="_blank" style="color:#0071e3; text-decoration:none;">View Link</a></div>`).join('');
            let notSubListHTML = notSubmittedUsers.map(u => `<div class="sub-item" style="color:#c5221f;">@${u}</div>`).join('');
            
            subHTML = `<div class="submission-split hidden" id="post-details-${post.id}"><div class="sub-col"><h4 style="margin-bottom:10px; color:#137333;">✅ Submitted (${subs.length})</h4>${subListHTML || 'None yet'}</div><div class="sub-col"><h4 style="margin-bottom:10px; color:#c5221f;">❌ Not Submitted (${notSubmittedUsers.length})</h4>${notSubListHTML || 'All submitted!'}</div></div>`;
        }
        feed.innerHTML += `<div class="glass-card class-post ${isAnnounce ? 'announcement' : ''}" onclick="toggleDetails(${post.id})"><div style="font-size: 12px; color: #86868b; margin-bottom: 5px;">${isAnnounce ? '📢' : '📝'} ${post.type.toUpperCase()} • ${post.time}</div><div style="font-size: 16px; font-weight: 600;">${post.title}</div>${subHTML}</div>`;
    });
}

function acceptStudent(username) {
    let classrooms = JSON.parse(localStorage.getItem('classrooms'));
    let cls = classrooms.find(c => c.classCode === activeClassCode);
    cls.requests = cls.requests.filter(u => u !== username);
    cls.students.push(username);
    localStorage.setItem('classrooms', JSON.stringify(classrooms));
    openSingleClass(activeClassCode, 'admin');
}

function removeStudent(username) {
    if(!confirm(`Remove @${username}?`)) return;
    let classrooms = JSON.parse(localStorage.getItem('classrooms'));
    let cls = classrooms.find(c => c.classCode === activeClassCode);
    cls.students = cls.students.filter(u => u !== username);
    localStorage.setItem('classrooms', JSON.stringify(classrooms));
    openSingleClass(activeClassCode, 'admin');
}

function createClassPost() {
    const title = document.getElementById('class-post-title').value.trim();
    const type = document.getElementById('post-type').value;
    if(!title) return;
    let classrooms = JSON.parse(localStorage.getItem('classrooms'));
    let cls = classrooms.find(c => c.classCode === activeClassCode);
    if(!cls.posts) cls.posts = [];
    cls.posts.push({ id: Date.now(), type, title, time: "Just now", submissions: [] });
    localStorage.setItem('classrooms', JSON.stringify(classrooms));
    document.getElementById('class-post-title').value = '';
    openSingleClass(activeClassCode, 'admin');
}

function toggleDetails(postId) { 
    const el = document.getElementById(`post-details-${postId}`); 
    if(el) el.classList.toggle('hidden'); 
}

function requestJoinClass() {
    const code = document.getElementById('join-class-code').value.trim();
    const user = JSON.parse(localStorage.getItem('currentUser'));
    let classrooms = JSON.parse(localStorage.getItem('classrooms')) || [];
    let cls = classrooms.find(c => c.classCode === code);
    if (!cls) return alert("Invalid Class Code.");
    
    if(!cls.students) cls.students = [];
    if(!cls.requests) cls.requests = [];
    if (cls.students.includes(user.username)) return alert("Already in class!");
    if (cls.requests.includes(user.username)) return alert("Request already sent!");
    
    cls.requests.push(user.username);
    let allUsers = JSON.parse(localStorage.getItem('users'));
    let dbUser = allUsers.find(u => u.username === user.username);
    if(!dbUser.joinedClasses) dbUser.joinedClasses = [];
    dbUser.joinedClasses.push(code);
    user.joinedClasses.push(code);
    
    localStorage.setItem('classrooms', JSON.stringify(classrooms));
    localStorage.setItem('users', JSON.stringify(allUsers));
    localStorage.setItem('currentUser', JSON.stringify(user));
    document.getElementById('join-class-code').value = '';
    alert("Request sent! Waiting for teacher approval.");
}

function renderStudentClassFeed(cls) {
    const feed = document.getElementById('student-class-feed');
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const posts = cls.posts || [];
    feed.innerHTML = posts.length ? '' : '<p style="color:#86868b;">No posts in this class yet.</p>';

    posts.slice().reverse().forEach(post => {
        if (post.type === 'announcement') {
            feed.innerHTML += `<div class="glass-card class-post announcement"><div style="font-size: 12px; color: #86868b; margin-bottom: 5px;">📢 ANNOUNCEMENT • ${post.time}</div><div style="font-size: 16px; font-weight: 600;">${post.title}</div></div>`;
        } else {
            const subs = post.submissions || [];
            const mySubmission = subs.find(s => s.user === user.username);
            let actionHTML = mySubmission 
                ? `<div style="margin-top:15px; padding-top:15px; border-top:1px solid #e5e5ea;"><span style="color:#137333; font-weight:600;">✅ Submitted:</span> <a href="${mySubmission.link}" target="_blank" style="color:#0071e3; text-decoration:none;">${mySubmission.link}</a></div>`
                : `<div style="margin-top:15px; padding-top:15px; border-top:1px solid #e5e5ea;" onclick="event.stopPropagation()"><p style="font-size:13px; color:#86868b; margin-bottom:10px;">Submit link (Max 100 characters):</p><div style="display:flex; gap:10px;"><input type="url" id="sub-link-${post.id}" maxlength="100" class="light-input focus-ring" placeholder="e.g., https://github.com/..." style="margin-bottom:0;"><button class="primary-btn hover-scale" onclick="submitProjectLink(${post.id})">Submit</button></div></div>`;
            feed.innerHTML += `<div class="glass-card class-post fade-in-up"><div style="font-size: 12px; color: #86868b; margin-bottom: 5px;">📝 PROJECT • ${post.time}</div><div style="font-size: 16px; font-weight: 600;">${post.title}</div>${actionHTML}</div>`;
        }
    });
}

function submitProjectLink(postId) {
    const link = document.getElementById(`sub-link-${postId}`).value.trim();
    if(!link) return alert("Please enter a link.");
    if(link.length > 100) return alert("Link must be under 100 characters.");
    const user = JSON.parse(localStorage.getItem('currentUser'));
    let classrooms = JSON.parse(localStorage.getItem('classrooms'));
    let cls = classrooms.find(c => c.classCode === activeClassCode);
    let post = cls.posts.find(p => p.id === postId);
    if(!post.submissions) post.submissions = [];
    post.submissions.push({ user: user.username, link: link });
    localStorage.setItem('classrooms', JSON.stringify(classrooms));
    openSingleClass(activeClassCode, 'student');
}

// --- 7. SESSION MANAGEMENT ---
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
    activeClassCode = null;
    currentChatUser = null;
    checkAuth();
    alert('Session ended due to inactivity.');
}

// --- 8. AUTH BOILERPLATE ---
function openAuth(type) {
    document.getElementById('auth-modal').classList.remove('hidden');
    document.getElementById('form-login').classList.toggle('active', type === 'login');
    document.getElementById('form-register').classList.toggle('active', type !== 'login');
    document.getElementById('form-login').classList.toggle('hidden', type !== 'login');
    document.getElementById('form-register').classList.toggle('hidden', type === 'login');
    if(type==='login') { 
        document.getElementById('login-username').value = "student"; 
        document.getElementById('login-password').value = "123"; 
    }
}

function closeAuth() { 
    document.getElementById('auth-modal').classList.add('hidden'); 
}

function loginUser() {
    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value.trim();
    const user = JSON.parse(localStorage.getItem('users')).find(x => x.username === u && x.pass === p);
    if(user) { 
        localStorage.setItem('currentUser', JSON.stringify(user)); 
        closeAuth(); 
        checkAuth(); 
    } else alert("Invalid username or password.");
}

function registerUser() {
    const u = document.getElementById('reg-username').value.trim();
    const p = document.getElementById('reg-password').value.trim();
    const r = document.getElementById('reg-role').value;
    if(!u || !p) return alert("Fill all fields.");
    let users = JSON.parse(localStorage.getItem('users')) || [];
    if(users.find(x => x.username === u)) return alert("Username taken!");
    users.push({ username: u, pass: p, role: r, joinedClasses: [] });
    localStorage.setItem('users', JSON.stringify(users));
    alert("Registered! Please login.");
    openAuth('login');
}

function logout() { localStorage.removeItem('currentUser'); activeClassCode = null; currentChatUser = null; checkAuth(); }
