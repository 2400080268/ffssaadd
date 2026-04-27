// --- 1. INITIALIZE DATABASE WITH DEFENSIVE ARRAYS ---
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
            { id: 101, from: "sarah", to: "student", projectTitle: "React Native UI", status: "accepted" }
        ]));
    }
    if (!localStorage.getItem('messages')) {
        localStorage.setItem('messages', JSON.stringify([
            { id: 1, from: "sarah", to: "student", text: "Hey! Thanks for accepting the collab.", time: "10:00 AM" }
        ]));
    }
}
