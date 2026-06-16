export const staffOnly = (req, res, next) => {
  if (req.user && (req.user.role === 'staff' || req.user.role === 'admin')) {
    return next();
  }
  res.status(403).json({ message: 'Access denied. Staff only.' });
};