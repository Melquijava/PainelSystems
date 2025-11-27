const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const dataFolderPath = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'data');
const dataFilePath = path.join(dataFolderPath, 'data.json');

if (!fs.existsSync(dataFolderPath)) {
    fs.mkdirSync(dataFolderPath, { recursive: true });
}

app.use(express.json());
app.use(express.static(__dirname)); 
-


app.get('/api/data', (req, res) => {
    fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                const defaultData = {
                    users: [{ id: 1, name: 'CEO', email: 'ceo@systems.com', password: '123', role: 'CEO', department: 'Diretoria', photoUrl: '' }],
                    tasks: []
                };
                fs.writeFile(dataFilePath, JSON.stringify(defaultData, null, 2), (writeErr) => {
                    if (writeErr) return res.status(500).json({ message: "Erro ao criar arquivo de dados." });
                    return res.json(defaultData);
                });
            } else {
                return res.status(500).json({ message: "Erro ao ler dados." });
            }
        } else {
            res.json(JSON.parse(data));
        }
    });
});

app.post('/api/data', (req, res) => {
    const newData = req.body;
    fs.writeFile(dataFilePath, JSON.stringify(newData, null, 2), (err) => {
        if (err) {
            return res.status(500).json({ message: "Erro ao salvar dados." });
        }
        res.status(200).json({ message: "Dados salvos com sucesso!" });
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Dados serão salvos em: ${dataFilePath}`);
});