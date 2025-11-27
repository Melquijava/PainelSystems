document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('users')) {
        const defaultUsers = [{
            id: 1, name: 'CEO', email: 'ceo@systems.com', password: '123', role: 'CEO', department: 'Diretoria', photoUrl: ''
        }];
        localStorage.setItem('users', JSON.stringify(defaultUsers));
    }

    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            
            const users = JSON.parse(localStorage.getItem('users'));
            const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

            if (user && user.password === password) {
                if (user.role === 'Pendente') {
                    alert('Sua conta aguarda aprovação de um administrador.');
                    return;
                }
                sessionStorage.setItem('loggedInUserId', user.id);
                window.location.href = 'index.html';
            } else {
                alert('Email ou senha incorretos.');
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const users = JSON.parse(localStorage.getItem('users'));
            const newName = document.getElementById('newName').value;
            const newEmail = document.getElementById('newEmail').value.trim();
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (newPassword !== confirmPassword) { alert('As senhas não coincidem!'); return; }
            if (users.some(u => u.email.toLowerCase() === newEmail.toLowerCase())) { alert('Este email já está cadastrado.'); return; }

            const newUser = {
                id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
                name: newName, email: newEmail, password: newPassword,
                role: 'Pendente', department: 'N/D', photoUrl: ''
            };

            users.push(newUser);
            localStorage.setItem('users', JSON.stringify(users));
            alert('Conta criada com sucesso! Você será redirecionado para a tela de login.');
            window.location.href = 'login.html';
        });
    }
});