const express = require('express');
const router = express.Router();
const multer = require('multer');
const playerController = require('../controllers/player.controller');
const { protect } = require('../middleware/auth.middleware');

// Configure multer for photo upload (memory storage for Cloudinary)
const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit (optimized for speed)
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|heic|heif/i;
    const extname = allowedTypes.test(file.originalname.split('.').pop().toLowerCase());
    // Accept common image mimetypes including mobile formats
    const mimetype = file.mimetype.startsWith('image/');
    
    if (mimetype && extname) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, JPG, PNG, GIF, WebP, HEIC) are allowed'));
    }
  }
});

// Pre-upload photo for public registration (no auth needed)
router.post('/upload-photo-public', photoUpload.single('photo'), playerController.uploadPhotoPublic);

// Player registration with photo upload (public - uses token validation)
router.post('/register', photoUpload.single('photo'), playerController.registerPlayer);

// Protected routes - require authentication
router.use(protect);

// Get random unsold player (must be before /:playerId)
router.get('/random', playerController.getRandomPlayer);

// Get all unsold players (must be before /:playerId)
router.get('/unsold', playerController.getUnsoldPlayers);

// Delete all players (for auction reset - must be before /:playerId)
router.delete('/', playerController.deleteAllPlayers);

// Get all players
router.get('/', playerController.getAllPlayers);

// Pre-upload photo to Cloudinary (returns URL immediately)
router.post('/upload-photo', photoUpload.single('photo'), playerController.uploadPhoto);

// Create player from admin panel (must be before /:playerId)
router.post('/', photoUpload.single('photo'), playerController.createPlayer);

// Assign player to team
router.post('/:playerId/assign', playerController.assignPlayer);

// Mark player as unsold
router.post('/:playerId/unsold', playerController.markUnsold);

// Remove player from team
router.delete('/:playerId/remove-from-team', playerController.removePlayerFromTeam);

// Update player (PATCH and PUT for compatibility) - with photo upload support
router.patch('/:playerId', photoUpload.single('photo'), playerController.updatePlayer);
router.put('/:playerId', photoUpload.single('photo'), playerController.updatePlayer);

// Delete single player
router.delete('/:playerId', playerController.deletePlayer);

module.exports = router;