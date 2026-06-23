const Notification = require('../models/Notification');

exports.getNotifications = async (req, res) => {
    const notifications = await Notification.find();
    res.json(notifications);
};

exports.createNotification = async (req, res) => {
    const notification = new Notification(req.body);
    await notification.save();
    res.json(notification);
};