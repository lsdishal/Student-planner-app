const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
    userId: String,
    fileName: String,
    fileType: String,
    content: String,
    path: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('File', FileSchema);