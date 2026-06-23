const Planner = require('../models/Planner');

exports.getPlans = async (req, res) => {
    const plans = await Planner.find();
    res.json(plans);
};

exports.createPlan = async (req, res) => {
    const plan = new Planner(req.body);
    await plan.save();
    res.json(plan);
};