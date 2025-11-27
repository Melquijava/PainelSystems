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

app.use(express.json({ limit: '5mb' }));
app.use(express.static(__dirname));


app.get('/api/data', (req, res) => {
    try {
        if (fs.existsSync(dataFilePath)) {
            const fileData = fs.readFileSync(dataFilePath, 'utf8');
            res.json(JSON.parse(fileData));
        } else {
            const defaultData = {
                users: [{ id: 1, name: 'CEO', email: 'exemplo@systems.com', password: '123456', role: 'Colaborador', department: 'Staff Systems_BSI', photoUrl: '' }],
                tasks: []
            };
            fs.writeFileSync(dataFilePath, JSON.stringify(defaultData, null, 2));
            res.json(defaultData);
        }
    } catch (error) {
        console.error("Erro ao ler dados:", error);
        res.status(500).json({ message: "Erro ao ler dados." });
    }
});

app.post('/api/data', (req, res) => {
    try {
        const newData = req.body;
        fs.writeFileSync(dataFilePath, JSON.stringify(newData, null, 2));
        res.status(200).json({ message: "Dados salvos com sucesso!" });
    } catch (error) {
        console.error("Erro ao salvar dados:", error);
        res.status(500).json({ message: "Erro ao salvar dados." });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Dados serão salvos em: ${dataFilePath}`);
});