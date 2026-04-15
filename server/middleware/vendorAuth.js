const Vendor = require('../models/Vendor');

const vendorAuth = async (req, res, next) => {
  try {
    const { pin } = req.body;
    const { id } = req.params;

    if (!pin) {
      return res.status(401).json({ error: 'PIN required' });
    }

    const vendor = await Vendor.findOne({ vendorId: id });
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    if (vendor.pin !== pin) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    req.vendor = vendor;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authentication failed' });
  }
};

module.exports = vendorAuth;
