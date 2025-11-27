document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            
            try {
                const response = await fetch('/api/data');
                const data = await response.json();
                const users = data.users;

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
            } catch (error) {
                console.error("Erro ao fazer login:", error);
                alert("Não foi possível conectar ao servidor. Tente novamente.");
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const response = await fetch('/api/data');
                const data = await response.json();
                
                const newName = document.getElementById('newName').value;
                const newEmail = document.getElementById('newEmail').value.trim();
                const newPassword = document.getElementById('newPassword').value;
                const confirmPassword = document.getElementById('confirmPassword').value;

                if (newPassword !== confirmPassword) { alert('As senhas não coincidem!'); return; }
                if (data.users.some(u => u.email.toLowerCase() === newEmail.toLowerCase())) { alert('Este email já está cadastrado.'); return; }

                const newUser = {
                    id: data.users.length > 0 ? Math.max(...data.users.map(u => u.id)) + 1 : 1,
                    name: newName, email: newEmail, password: newPassword,
                    role: 'Pendente', department: 'N/D', photoUrl: ''
                };
                
                data.users.push(newUser);

                const saveResponse = await fetch('/api/data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (!saveResponse.ok) throw new Error("Falha ao salvar o novo usuário.");

                alert('Conta criada com sucesso! Você será redirecionado para a tela de login.');
                window.location.href = 'login.html';
            } catch (error) {
                console.error("Erro no registro:", error);
                alert("Não foi possível registrar a conta. Tente novamente.");
            }
        });
    }
});