const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const { cloudinary, parser } = require('../utils/cloudinary');

console.log('Cloudinary config:', {
  cloud_name: process.env.CLOUD_NAME ? 'SET' : 'NOT SET',
  api_key: process.env.CLOUD_API_KEY ? 'SET' : 'NOT SET',
  api_secret: process.env.CLOUD_SECRET ? 'SET' : 'NOT SET'
});

router.post('/', protect, admin, parser.array('images', 5), async (req, res, next) => {
  try {
    console.log('Upload request received');
    console.log('Files:', req.files);
    
    if (!req.files || req.files.length === 0) {
      console.log('No files in request');
      return res.status(400).json({
        success: false,
        message: 'No images uploaded'
      });
    }

    const images = req.files.map(file => ({
      url: file.path,
      public_id: file.filename,
      alt: req.body.alt || ''
    }));

    console.log('Upload successful:', images.length, 'images');
    res.status(200).json({
      success: true,
      images
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload images'
    });
  }
});

router.delete('/:publicId', protect, admin, async (req, res, next) => {
  try {
    console.log('Delete request for:', req.params.publicId);
    const result = await cloudinary.uploader.destroy(req.params.publicId);

    if (result.result !== 'ok') {
      return res.status(400).json({
        success: false,
        message: 'Failed to delete image'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete image'
    });
  }
});

module.exports = router;
