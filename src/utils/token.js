const { customAlphabet } = require('nanoid');

// URL-safe, unambiguous alphabet (no 0/O/1/l confusion)
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const generateToken = customAlphabet(ALPHABET, 10);

function generateSlug() {
  return generateToken();
}

function generateBatchId() {
  return `B${customAlphabet(ALPHABET, 8)()}`;
}

module.exports = { generateSlug, generateBatchId };
