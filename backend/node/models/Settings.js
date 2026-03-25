const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
    userId: String,
    theme: String,
    wallpaper: String,
    taskbarPosition: String
});

module.exports = mongoose.model('Settings', SettingsSchema);