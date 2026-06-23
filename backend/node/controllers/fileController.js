const File = require('../models/File');

exports.getFiles = async (req, res) => {
    const files = await File.find();
    res.json(files);
};

exports.createFile = async (req, res) => {
    const file = new File(req.body);
    await file.save();
    res.json(file);
};

exports.deleteFile = async (req, res) => {
    await File.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
};