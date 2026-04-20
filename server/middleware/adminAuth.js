const adminAuth = (req, res, next) => {
  const password = req.body?.password;
  const adminHeader = req.headers['x-admin-password'];
  const pwd = password || adminHeader;

  if (!pwd) {
    return res.status(401).json({ error: 'Admin password required' });
  }

  if (pwd !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid admin password' });
  }

  next();
};

module.exports = adminAuth;
