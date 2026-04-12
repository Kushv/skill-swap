import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        res.status(401);
        return next(new Error('Not authorized, user not found'));
      }

      return next();
    } catch (error) {
      res.status(401);
      if (error.name === 'TokenExpiredError') {
        return next(new Error('Not authorized, token expired'));
      }
      return next(new Error('Not authorized, token failed'));
    }
  }

  // No token provided at all
  res.status(401);
  return next(new Error('Not authorized, no token'));
};

export { protect };
