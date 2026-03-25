const Note = require('../models/Note');

exports.getNotes = async (req, res) => {
    const notes = await Note.find();
    res.json(notes);
};

exports.createNote = async (req, res) => {
    const note = new Note(req.body);
    await note.save();
    res.json(note);
};