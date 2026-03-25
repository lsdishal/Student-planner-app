const File = require('../models/File');

exports.runCommand = async (req, res) => {
    const { command } = req.body;

    if (command === 'ls') {
        const files = await File.find();
        return res.json(files);
    }

    if (command.startsWith('touch')) {
        const fileName = command.split(' ')[1];
        const file = new File({ fileName });
        await file.save();
        return res.json({ message: "File created" });
    }

    res.json({ output: "Command executed" });
};