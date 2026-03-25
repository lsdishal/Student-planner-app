const Email = require('../models/Email');

exports.getEmails = async (req, res) => {
    const emails = await Email.find();
    res.json(emails);
};

exports.sendEmail = async (req, res) => {
    const email = new Email(req.body);
    await email.save();
    res.json(email);
};