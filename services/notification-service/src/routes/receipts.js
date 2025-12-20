const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

router.get('/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../storage', filename);

    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('Receipt not found');
    }
});

module.exports = router;
