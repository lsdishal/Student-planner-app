const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    userId: String,
    message: String,
    date: {
        type: Date,
        default: Date.now
    },
    read: Boolean
});

module.exports = mongoose.model('Notification', NotificationSchema);