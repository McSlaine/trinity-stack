// vector.js
const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAI } = require('openai');
const db = require('./db');

let pinecone, pineconeIndex, openai;

function initVectorServices(config) {
    if (!config.pineconeApiKey || !config.pineconeHost || !config.openaiApiKey) {
        throw new Error("Pinecone or OpenAI configuration is missing.");
    }
    pinecone = new Pinecone({ apiKey: config.pineconeApiKey });
    pineconeIndex = pinecone.index(process.env.PINECONE_INDEX_NAME.trim());
    openai = new OpenAI({ apiKey: config.openaiApiKey });
}

async function getEmbedding(text) {
    const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: text,
    });
    return response.data[0].embedding;
}

async function query(vector, topK = 10) {
    if (!pineconeIndex) {
        throw new Error("Pinecone index is not initialized.");
    }
    const results = await pineconeIndex.query({
        vector,
        topK,
        includeMetadata: true,
    });
    return results.matches;
}

async function pushToVectorDB(text, metadata) {
    if (!pineconeIndex) {
        throw new Error("Pinecone index is not initialized.");
    }
    const embedding = await getEmbedding(text);
    await pineconeIndex.upsert([{
        id: metadata.id,
        values: embedding,
        metadata: metadata,
    }]);
}

async function deleteAll() {
    if (!pineconeIndex) {
        throw new Error("Pinecone index is not initialized.");
    }
    await pineconeIndex.deleteAll();
}

async function deleteIndex() {
    if (!pinecone) {
        throw new Error("Pinecone is not initialized.");
    }
    await pinecone.deleteIndex(process.env.PINECONE_INDEX_NAME.trim());
}

async function createIndex() {
    if (!pinecone) {
        throw new Error("Pinecone is not initialized.");
    }
    await pinecone.createIndex({
        name: process.env.PINECONE_INDEX_NAME.trim(),
        dimension: 1536,
        spec: {
            serverless: {
                cloud: 'aws',
                region: 'us-east-1'
            }
        }
    });
}

const EMBEDDING_MODEL = 'text-embedding-3-small';
const MAX_RETRIES = 3;

module.exports = {
    initVectorServices,
    getEmbedding,
    query,
    pushToVectorDB,
    deleteAll,
    deleteIndex,
    createIndex,
};
