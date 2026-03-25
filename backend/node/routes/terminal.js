const express = require('express');
const router = express.Router();
const terminalController = require('../controllers/terminalController');

router.post('/', terminalController.runCommand);

module.exports = router;