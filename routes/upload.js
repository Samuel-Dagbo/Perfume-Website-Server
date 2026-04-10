const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const { cloudinary, parser } = require('../utils/cloudinary');

router.post('/upload', protect, admin, parser.array('images', 5), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
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

    res.status(200).json({
      success: true,
      images
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/delete/:publicId', protect, admin, async (req, res, next) => {
  try {
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
    next(error);
  }
});

module.exports = router;
