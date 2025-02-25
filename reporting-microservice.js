const dotEnv = require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const QuickChart = require('quickchart-js');
const fs = require('fs');
const path = require('path');

const app = express();

const PORT = process.env.PORT;

app.use(bodyParser.json());
app.use(cors());

const REPORTS_DIR = path.join(__dirname, 'reports');
if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR);
}

const reportsFile = path.join(REPORTS_DIR, 'reports.json');
let reports = {};

if(fs.existsSync(reportsFile)){
    try{
        reports = JSON.parse(fs.readFileSync(reportsFile, 'utf-8'));
        console.log('Reports loaded from file.');
    } catch(error) {
        console.error('Failed to parse reports.');
        reports = {};
    }
} else{
    fs.writeFileSync(reportsFile, JSON.stringify(reports, null, 2), 'utf-8');
    console.log('Created new reports.json')
}

const saveReports = () => {
    fs.writeFileSync(reportsFile, JSON.stringify(reports, null, 2), 'utf-8');
};

const chartTypes = {
    'expense-vs-budget' : 'pie',
    'revenue-vs-expenses': 'bar',
    'task-completion': 'doughnut'
};

app.post('/reports/generate', async (req, res) => {
    const { reportType, title = 'Generated Report', categories = [], values = [] } = req.body;
    if(!chartTypes[reportType]){
        return res.status(400).json({ message: 'Invalid report type' });
    }

    const reportId = Object.keys(reports).length + 1;
    const chart = new QuickChart();

    chart.setConfig({
        type: chartTypes[reportType],
        data: { labels: categories, datasets: [{ data: values }] },
        options: { plugins: { title: { display: true, text: title } } }
    });

    const imagePath = path.join(REPORTS_DIR, `report${reportId}.png`);
    await chart.toFile(imagePath);
    reports[reportId] = { title, imagePath };
    saveReports();

    res.json({ mesage: 'Report generated', report_id: reportId });
});

app.get('/reports/:reportId', (req, res) => {
    const { reportId } = req.params;
    const report = reports[reportId];
    if(!report) return res.status(404).json({ message: 'Report not found' });
    res.sendFile(report.imagePath);
});

app.get('/reports', (req, res) => {
    res.json(Object.keys(reports).map(id => ({ id, title: reports[id].title })));
});

app.use('/reports/images', express.static(REPORTS_DIR));

app.listen(PORT, () => {
    console.log(`Server runing on http://localhost:${PORT}`);
});