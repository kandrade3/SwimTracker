/* ===================================
   SwimTrack — app.js
   Firebase Auth + Firestore backend
   =================================== */

// ─────────────────────────────────────
// 🔥 FIREBASE CONFIGURATION
// Replace these values with your own project's config.
// Get them from: Firebase Console → Project Settings → Your Apps → Web App
// ─────────────────────────────────────
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDL9-NhHzN25SAUG8VzfbXNf2CzY9wl4P0",
  authDomain: "swimtrackr-27070.firebaseapp.com",
  projectId: "swimtrackr-27070",
  storageBucket: "swimtrackr-27070.firebasestorage.app",
  messagingSenderId: "203011812234",
  appId: "1:203011812234:web:7b94a23eeb3c2bfb73b673",
  measurementId: "G-3SB34TWVVR"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

// ─────────────────────────────────────
// STATE
// ─────────────────────────────────────
let currentUser   = null;   // Firebase user object
let instructorDoc = null;   // Instructor's Firestore document data (name, levels, students)
let activeStudentId = null;

// ─────────────────────────────────────
// ADMIN HELPER
// Set isAdmin: true on an instructor's Firestore document to grant access.
// ─────────────────────────────────────
function isAdmin() {
  return instructorDoc?.isAdmin === true;
}

// ─────────────────────────────────────
// DEFAULT LEVELS (used on first register)
// ─────────────────────────────────────
const DEFAULT_LEVELS = [
  { id: uid(), name: 'Water Discovery',    desc: 'Introduction to water, comfort and basic safety' },
  { id: uid(), name: 'Water Exploration',  desc: 'Floating, gliding, and basic kicking' },
  { id: uid(), name: 'Stroke Introduction',desc: 'Freestyle and backstroke fundamentals' },
  { id: uid(), name: 'Stroke Development', desc: 'Refining technique and building endurance' },
  { id: uid(), name: 'Stroke Mechanics',   desc: 'Breaststroke, butterfly, and flip turns' },
  { id: uid(), name: 'Advanced Skills',    desc: 'Competitive technique and swim training' },
];

// ─────────────────────────────────────
// FIREBASE AUTH STATE LISTENER
// Runs on every page load — restores session automatically
// ─────────────────────────────────────
auth.onAuthStateChanged(async (user) => {
  if (user) {
    currentUser = user;
    await loadInstructorData();
    showDashboard();
  } else {
    currentUser = null;
    instructorDoc = null;
    showScreen('landing');
  }
});

// ─────────────────────────────────────
// FIRESTORE HELPERS
// ─────────────────────────────────────
function instructorRef(uid) {
  return db.collection('instructors').doc(uid);
}

async function loadInstructorData() {
  showLoading(true);
  try {
    const snap = await instructorRef(currentUser.uid).get();
    if (snap.exists) {
      instructorDoc = snap.data();
    } else {
      // Should not happen, but handle gracefully
      instructorDoc = { name: currentUser.email, levels: [...DEFAULT_LEVELS], students: [] };
    }
  } catch (err) {
    toast('Error loading data: ' + err.message, true);
  } finally {
    showLoading(false);
  }
}

async function saveInstructorData() {
  // Saves the full instructorDoc back to Firestore
  try {
    await instructorRef(currentUser.uid).set(instructorDoc);
  } catch (err) {
    toast('Save error: ' + err.message, true);
  }
}

// ─────────────────────────────────────
// USERNAME → FAKE EMAIL CONVERSION
// Firebase Auth requires an email. We silently convert the username to a
// deterministic fake email that users never see.
// ─────────────────────────────────────
function usernameToEmail(username) {
  return username.toLowerCase().replace(/[^a-z0-9._-]/g, '_') + '@swimtrack.app';
}

function validateUsername(username) {
  if (!username)          return 'Please enter a username.';
  if (username.length < 3) return 'Username must be at least 3 characters.';
  if (username.length > 30) return 'Username must be 30 characters or fewer.';
  if (!/^[a-zA-Z0-9._-]+$/.test(username)) return 'Username can only contain letters, numbers, dots, hyphens, and underscores.';
  return null;
}

// ─────────────────────────────────────
// AUTH — REGISTER
// ─────────────────────────────────────
async function register() {
  const name     = document.getElementById('regName').value.trim();
  const username = document.getElementById('regUsername').value.trim();
  const password = document.getElementById('regPassword').value;

  if (!name || !username || !password) { toast('Please fill in all fields', true); return; }
  const usernameError = validateUsername(username);
  if (usernameError) { toast(usernameError, true); return; }
  if (password.length < 6) { toast('Password must be at least 6 characters', true); return; }

  const fakeEmail = usernameToEmail(username);
  showLoading(true);
  try {
    const cred = await auth.createUserWithEmailAndPassword(fakeEmail, password);
    currentUser = cred.user;

    // Create instructor document in Firestore
    instructorDoc = {
      name,
      username: username.toLowerCase(),
      isAdmin:  false,
      levels:   JSON.parse(JSON.stringify(DEFAULT_LEVELS)),
      students: []
    };
    await instructorRef(currentUser.uid).set(instructorDoc);
    toast('Welcome, ' + name + '! 🏊');
    showDashboard();
  } catch (err) {
    toast(friendlyAuthError(err), true);
  } finally {
    showLoading(false);
  }
}

// ─────────────────────────────────────
// AUTH — LOGIN
// ─────────────────────────────────────
async function login() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!username || !password) { toast('Please enter your username and password', true); return; }

  const fakeEmail = usernameToEmail(username);
  showLoading(true);
  try {
    await auth.signInWithEmailAndPassword(fakeEmail, password);
    // onAuthStateChanged handles the rest
  } catch (err) {
    toast(friendlyAuthError(err), true);
    showLoading(false);
  }
}

// ─────────────────────────────────────
// AUTH — LOGOUT
// ─────────────────────────────────────
async function logout() {
  await auth.signOut();
  // onAuthStateChanged will call showScreen('landing')
}

function friendlyAuthError(err) {
  const map = {
    'auth/email-already-in-use':  'That username is already taken.',
    'auth/invalid-email':         'Invalid username format.',
    'auth/weak-password':         'Password must be at least 6 characters.',
    'auth/user-not-found':        'No account found with that username.',
    'auth/wrong-password':        'Incorrect password.',
    'auth/invalid-credential':    'Incorrect username or password.',
    'auth/too-many-requests':     'Too many attempts. Please try again later.',
  };
  return map[err.code] || err.message;
}

// ─────────────────────────────────────
// SCREEN NAVIGATION
// ─────────────────────────────────────
const AUTH_SCREENS = ['landing', 'registerScreen', 'loginScreen'];

function showScreen(id) {
  AUTH_SCREENS.forEach(s => {
    document.getElementById(s)?.classList.toggle('hidden', s !== id);
  });
  document.getElementById('dashboard').style.display = 'none';
}

function showDashboard() {
  AUTH_SCREENS.forEach(s => document.getElementById(s)?.classList.add('hidden'));
  const dash = document.getElementById('dashboard');
  dash.style.display = 'flex';
  dash.style.flexDirection = 'column';
  document.getElementById('dashInstructorName').textContent = instructorDoc.name;

  // Show admin-only controls
  const admin = isAdmin();
  document.getElementById('manageLevelsBtn').classList.toggle('hidden', !admin);
  document.getElementById('tab-levelsTab').classList.toggle('hidden', !admin);
  document.getElementById('addLevelBtn').classList.toggle('hidden', !admin);
  document.getElementById('levelsTabSubtitle').textContent = admin
    ? 'Drag to reorder · Click to edit'
    : 'Current swim levels';

  openTab('studentsTab');
  renderBoard();
}

// ─────────────────────────────────────
// TABS
// ─────────────────────────────────────
function openTab(tabId) {
  ['studentsTab', 'levelsTab'].forEach(id => {
    document.getElementById(id).classList.toggle('hidden', id !== tabId);
    document.getElementById('tab-' + id).classList.toggle('active', id === tabId);
  });
  if (tabId === 'levelsTab') renderLevels();
  if (tabId === 'studentsTab') renderBoard();
}

// ─────────────────────────────────────
// RENDER — STUDENTS BOARD
// ─────────────────────────────────────
function renderBoard() {
  const board    = document.getElementById('studentBoard');
  const levels   = instructorDoc.levels   || [];
  const students = instructorDoc.students || [];

  if (!levels.length) {
    board.innerHTML = '<div class="empty-board">No levels yet. Add some in the Swim Levels tab!</div>';
    return;
  }

  const levelIds   = levels.map(l => l.id);
  const unassigned = students.filter(s => !levelIds.includes(s.levelId));

  const colHTML = (id, name, lvlStudents) => `
    <div class="level-col" id="col-${id}">
      <div class="level-col-header" onclick="toggleLevel('${id}')">
        <span class="level-name">${esc(name)}</span>
        <div class="level-header-right">
          <span class="level-count">${lvlStudents.length}</span>
          <span class="level-chevron">▼</span>
        </div>
      </div>
      <div class="level-students">
        ${lvlStudents.length
          ? lvlStudents.map(s => studentCardHTML(s)).join('')
          : '<div class="text-dim" style="font-size:0.8rem;padding:4px 2px;grid-column:1/-1">No students yet</div>'}
      </div>
    </div>`;

  board.innerHTML =
    levels.map(level => colHTML(level.id, level.name, students.filter(s => s.levelId === level.id))).join('') +
    (unassigned.length ? colHTML('unassigned', 'Unassigned', unassigned) : '');
}

function toggleLevel(id) {
  document.getElementById('col-' + id)?.classList.toggle('collapsed');
}

function studentCardHTML(s) {
  const initials = s.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const badge    = s.comments?.length ? `<span class="comment-badge">${s.comments.length}</span>` : '';
  const age      = s.age ? `· Age ${s.age}` : '';
  return `
    <div class="student-card" onclick="openStudentModal('${s.id}')">
      <div class="student-avatar">${initials}</div>
      <div class="student-info">
        <div class="student-name">${esc(s.name)}</div>
        <div class="student-meta">${age}</div>
      </div>
      ${badge}
    </div>`;
}

// ─────────────────────────────────────
// RENDER — LEVELS LIST
// ─────────────────────────────────────
function renderLevels() {
  const levels = instructorDoc.levels || [];
  const list   = document.getElementById('levelsList');
  const admin  = isAdmin();

  if (!levels.length) {
    list.innerHTML = `<div class="empty-board">${admin ? 'No levels yet. Add your first swim level!' : 'No levels have been set up yet.'}</div>`;
    return;
  }

  if (admin) {
    // Full editable list with drag handles
    list.innerHTML = levels.map(level => {
      const skillCount = (level.skills || []).length;
      return `
        <div class="level-item" draggable="true" data-id="${level.id}"
             ondragstart="dragStart(event,'${level.id}')"
             ondragover="dragOver(event)"
             ondrop="drop(event,'${level.id}')"
             ondragleave="dragLeave(event)">
          <span class="drag-handle" title="Drag to reorder">⠿</span>
          <div style="flex:1; min-width:0;">
            <div class="level-item-name">${esc(level.name)}</div>
            ${level.desc ? `<div class="level-item-desc">${esc(level.desc)}</div>` : ''}
            ${skillCount ? `<div class="level-item-desc" style="margin-top:3px;">🎯 ${skillCount} skill${skillCount !== 1 ? 's' : ''}</div>` : ''}
          </div>
          <div class="level-actions">
            <button class="btn btn-ghost btn-sm" onclick="openEditLevelModal('${level.id}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteLevel('${level.id}')">Delete</button>
          </div>
        </div>`;
    }).join('');
  } else {
    // Read-only: show levels and their skills, no controls
    list.innerHTML = levels.map(level => {
      const skills = level.skills || [];
      return `
        <div class="level-item" style="cursor:default;">
          <div style="flex:1; min-width:0;">
            <div class="level-item-name">${esc(level.name)}</div>
            ${level.desc ? `<div class="level-item-desc">${esc(level.desc)}</div>` : ''}
            ${skills.length ? `
              <div style="display:flex; flex-wrap:wrap; gap:5px; margin-top:8px;">
                ${skills.map(sk => `<span class="comment-skill-tag">${esc(sk.name)}</span>`).join('')}
              </div>` : ''}
          </div>
        </div>`;
    }).join('');
  }
}

// ─────────────────────────────────────
// DRAG & DROP — LEVEL REORDER
// ─────────────────────────────────────
let dragSrcId = null;

function dragStart(e, id) {
  dragSrcId = id;
  e.target.closest('.level-item').classList.add('dragging');
}
function dragOver(e) {
  e.preventDefault();
  e.target.closest('.level-item')?.classList.add('drag-over');
}
function dragLeave(e) {
  e.target.closest('.level-item')?.classList.remove('drag-over');
}
async function drop(e, targetId) {
  e.preventDefault();
  document.querySelectorAll('.level-item').forEach(el => el.classList.remove('drag-over', 'dragging'));
  if (!isAdmin()) { toast('Admin access required', true); return; }
  if (dragSrcId === targetId) return;

  const levels  = instructorDoc.levels;
  const srcIdx  = levels.findIndex(l => l.id === dragSrcId);
  const tgtIdx  = levels.findIndex(l => l.id === targetId);
  const [item]  = levels.splice(srcIdx, 1);
  levels.splice(tgtIdx, 0, item);

  renderLevels();
  renderBoard();
  await saveInstructorData();
}

// ─────────────────────────────────────
// LEVELS — ADD / EDIT / DELETE
// ─────────────────────────────────────

// Temporary skills array used while the level modal is open
let editingSkills = [];

function openAddLevelModal() {
  if (!isAdmin()) { toast('Admin access required', true); return; }
  document.getElementById('levelModalTitle').textContent = 'Add Level';
  document.getElementById('levelName').value  = '';
  document.getElementById('levelDesc').value  = '';
  document.getElementById('editingLevelId').value = '';
  document.getElementById('newSkillInput').value  = '';
  editingSkills = [];
  renderEditingSkills();
  openModal('levelModal');
}

function openEditLevelModal(id) {
  if (!isAdmin()) { toast('Admin access required', true); return; }
  const level = instructorDoc.levels.find(l => l.id === id);
  if (!level) return;
  document.getElementById('levelModalTitle').textContent = 'Edit Level';
  document.getElementById('levelName').value  = level.name;
  document.getElementById('levelDesc').value  = level.desc || '';
  document.getElementById('editingLevelId').value = id;
  document.getElementById('newSkillInput').value  = '';
  editingSkills = JSON.parse(JSON.stringify(level.skills || []));
  renderEditingSkills();
  openModal('levelModal');
}

function renderEditingSkills() {
  const list = document.getElementById('levelSkillsList');
  if (!editingSkills.length) {
    list.innerHTML = '<div class="skill-picker-empty" style="padding:4px 2px">No skills yet — add some below.</div>';
    return;
  }
  list.innerHTML = editingSkills.map((sk, i) => `
    <div class="skill-row">
      <span>${esc(sk.name)}</span>
      <button class="skill-delete" onclick="removeEditingSkill(${i})" title="Remove">×</button>
    </div>`).join('');
}

function addSkillToLevel() {
  const input = document.getElementById('newSkillInput');
  const name  = input.value.trim();
  if (!name) return;
  editingSkills.push({ id: uid(), name });
  input.value = '';
  renderEditingSkills();
  input.focus();
}

function removeEditingSkill(index) {
  editingSkills.splice(index, 1);
  renderEditingSkills();
}

async function saveLevel() {
  if (!isAdmin()) { toast('Admin access required', true); return; }
  const name   = document.getElementById('levelName').value.trim();
  if (!name) { toast('Please enter a level name', true); return; }
  const desc   = document.getElementById('levelDesc').value.trim();
  const editId = document.getElementById('editingLevelId').value;

  if (editId) {
    const lvl = instructorDoc.levels.find(l => l.id === editId);
    if (lvl) { lvl.name = name; lvl.desc = desc; lvl.skills = [...editingSkills]; }
  } else {
    instructorDoc.levels.push({ id: uid(), name, desc, skills: [...editingSkills] });
  }

  closeModal('levelModal');
  renderLevels();
  renderBoard();
  await saveInstructorData();
  toast(editId ? 'Level updated!' : 'Level added!');
}

async function deleteLevel(id) {
  if (!isAdmin()) { toast('Admin access required', true); return; }
  if (!confirm('Delete this level? Students in it will become unassigned.')) return;
  instructorDoc.levels = instructorDoc.levels.filter(l => l.id !== id);
  renderLevels();
  renderBoard();
  await saveInstructorData();
  toast('Level deleted');
}

// ─────────────────────────────────────
// STUDENTS — ADD
// ─────────────────────────────────────
function openAddStudentModal() {
  const levels = instructorDoc.levels || [];
  document.getElementById('studentLevel').innerHTML =
    levels.map(l => `<option value="${l.id}">${esc(l.name)}</option>`).join('');
  document.getElementById('studentName').value  = '';
  document.getElementById('studentAge').value   = '';
  document.getElementById('studentNotes').value = '';
  openModal('addStudentModal');
}

async function addStudent() {
  const name    = document.getElementById('studentName').value.trim();
  if (!name) { toast('Please enter a student name', true); return; }
  const age     = document.getElementById('studentAge').value.trim();
  const levelId = document.getElementById('studentLevel').value;
  const notes   = document.getElementById('studentNotes').value.trim();

  const student = { id: uid(), name, age, levelId, comments: [] };
  if (notes) {
    student.comments.push({ id: uid(), text: notes, date: dateStr() });
  }

  instructorDoc.students.push(student);
  closeModal('addStudentModal');
  renderBoard();
  await saveInstructorData();
  toast('Student added!');
}

// ─────────────────────────────────────
// STUDENTS — DETAIL MODAL
// ─────────────────────────────────────
function openStudentModal(studentId) {
  const student = instructorDoc.students.find(s => s.id === studentId);
  if (!student) return;
  activeStudentId = studentId;

  document.getElementById('modalStudentName').textContent = student.name;

  const lvl = instructorDoc.levels.find(l => l.id === student.levelId);
  document.getElementById('studentModalMeta').innerHTML = [
    student.age ? `<span class="level-badge">Age ${student.age}</span>` : '',
    lvl         ? `<span class="level-badge">${esc(lvl.name)}</span>`   : ''
  ].join('');

  document.getElementById('studentLevelChange').innerHTML =
    instructorDoc.levels.map(l =>
      `<option value="${l.id}" ${l.id === student.levelId ? 'selected' : ''}>${esc(l.name)}</option>`
    ).join('');

  renderSkillPicker(lvl);
  renderComments(student);
  document.getElementById('newComment').value = '';
  openModal('studentModal');
}

function renderSkillPicker(level) {
  const picker = document.getElementById('skillPicker');
  const skills = level?.skills || [];
  if (!skills.length) {
    picker.innerHTML = '<div class="skill-picker-empty">No skills defined for this level yet.</div>';
    return;
  }
  picker.innerHTML = skills.map(sk => `
    <div class="skill-chip" id="chip-${sk.id}" onclick="toggleSkillChip('${sk.id}')">
      ${esc(sk.name)}
    </div>`).join('');
}

function toggleSkillChip(skillId) {
  document.getElementById('chip-' + skillId)?.classList.toggle('selected');
}

function getSelectedSkills() {
  return [...document.querySelectorAll('#skillPicker .skill-chip.selected')]
    .map(el => el.textContent.trim().replace(/^✓\s*/, ''));
}

function renderComments(student) {
  const list     = document.getElementById('commentsList');
  const comments = student.comments || [];
  document.getElementById('commentCount').textContent = comments.length || '';

  if (!comments.length) {
    list.innerHTML = '<div class="no-comments">No comments yet. Add progress notes below!</div>';
    return;
  }
  list.innerHTML = [...comments].reverse().map(c => {
    const skillTags = (c.skills || []).length
      ? `<div class="comment-skills">${c.skills.map(s => `<span class="comment-skill-tag">${esc(s)}</span>`).join('')}</div>`
      : '';
    const noteText = c.text
      ? `<div class="comment-text">${esc(c.text)}</div>`
      : '';
    return `
      <div class="comment-item">
        <div class="comment-date">${esc(c.date)}</div>
        ${skillTags}
        ${noteText}
        <div class="comment-footer">
          <span></span>
          <button class="btn btn-danger btn-sm" onclick="deleteComment('${c.id}')">Delete</button>
        </div>
      </div>`;
  }).join('');
}

async function addComment() {
  const text   = document.getElementById('newComment').value.trim();
  const skills = getSelectedSkills();

  if (!text && !skills.length) {
    toast('Add a note or select at least one skill', true);
    return;
  }

  const student = instructorDoc.students.find(s => s.id === activeStudentId);
  if (!student) return;
  student.comments = student.comments || [];
  student.comments.push({ id: uid(), text, skills, date: dateStr() });

  // Reset form
  document.getElementById('newComment').value = '';
  document.querySelectorAll('#skillPicker .skill-chip.selected')
    .forEach(el => el.classList.remove('selected'));

  renderComments(student);
  renderBoard();
  await saveInstructorData();
  toast('Comment saved!');
}

async function deleteComment(commentId) {
  const student = instructorDoc.students.find(s => s.id === activeStudentId);
  if (!student) return;
  student.comments = student.comments.filter(c => c.id !== commentId);
  renderComments(student);
  renderBoard();
  await saveInstructorData();
}

async function changeStudentLevel() {
  const newLevelId = document.getElementById('studentLevelChange').value;
  const student    = instructorDoc.students.find(s => s.id === activeStudentId);
  if (!student) return;
  student.levelId = newLevelId;

  renderBoard();
  await saveInstructorData();

  const lvl = instructorDoc.levels.find(l => l.id === newLevelId);
  toast(`Moved to "${lvl?.name}"`);

  // Refresh skill picker for the new level
  renderSkillPicker(lvl);

  // Update badge in modal
  const metaDiv = document.getElementById('studentModalMeta');
  const badges  = metaDiv.querySelectorAll('.level-badge');
  if (badges.length > 1) badges[1].remove();
  if (lvl) metaDiv.insertAdjacentHTML('beforeend', `<span class="level-badge">${esc(lvl.name)}</span>`);
}

async function deleteStudent() {
  if (!confirm('Remove this student from your roster?')) return;
  instructorDoc.students = instructorDoc.students.filter(s => s.id !== activeStudentId);
  closeModal('studentModal');
  renderBoard();
  await saveInstructorData();
  toast('Student removed');
}

// ─────────────────────────────────────
// MODAL HELPERS
// ─────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
});

// ─────────────────────────────────────
// LOADING OVERLAY
// ─────────────────────────────────────
function showLoading(visible) {
  document.getElementById('loadingOverlay').classList.toggle('hidden', !visible);
}

// ─────────────────────────────────────
// TOAST NOTIFICATIONS
// ─────────────────────────────────────
function toast(msg, isError = false) {
  const container = document.getElementById('toastContainer');
  const el        = document.createElement('div');
  el.className    = 'toast' + (isError ? ' error' : '');
  el.textContent  = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ─────────────────────────────────────
// OCEAN BUBBLES ANIMATION
// ─────────────────────────────────────
function spawnBubbles() {
  const bg = document.getElementById('oceanBg');
  for (let i = 0; i < 12; i++) {
    const b    = document.createElement('div');
    b.className = 'bubble';
    const size = Math.random() * 16 + 4;
    b.style.cssText = `width:${size}px; height:${size}px; left:${Math.random()*100}%; animation-duration:${8 + Math.random()*14}s; animation-delay:${Math.random()*10}s;`;
    bg.appendChild(b);
  }
}
spawnBubbles();

// ─────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────
function uid() {
  return Math.random().toString(36).substr(2, 9);
}

function dateStr() {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function esc(str) {
  return String(str || '')
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}
