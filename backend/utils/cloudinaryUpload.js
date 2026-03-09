const cloudinary = require('../config/cloudinary');

/**
 * Upload a buffer to Cloudinary. Returns the Cloudinary result object.
 */
function uploadToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });
}

module.exports = { uploadToCloudinary };
