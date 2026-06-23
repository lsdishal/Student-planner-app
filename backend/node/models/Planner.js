const mongoose = require('mongoose');

const PlannerSchema = new mongoose.Schema({
    userId: String,
    title: String,
    description: String,
    date: String,
    time: String
});

module.exports = mongoose.model('Planner', PlannerSchema);