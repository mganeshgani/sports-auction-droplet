const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
const BASE_URL = process.env.BASE_URL || 'http://localhost:5001';

/**
 * Save an image buffer to local disk with sharp processing.
 * @param {Buffer} buffer - The image file buffer
 * @param {Object} options
 * @param {string} options.folder - Subfolder under UPLOAD_DIR (e.g. 'player-photos', 'team-logos')
 * @param {number} [options.width=600] - Max width
 * @param {number} [options.height=600] - Max height
 * @param {string} [options.fit='inside'] - sharp fit mode ('inside', 'cover', etc.)
 * @returns {Promise<string>} The public URL of the saved image
 */
async function saveImage(buffer, options = {}) {
  const {
    folder = 'player-photos',
    width = 600,
    height = 600,
    fit = 'inside'
  } = options;

  const dir = path.join(UPLOAD_DIR, folder);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const filename = `${uuidv4()}.webp`;
  const filePath = path.join(dir, filename);

  await sharp(buffer)
    .resize(width, height, { fit, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(filePath);

  return `${BASE_URL}/uploads/${folder}/${filename}`;
}

module.exports = { saveImage };
