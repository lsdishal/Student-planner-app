const mongoose = require('mongoose');

const EmailSchema = new mongoose.Schema({
    from: String,
    to: String,
    subject: String,
    message: String,
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Email', EmailSchema);