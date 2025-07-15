const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { makeMyobApiRequest } = require('../lib/myob');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { NotFoundError } = require('../lib/errors');

router.get('/', requireAuth, asyncHandler(async (req, res, next) => {
    // Try fetching from DB first
    const { rows } = await query('SELECT myob_uid as id, name FROM company_files');
    if (rows.length > 0) {
        return res.json({ files: rows });
    }

    // If not in DB, fetch from MYOB API
    const data = await makeMyobApiRequest('https://api.myob.com/accountright/');
    
    if (!data || !data.length === 0) {
        return next(new NotFoundError('No company files found from MYOB.'));
    }

    // Format for the frontend and insert into DB for caching
    const filesForUi = [];
    for (const file of data) {
        filesForUi.push({ id: file.Id, name: file.Name });
        await query(
            'INSERT INTO company_files (myob_uid, name, uri, country) VALUES ($1, $2, $3, $4) ON CONFLICT (myob_uid) DO UPDATE SET name = $2, uri = $3, country = $4',
            [file.Id, file.Name, file.Uri, file.Country]
        );
    }
    
    res.json({ files: filesForUi });
}));

module.exports = router;
