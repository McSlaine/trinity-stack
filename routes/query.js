const express = require('express');
const router = express.Router();
const { getEmbedding, query } = require('../vector');
const { BadRequestError } = require('../lib/errors');
const asyncHandler = require('../middleware/asyncHandler');

router.post('/', asyncHandler(async (req, res, next) => {
    const { query: queryString } = req.body;

    if (!queryString) {
        return next(new BadRequestError('Query string is required.'));
    }

    const embedding = await getEmbedding(queryString);
    const results = await query(embedding);
    res.json(results);
}));

router.delete('/clear', asyncHandler(async (req, res, next) => {
    const { deleteAll } = require('../vector');
    await deleteAll();
    res.json({ message: 'Pinecone index cleared.' });
}));

router.delete('/recreate-index', asyncHandler(async (req, res, next) => {
    const { deleteIndex } = require('../vector');
    await deleteIndex();
    res.json({ message: 'Pinecone index deleted.' });
}));

router.post('/recreate-index', asyncHandler(async (req, res, next) => {
    const { createIndex } = require('../vector');
    await createIndex();
    res.json({ message: 'Pinecone index created.' });
}));

module.exports = router;
