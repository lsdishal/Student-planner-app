const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://127.0.0.1:27017/webos')
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/files', require('./routes/files'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/email', require('./routes/email'));
app.use('/api/planner', require('./routes/planner'));
app.use('/api/terminal', require('./routes/terminal'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/notifications', require('./routes/notifications'));

app.listen(5000, () => {
    console.log("Server running on port 5000");
});