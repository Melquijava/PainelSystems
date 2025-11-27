document.addEventListener('DOMContentLoaded', async () => {
    // --- 1. GUARDA DE AUTENTICAÇÃO E CARREGAMENTO DE DADOS ---
    const loggedInUserId = sessionStorage.getItem('loggedInUserId');
    if (!loggedInUserId) {
        window.location.href = 'login.html';
        return;
    }

    let users, tasks, currentUser;

    async function loadData() {
        try {
            const response = await fetch('/api/data');
            if (!response.ok) throw new Error('Falha ao carregar dados do servidor');
            const data = await response.json();
            users = data.users || [];
            tasks = data.tasks || [];
            currentUser = users.find(u => u.id == loggedInUserId);
            if (!currentUser) throw new Error("Usuário logado não encontrado.");
        } catch (error) {
            console.error("Erro crítico ao carregar dados:", error);
            alert("Não foi possível conectar ao servidor.");
            logout();
        }
    }

    async function saveData() {
        try {
            const response = await fetch('/api/data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ users, tasks })
            });
            if (!response.ok) throw new Error('Falha ao salvar dados no servidor');
        } catch (error) {
            console.error("Erro ao salvar dados:", error);
            alert("Não foi possível salvar as alterações.");
        }
    }

    await loadData();
    if (!currentUser) return;

    // --- 2. VARIÁVEIS DE ESTADO DO PAINEL ---
    let currentTab = 'personal';
    let adminPanelVisible = false;
    let userIdToChangeRole = null;
    let tempPhotoBase64 = '';
    let overviewFilter = 'all';

    // --- 3. FUNÇÕES AUXILIARES ---
    const generateId = (array) => (array.length > 0 ? Math.max(...array.map(item => item.id)) + 1 : 1);
    const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    const getUserName = (id) => (users.find(user => user.id == id) || { name: 'Desconhecido' }).name;
    const isOverdue = (task) => task.status === 'pending' && new Date(task.dueDate) < new Date().setHours(0, 0, 0, 0);
    const safeRenderIcons = () => { try { if (typeof lucide !== 'undefined') lucide.createIcons() } catch (e) {} };
    const canAssignTasks = (role) => ['CEO', 'Diretor Operacional', 'gerente', 'Supervisor'].includes(role);
    const getAssignableUsers = () => users.filter(user => user.id !== currentUser.id);

    // --- 4. RENDERIZAÇÃO E ATUALIZAÇÃO DA INTERFACE ---
    function updateSystemUI() {
        currentUser = users.find(u => u.id == loggedInUserId);
        
        document.getElementById('userName').textContent = currentUser.name;
        document.getElementById('userRole').textContent = currentUser.role;
        document.getElementById('profileName').textContent = currentUser.name;
        document.getElementById('profileEmail').textContent = currentUser.email;
        document.getElementById('profileRole').textContent = currentUser.role;
        document.getElementById('profileDepartment').textContent = currentUser.department || 'N/D';

        const headerImg = document.getElementById('headerProfileImage');
        const cardImg = document.getElementById('cardProfileImage');
        if (currentUser.photoUrl) {
            [headerImg, cardImg].forEach(img => { if(img) { img.src = currentUser.photoUrl; img.classList.remove('hidden'); } });
            [document.getElementById('headerProfileIcon'), document.getElementById('cardProfileIcon')].forEach(icon => icon.classList.add('hidden'));
        } else {
            [headerImg, cardImg].forEach(img => { if(img) img.classList.add('hidden'); });
            [document.getElementById('headerProfileIcon'), document.getElementById('cardProfileIcon')].forEach(icon => icon.classList.remove('hidden'));
        }
        
        document.getElementById('adminButton').classList.toggle('hidden', currentUser.role !== 'CEO');
        document.getElementById('overviewTab').classList.toggle('hidden', currentUser.role !== 'CEO');

        const assignTaskContainer = document.getElementById('assignTaskContainer');
        const assignTaskSelect = document.getElementById('assignTaskTo');
        if (assignTaskContainer && assignTaskSelect) {
            if (canAssignTasks(currentUser.role)) {
                assignTaskContainer.classList.remove('hidden');
                assignTaskSelect.innerHTML = '<option value="">Ninguém (Tarefa Geral)</option>';
                getAssignableUsers().forEach(u => {
                    assignTaskSelect.innerHTML += `<option value="${u.id}">${u.name} (${u.role})</option>`;
                });
            } else {
                assignTaskContainer.classList.add('hidden');
            }
        }
        safeRenderIcons();
    }
    
    // --- 5. LÓGICA DE TAREFAS ---
    function switchTab(tab) {
        currentTab = tab;
        document.querySelectorAll('.tab-btn').forEach(t => {
            t.classList.toggle('text-custom-highlight', t.id === `${tab}Tab`);
            t.classList.toggle('border-custom-highlight', t.id === `${tab}Tab`);
            t.classList.toggle('text-custom-muted', t.id !== `${tab}Tab`);
            t.classList.toggle('border-transparent', t.id !== `${tab}Tab`);
        });
        document.getElementById('tasksContent').classList.toggle('hidden', tab === 'overview');
        document.getElementById('overviewContent').classList.toggle('hidden', tab !== 'overview');
        if (tab === 'overview') renderOverviewTasks(); else renderTasks();
    }

    function renderTasks() {
        const tasksListDiv = document.getElementById('tasksList');
        tasksListDiv.innerHTML = '';
        let filteredTasks;
        if (currentTab === 'personal') {
            document.getElementById('tasksTitle').textContent = "Minhas Tarefas";
            filteredTasks = tasks.filter(task => task.assignedTo === currentUser.id);
        } else {
            document.getElementById('tasksTitle').textContent = "Tarefas Gerais";
            filteredTasks = tasks.filter(task => task.type === 'general');
        }
        if (filteredTasks.length === 0) {
            tasksListDiv.innerHTML = '<p class="p-6 text-center text-custom-muted">Nenhuma tarefa encontrada.</p>';
            return;
        }
        filteredTasks.forEach(task => {
            const taskItem = document.createElement('div');
            taskItem.className = 'task-item flex items-center justify-between p-4';
            taskItem.innerHTML = `
                <div class="flex items-start space-x-4">
                    <input type="checkbox" data-task-id="${task.id}" class="task-checkbox mt-1 h-5 w-5 rounded bg-[#05131c] border-[#234356] text-[#33b4dc]" ${task.status === 'completed' ? 'checked' : ''} />
                    <div>
                        <p class="font-medium text-white ${task.status === 'completed' ? 'completed' : ''}">${task.title}</p>
                        <p class="text-xs mt-1 ${isOverdue(task) ? 'text-danger' : 'text-custom-muted'}">Prazo: ${formatDate(task.dueDate)}</p>
                    </div>
                </div>
                <button data-task-id="${task.id}" class="delete-task-btn text-red-500 hover:text-red-400 p-2"><i data-lucide="trash-2" class="w-5 h-5 pointer-events-none"></i></button>
            `;
            tasksListDiv.appendChild(taskItem);
        });
        safeRenderIcons();
    }
    
    function renderOverviewTasks() {
        const overviewList = document.getElementById('overviewTasksList');
        if (!overviewList) return;
        overviewList.innerHTML = '';
        const filtered = tasks.filter(t => overviewFilter === 'all' || (overviewFilter === 'pending' && t.status === 'pending') || (overviewFilter === 'overdue' && isOverdue(t)));
        if (filtered.length === 0) {
            overviewList.innerHTML = '<tr><td colspan="6" class="text-center text-custom-muted py-4">Nenhuma tarefa encontrada.</td></tr>';
            return;
        }
        filtered.forEach(task => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="${task.status === 'completed' ? 'completed' : ''}">${task.title}</span></td>
                <td>${getUserName(task.assignedTo) || 'Geral'}</td><td>${getUserName(task.createdBy)}</td>
                <td class="${isOverdue(task) ? 'text-danger' : ''}">${formatDate(task.dueDate)}</td>
                <td>${task.status === 'completed' ? '<span class="status-badge status-completed">Concluída</span>' : (isOverdue(task) ? '<span class="status-badge status-pending">Atrasada</span>' : '<span class="status-badge status-pending">Pendente</span>')}</td>
                <td><button data-task-id="${task.id}" class="delete-task-btn text-red-500 hover:text-red-400 p-1"><i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i></button></td>
            `;
            overviewList.appendChild(tr);
        });
        safeRenderIcons();
    }

    async function handleAddTask(event) {
        event.preventDefault();
        const title = document.getElementById('taskTitle').value;
        const dueDate = document.getElementById('taskDueDate').value;
        if (!title || !dueDate) { alert('Título e Prazo são obrigatórios.'); return; }

        const assignedToId = document.getElementById('assignTaskTo').value;
        const isAssignedToPerson = assignedToId && assignedToId !== "";

        const newTask = {
            id: generateId(tasks), title, description: document.getElementById('taskDescription').value,
            dueDate: new Date(dueDate).toISOString(), status: 'pending',
            assignedTo: isAssignedToPerson ? parseInt(assignedToId) : null,
            type: isAssignedToPerson ? 'personal' : 'general',
            createdBy: currentUser.id,
        };

        tasks.push(newTask);
        await saveData();
        document.getElementById('addTaskForm').reset();

        if (currentTab === 'overview') renderOverviewTasks(); else renderTasks();
    }

    // --- 6. FUNCIONALIDADES DE ADMINISTRAÇÃO E PERFIL ---
    function toggleAdminPanel() {
        adminPanelVisible = !adminPanelVisible;
        document.getElementById('adminPanel').classList.toggle('hidden', !adminPanelVisible);
        if (adminPanelVisible) renderAdminUsersList();
    }

    function renderAdminUsersList() {
        const adminListDiv = document.getElementById('adminUsersList');
        adminListDiv.innerHTML = '';
        users.forEach(user => {
            const userDiv = document.createElement('div');
            userDiv.className = 'flex items-center justify-between p-2 rounded bg-[#05131c]';
            userDiv.innerHTML = `
                <div><p class="font-medium text-white">${user.name}</p><p class="text-sm text-custom-muted">${user.role} - ${user.department || 'N/D'}</p></div>
                ${currentUser.id != user.id ? `<div class="flex space-x-2">
                    <button data-user-id="${user.id}" class="change-role-btn text-custom-highlight hover:text-white"><i data-lucide="briefcase" class="w-4 h-4 pointer-events-none"></i></button>
                    <button data-user-id="${user.id}" class="delete-user-btn text-danger hover:brightness-125"><i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i></button>
                </div>` : ''}
            `;
            adminListDiv.appendChild(userDiv);
        });
        safeRenderIcons();
    }
    
    function showChangeRoleModal(userId) {
        const userToEdit = users.find(u => u.id == userId);
        if (!userToEdit) return;
        userIdToChangeRole = userId;
        document.getElementById('changeRoleUserName').textContent = userToEdit.name;
        document.getElementById('newRoleSelect').value = userToEdit.role;
        document.getElementById('changeRoleScreen').classList.remove('hidden');
        safeRenderIcons();
    }

    function cancelChangeRole() {
        document.getElementById('changeRoleScreen').classList.add('hidden');
        userIdToChangeRole = null;
    }

    async function changeRole(event) {
        event.preventDefault();
        if (!userIdToChangeRole) return;
        const newRole = document.getElementById('newRoleSelect').value;
        const userIndex = users.findIndex(u => u.id == userIdToChangeRole);
        if (userIndex !== -1) {
            users[userIndex].role = newRole;
            if (users[userIndex].department === 'N/D') users[userIndex].department = 'Geral';
            await saveData();
            alert(`Cargo de ${users[userIndex].name} alterado para ${newRole}.`);
            renderAdminUsersList();
            cancelChangeRole();
        }
    }
    
    function showEditProfile() {
        document.getElementById('editName').value = currentUser.name;
        tempPhotoBase64 = currentUser.photoUrl || '';
        previewEditImage(tempPhotoBase64);
        document.getElementById('editProfileScreen').classList.remove('hidden');
        safeRenderIcons();
    }

    function cancelEditProfile() {
        document.getElementById('editProfileScreen').classList.add('hidden');
        tempPhotoBase64 = '';
    }

    function previewEditImage(url) {
        const img = document.getElementById('editProfilePreview');
        const icon = document.getElementById('editProfileIcon');
        if (url) { img.src = url; img.classList.remove('hidden'); icon.classList.add('hidden'); }
        else { img.classList.add('hidden'); icon.classList.remove('hidden'); }
    }

    function handlePhotoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { alert("Imagem muito grande (máximo 2MB)."); return; }
        const reader = new FileReader();
        reader.onload = (e) => { tempPhotoBase64 = e.target.result; previewEditImage(tempPhotoBase64); };
        reader.readAsDataURL(file);
    }

    async function handleProfileUpdate(event) {
        event.preventDefault();
        const newName = document.getElementById('editName').value;
        const userIndex = users.findIndex(u => u.id === currentUser.id);
        if (userIndex !== -1) {
            users[userIndex].name = newName;
            users[userIndex].photoUrl = tempPhotoBase64;
            await saveData();
            updateSystemUI();
            alert('Perfil atualizado com sucesso!');
            cancelEditProfile();
        }
    }

    function logout() {
        sessionStorage.removeItem('loggedInUserId');
        window.location.href = 'login.html';
    }

    // --- 7. EVENT DELEGATION E LISTENERS ---
    document.body.addEventListener('click', async (event) => {
        const button = event.target.closest('button');
        if (!button) return;

        if (button.matches('.change-role-btn')) showChangeRoleModal(button.dataset.userId);
        if (button.matches('.delete-user-btn')) {
            if (confirm('Tem certeza que deseja excluir este usuário?')) {
                users = users.filter(u => u.id != button.dataset.userId);
                await saveData();
                renderAdminUsersList();
            }
        }
        if (button.matches('.delete-task-btn')) {
            if (confirm('Excluir esta tarefa?')) {
                tasks = tasks.filter(t => t.id != button.dataset.taskId);
                await saveData();
                if (currentTab === 'overview') renderOverviewTasks(); else renderTasks();
            }
        }
    });

    document.body.addEventListener('change', async (event) => {
        if (event.target.matches('.task-checkbox')) {
            const task = tasks.find(t => t.id == event.target.dataset.taskId);
            if (task) {
                task.status = event.target.checked ? 'completed' : 'pending';
                await saveData();
                if (currentTab === 'overview') renderOverviewTasks(); else renderTasks();
            }
        }
    });

    // --- 8. LISTENERS DIRETOS E INICIALIZAÇÃO ---
    document.getElementById('logoutButton').addEventListener('click', logout);
    document.getElementById('adminButton').addEventListener('click', toggleAdminPanel);
    document.getElementById('personalTab').addEventListener('click', () => switchTab('personal'));
    document.getElementById('generalTab').addEventListener('click', () => switchTab('general'));
    document.getElementById('overviewTab').addEventListener('click', () => switchTab('overview'));
    document.getElementById('addTaskForm').addEventListener('submit', handleAddTask);
    document.getElementById('showEditProfileButton').addEventListener('click', showEditProfile);
    document.getElementById('cancelEditProfileButton').addEventListener('click', cancelEditProfile);
    document.getElementById('cancelEditProfileButton2').addEventListener('click', cancelEditProfile);
    document.getElementById('editProfileForm').addEventListener('submit', handleProfileUpdate);
    document.getElementById('editPhotoInput').addEventListener('change', handlePhotoUpload);
    document.getElementById('changeRoleForm').addEventListener('submit', changeRole);
    document.getElementById('cancelChangeRoleButton').addEventListener('click', cancelChangeRole);
    document.getElementById('cancelChangeRoleButton2').addEventListener('click', cancelChangeRole);

    document.querySelectorAll('#overviewContent button[data-filter]').forEach(button => {
        button.addEventListener('click', () => {
            overviewFilter = button.dataset.filter;
            renderOverviewTasks();
        });
    });
    
    // --- 9. INICIALIZAÇÃO DO PAINEL ---
    console.log(`Bem-vindo, ${currentUser.name}!`);
    updateSystemUI();
    if (currentUser.role === 'CEO') switchTab('overview'); else switchTab('personal');
});