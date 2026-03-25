const Settings = require('../models/Settings');

exports.getSettings = async (req, res) => {
    const settings = await Settings.find();
    res.json(settings);
};

exports.saveSettings = async (req, res) => {
    const settings = new Settings(req.body);
    await settings.save();
    res.json(settings);
};