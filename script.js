const firebaseConfig = {
    apiKey: "AIzaSyDHpPSvzQaXSLpxWQjPCmz9L0OjOw0LqgM",
    authDomain: "productionx-3cbfd.firebaseapp.com",
    projectId: "productionx-3cbfd",
    storageBucket: "productionx-3cbfd.firebasestorage.app",
    messagingSenderId: "268774453737",
    appId: "1:268774453737:web:079522d7071440e5fd1b78"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
let currentUser = null;
let departmentsList = ["Regie", "Produktion", "Kamera", "Licht", "Ton"];

window.onload = () => {
    const storedUser = localStorage.getItem('ashes_user');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        startApp();
    }
};

function showRegistration() {
    document.getElementById('auth-screen').classList.remove('active');
    document.getElementById('onboarding-screen').classList.add('active');
}

function showLogin() {
    document.getElementById('onboarding-screen').classList.remove('active');
    document.getElementById('auth-screen').classList.add('active');
}

async function loginUser() {
    const email = document.getElementById('login-email').value;
    if(!email) return alert("Bitte E-Mail eingeben.");
    
    try {
        const snapshot = await db.collection("crew").where("email", "==", email).get();
        if (snapshot.empty) {
            alert("E-Mail nicht gefunden. Bitte neu im Team eintragen.");
        } else {
            const doc = snapshot.docs[0];
            currentUser = doc.data();
            currentUser.id = doc.id;
            localStorage.setItem('ashes_user', JSON.stringify(currentUser));
            startApp();
        }
    } catch (error) {
        alert("Datenbank-Fehler: " + error.message);
    }
}

function logoutUser() {
    localStorage.removeItem('ashes_user');
    location.reload();
}

document.getElementById('onboarding-form').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const activeStep = document.querySelector('.form-step.active');
        if (activeStep) {
            const currentStepNumber = parseInt(activeStep.id.split('-')[1]);
            if (currentStepNumber < 6) nextStep(currentStepNumber);
            else submitRegistration();
        }
    }
});

function nextStep(current) {
    const stepEl = document.getElementById('step-' + current);
    const inputs = stepEl.querySelectorAll('input[required], select[required]');
    let valid = true;
    inputs.forEach(input => {
        input.classList.remove('input-error');
        if (!input.checkValidity()) {
            input.reportValidity();
            input.classList.add('input-error');
            valid = false;
        }
    });
    if (valid) {
        document.getElementById('step-' + current).classList.remove('active');
        document.getElementById('step-' + (current + 1)).classList.add('active');
        const nextInput = document.getElementById('step-' + (current + 1)).querySelector('input, select');
        if(nextInput) nextInput.focus();
    }
}

function prevStep(current) {
    document.getElementById('step-' + current).classList.remove('active');
    document.getElementById('step-' + (current - 1)).classList.add('active');
}

function toggleAllergy(show) {
    const input = document.getElementById('allergy-details');
    if (show) {
        input.style.display = 'block';
        input.required = true;
    } else {
        input.style.display = 'none';
        input.required = false;
        input.value = '';
    }
}

async function submitRegistration() {
    const roleSelect = document.getElementById('role');
    roleSelect.classList.remove('input-error');
    if (!roleSelect.value) {
        roleSelect.classList.add('input-error');
        return alert("Bitte wähle deine Rolle im Team aus.");
    }
    const hasAllergy = document.querySelector('input[name="has_allergy"]:checked').value === 'yes';
    const street = document.getElementById('address-street').value;
    const zip = document.getElementById('address-zip').value;
    const city = document.getElementById('address-city').value;

    const newUser = {
        name: document.getElementById('name').value,
        dob: document.getElementById('dob').value,
        role: roleSelect.value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        address: `${street}, ${zip} ${city}`,
        diet: document.getElementById('diet').value,
        allergy: hasAllergy ? document.getElementById('allergy-details').value : 'Keine',
        transport: document.getElementById('transport').value,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        const docRef = await db.collection("crew").add(newUser);
        currentUser = newUser;
        currentUser.id = docRef.id;
        localStorage.setItem('ashes_user', JSON.stringify(currentUser));
        startApp();
    } catch (error) {
        alert("Datenbank-Fehler beim Speichern: " + error.message);
    }
}

function startApp() {
    document.getElementById('auth-screen').classList.remove('active');
    document.getElementById('onboarding-screen').classList.remove('active');
    document.getElementById('app-screen').classList.add('active');
    document.getElementById('user-role-display').innerText = currentUser.role;

    if (currentUser.role === 'Regie' || currentUser.role === 'Produktion') {
        document.getElementById('nav-verwaltung').style.display = 'block';
        loadVerwaltung();
    }

    populateDropdowns();
    loadStabliste();
    loadTasks();
    loadRequests();
    loadDocuments();
    loadNutzliches();
}

function populateDropdowns() {
    const select = document.getElementById('request-recipient');
    select.innerHTML = '<option value="" disabled selected>EmpfängerIn / Department wählen...</option>';
    departmentsList.forEach(dep => {
        const opt = document.createElement('option');
        opt.value = dep;
        opt.innerText = dep;
        select.appendChild(opt);
    });
}

function loadStabliste() {
    db.collection("crew").orderBy("timestamp", "asc").onSnapshot((querySnapshot) => {
        const tbody = document.getElementById('crew-table-body');
        tbody.innerHTML = '';
        
        querySnapshot.forEach((doc) => {
            const member = doc.data();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${member.name}</strong><br><small>${member.role}</small><br><small>Geb: ${member.dob}</small></td>
                <td>${member.phone}<br><small>${member.email}</small></td>
                <td>${member.address}</td>
                <td>${member.diet} <br><small>Allergien: ${member.allergy}</small></td>
                <td>${member.transport}</td>
            `;
            tbody.appendChild(tr);
        });
    });
}

function createTaskElement(task, docId) {
    const li = document.createElement('li');
    li.innerText = task.text;
    if(task.done) li.classList.add('done');
    li.onclick = () => db.collection("tasks").doc(docId).update({ done: !task.done });
    return li;
}

async function addCustomTask() {
    const input = document.getElementById('new-task-input');
    if(!input.value) return;
    
    await db.collection("tasks").add({
        role: currentUser.role,
        text: input.value,
        done: false,
        type: "custom",
        shared: false
    });
    input.value = "";
}

function loadTasks() {
    db.collection("tasks").where("role", "==", currentUser.role).onSnapshot(async (querySnapshot) => {
        
        if (querySnapshot.empty) {
            let defaultTasks = [];
            if (currentUser.role === 'Regie') defaultTasks = ["Shotliste finalisieren", "Drehbuch überarbeiten", "Moodboard erstellen"];
            else if (currentUser.role === 'Kamera') defaultTasks = ["Shotliste finalisieren", "Mit Licht absprechen", "Konzept erstellen"];
            else if (currentUser.role === 'Licht') defaultTasks = ["Lichtplan erstellen", "Equipmentliste prüfen", "Kamera-Absprache"];

            for (let text of defaultTasks) {
                await db.collection("tasks").add({ role: currentUser.role, text: text, done: false, type: "standard", shared: true });
            }
            return;
        }

        const dashUl = document.getElementById('task-list-dashboard');
        const ulStandard = document.getElementById('task-list-standard');
        const ulCustom = document.getElementById('task-list-custom');
        const ulDelegated = document.getElementById('task-list-delegated');
        
        dashUl.innerHTML = '';
        ulStandard.innerHTML = '';
        ulCustom.innerHTML = '';
        ulDelegated.innerHTML = '';
        
        let completed = 0;
        let total = 0;

        querySnapshot.forEach((doc) => {
            const task = doc.data();
            
            if(task.shared && task.done) return; 

            total++;
            if(task.done) completed++;

            dashUl.appendChild(createTaskElement(task, doc.id));

            if(task.type === "standard") ulStandard.appendChild(createTaskElement(task, doc.id));
            else if(task.type === "delegated") ulDelegated.appendChild(createTaskElement(task, doc.id));
            else ulCustom.appendChild(createTaskElement(task, doc.id));
        });

        const percentage = total > 0 ? (completed / total) * 100 : 0;
        document.getElementById('progress').style.width = percentage + '%';
        
        if(dashUl.innerHTML === '') dashUl.innerHTML = '<li>Keine Aufgaben vorhanden.</li>';
        if(ulStandard.innerHTML === '') ulStandard.innerHTML = '<li>Keine Standardaufgaben offen.</li>';
        if(ulCustom.innerHTML === '') ulCustom.innerHTML = '<li>Keine eigenen Aufgaben.</li>';
        if(ulDelegated.innerHTML === '') ulDelegated.innerHTML = '<li>Keine Aufgaben von anderen zugewiesen.</li>';
    });
}

async function uploadDocument() {
    const nameInput = document.getElementById('doc-upload-name').value;
    const fileInput = document.getElementById('doc-upload-file').files[0];
    
    if(!nameInput || !fileInput) return alert("Bitte Titel und Datei angeben.");
    
    await db.collection("documents").add({
        name: nameInput,
        filename: fileInput.name,
        uploader: currentUser.name,
        role: currentUser.role,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    document.getElementById('doc-upload-name').value = "";
    document.getElementById('doc-upload-file').value = "";
}

function loadDocuments() {
    db.collection("documents").orderBy("timestamp", "desc").onSnapshot((querySnapshot) => {
        const list = document.getElementById('documents-list');
        const dashList = document.getElementById('material-dashboard');
        list.innerHTML = '';
        dashList.innerHTML = '';

        if (querySnapshot.empty) {
            list.innerHTML = '<p>Noch keine Dokumente hochgeladen.</p>';
            dashList.innerHTML = '<p>Kein Material verfügbar.</p>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const html = `
                <div class="doc-card">
                    📄 <strong>${data.name}</strong>
                    <small>${data.filename}</small>
                    <small>Von: ${data.uploader} (${data.role})</small>
                </div>
            `;
            list.innerHTML += html;
            dashList.innerHTML += html;
        });
    });
}

async function sendRequest() {
    const recipient = document.getElementById('request-recipient').value;
    const category = document.getElementById('request-category').value;
    const subject = document.getElementById('request-subject').value;
    const body = document.getElementById('request-body').value;
    
    if(!recipient || !category || !subject || !body) return alert("Bitte alle Felder der Anfrage ausfüllen.");

    await db.collection("requests").add({
        sender: currentUser.name,
        senderRole: currentUser.role,
        recipient: recipient,
        category: category, // "Entscheidung" oder "Aufgabe"
        subject: subject,
        body: body,
        status: "offen", // "offen", "angenommen" / "ja", "abgelehnt" / "nein"
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    document.getElementById('request-subject').value = "";
    document.getElementById('request-body').value = "";
    document.getElementById('request-category').value = "";
    alert("Anfrage gesendet.");
}

function loadRequests() {
    // 1. Posteingang (Anfragen, die an mich gerichtet sind)
    db.collection("requests").where("recipient", "==", currentUser.role).onSnapshot((querySnapshot) => {
        const container = document.getElementById('requests-container');
        const dashContainer = document.getElementById('requests-dashboard');
        
        container.innerHTML = '<h3>Erhaltene Anfragen</h3>';
        dashContainer.innerHTML = '';

        let hasOpen = false;

        querySnapshot.forEach((doc) => {
            const req = doc.data();
            if(req.status === "offen") hasOpen = true;

            let actionButtons = '';
            if(req.status === "offen") {
                if(req.category === "Entscheidung") {
                    actionButtons = `
                        <button class="approve-btn" onclick="respondRequest('${doc.id}', 'Angenommen (Ja)', '${req.subject}', '${req.senderRole}')">Annehmen (Ja)</button>
                        <button class="reject-btn" onclick="respondRequest('${doc.id}', 'Abgelehnt (Nein)', '${req.subject}', '${req.senderRole}')">Ablehnen (Nein)</button>
                    `;
                } else {
                    actionButtons = `
                        <button class="approve-btn" onclick="respondRequest('${doc.id}', 'Angenommen (Aufgabe)', '${req.subject}', '${req.senderRole}', true)">Annehmen & Aufgabe erstellen</button>
                        <button class="reject-btn" onclick="respondRequest('${doc.id}', 'Abgelehnt', '${req.subject}', '${req.senderRole}')">Ablehnen</button>
                    `;
                }
            } else {
                actionButtons = `<p style="margin-top: 10px; font-weight: bold; color: #666;">Status: ${req.status}</p>`;
            }

            const html = `
                <div class="request-card">
                    <p><strong>Von:</strong> ${req.sender} (${req.senderRole})</p>
                    <p><strong>Typ:</strong> ${req.category}</p>
                    <p><strong>Thema:</strong> ${req.subject}</p>
                    <p style="margin-top: 10px; color: #555;">${req.body}</p>
                    ${actionButtons}
                </div>
            `;
            container.innerHTML += html;
            if(req.status === "offen") dashContainer.innerHTML += html;
        });

        if(!hasOpen) {
            dashContainer.innerHTML = '<p>Keine offenen Anfragen.</p>';
        }

        // 2. Gesendete Anfragen (Rückmeldung für den Anfrager)
        db.collection("requests").where("sender", "==", currentUser.name).onSnapshot((snapSent) => {
            let sentHtml = '<h3 style="margin-top: 2rem;">Gesendete Anfragen</h3>';
            let sentEmpty = true;

            snapSent.forEach((doc) => {
                sentEmpty = false;
                const req = doc.data();
                sentHtml += `
                    <div class="request-card" style="border-left-color: #B5EAD7;">
                        <p><strong>An:</strong> ${req.recipient}</p>
                        <p><strong>Thema:</strong> ${req.subject}</p>
                        <p><strong>Aktueller Status:</strong> <span style="font-weight: bold; color: #333;">${req.status}</span></p>
                    </div>
                `;
            });

            if(!sentEmpty) {
                container.innerHTML += sentHtml;
            }
        });
    });
}

async function respondRequest(docId, newStatus, taskText, targetRole, isTask = false) {
    // Status in der Anfrage aktualisieren, damit der Anfrager informiert wird
    await db.collection("requests").doc(docId).update({ status: newStatus });

    // Wenn es eine angenommene Aufgabe ist, direkt in die Aufgabenliste der Zielrolle eintragen
    if(isTask) {
        await db.collection("tasks").add({
            role: targetRole,
            text: `Delegiert: ${taskText}`,
            done: false,
            type: "delegated",
            shared: false
        });
    }
}

function loadNutzliches() {
    const roleInfoDict = {
        "Regie": "Verantwortlich für die kreative Vision, Schauspielführung und die finale Bildgestaltung in Zusammenarbeit mit der Kamera.",
        "Produktion": "Verantwortlich für organisatorische, finanzielle und logistische Abläufe des Drehs.",
        "Kamera": "Setzt die kreative Vision visuell um. Erstellt Shotlisten und plant das Lichtkonzept.",
        "Licht": "Verantwortlich für die technische Umsetzung des Lichtkonzepts in Absprache mit der Kamera.",
        "Ton": "Verantwortlich für die saubere Aufnahme der Dialoge und der Atmo am Set."
    };

    document.getElementById('role-info-text').innerText = roleInfoDict[currentUser.role] || "Allgemeine Rolle am Set.";

    db.collection("crew").onSnapshot((querySnapshot) => {
        let prodNum = "Nicht besetzt";
        let regieNum = "Nicht besetzt";

        querySnapshot.forEach((doc) => {
            const member = doc.data();
            if (member.role === "Produktion") prodNum = `${member.name} (${member.phone})`;
            if (member.role === "Regie") regieNum = `${member.name} (${member.phone})`;
        });

        document.getElementById('contact-produktion').innerText = prodNum;
        document.getElementById('contact-regie').innerText = regieNum;
    });
}

function loadVerwaltung() {
    db.collection("crew").onSnapshot((querySnapshot) => {
        const tbody = document.getElementById('manage-team-body');
        tbody.innerHTML = '';
        
        querySnapshot.forEach((doc) => {
            const member = doc.data();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${member.name}</td>
                <td>${member.role}</td>
                <td><button class="btn-danger" onclick="deleteMember('${doc.id}')">Löschen</button></td>
            `;
            tbody.appendChild(tr);
        });
    });
}

async function deleteMember(docId) {
    if(confirm("Soll dieses Crew-Mitglied unwiderruflich gelöscht werden?")) {
        await db.collection("crew").doc(docId).delete();
    }
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-links li').forEach(link => link.classList.remove('active-nav'));
    document.getElementById(tabId).classList.add('active');
    document.getElementById('nav-' + tabId).classList.add('active-nav');
}

function exportStablistePDF() {
    window.print();
}
