const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

exports.signup = async (req, res) => {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    const user = new User({
        username: req.body.username,
        email: req.body.email,
        password: hashedPassword
    });

    await user.save();
    res.json(user);
};

exports.login = async (req, res) => {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.send("User not found");

    const validPass = await bcrypt.compare(req.body.password, user.password);
    if (!validPass) return res.send("Invalid password");

    const token = jwt.sign({ id: user._id }, "secretkey");
    res.json({ token });
};