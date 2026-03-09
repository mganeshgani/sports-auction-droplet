const express = require('express');
const router = express.Router();
const multer = require('multer');
const teamController = require('../controllers/team.controller');
const { protect } = require('../middleware/auth.middleware');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for faster uploads
  fileFilter: (req, file, cb) => {
    // Accept all image types
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
      'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff',
      'image/x-icon', 'image/heic', 'image/heif', 'image/avif'
    ];
    
    if (file.mimetype.startsWith('image/') || allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (JPG, PNG, GIF, WebP, SVG, etc.)'));
    }
  }
});

// Apply authentication to all team routes
router.use(protect);

// Create new team (with logo upload)
router.post('/', upload.single('logo'), teamController.createTeam);

// Get final results (must be before /:teamId to avoid conflict)
router.get('/results/final', teamController.getFinalResults);

// Delete all teams (for auction reset - must be before /:teamId)
router.delete('/', teamController.deleteAllTeams);

// Update team (with logo upload)
router.put('/:teamId', upload.single('logo'), teamController.updateTeam);
router.patch('/:teamId', upload.single('logo'), teamController.updateTeam);

// Duplicate PATCH route removed (already registered above with file upload support)

// Delete single team
router.delete('/:teamId', teamController.deleteTeam);

// Get all teams
router.get('/', teamController.getAllTeams);

// Get team by ID
router.get('/:teamId', teamController.getTeamById);

module.exports = router;