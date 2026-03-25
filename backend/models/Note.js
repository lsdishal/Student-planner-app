const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
    userId: String,
    title: String,
    content: String,
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Note', NoteSchema);