const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME || 'dxgxu4znm',
  api_key: process.env.CLOUD_API_KEY || '',
  api_secret: process.env.CLOUD_SECRET || ''
});

router.get('/test', (req, res) => {
  res.json({
    cloud_name_set: !!process.env.CLOUD_NAME,
    api_key_set: !!process.env.CLOUD_API_KEY,
    api_secret_set: !!process.env.CLOUD_SECRET,
    cloud_name: process.env.CLOUD_NAME || 'dxgxu4znm',
    api_key_length: process.env.CLOUD_API_KEY ? process.env.CLOUD_API_KEY.length : 0
  });
});

const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

router.post('/', protect, admin, upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images uploaded'
      });
    }

    const uploadPromises = req.files.map(file => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'luxury-perfume',
            resource_type: 'image',
            transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto:good' }]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(file.buffer);
      });
    });

    const results = await Promise.all(uploadPromises);
    
    const images = results.map(result => ({
      url: result.secure_url,
      public_id: result.public_id,
      alt: ''
    }));

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

router.delete('/:publicId', protect, admin, async (req, res) => {
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
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete image'
    });
  }
});

module.exports = router;
