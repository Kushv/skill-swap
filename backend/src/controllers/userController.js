import User from '../models/User.js';
import cloudinary from 'cloudinary';

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// @desc    Get current user profile
// @route   GET /api/users/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -refreshToken -otp -otpExpiry')
      .populate('connections', 'name avatar mentorLevel')
      .populate('savedMatches', 'name avatar mentorLevel');

    if (user) {
      res.status(200).json({ success: true, data: user });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/users/me
// @access  Private
const updateMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      user.learningStyle = req.body.learningStyle || user.learningStyle;

      if (req.body.bio !== undefined) {
        user.bio = req.body.bio;
      }

      if (req.body.skillsToTeach) {
        user.skillsToTeach = req.body.skillsToTeach;
      }
      
      if (req.body.skillsToLearn) {
        user.skillsToLearn = req.body.skillsToLearn;
      }

      if (req.body.avatar) {
         user.avatar = req.body.avatar;
      }

      const updatedUser = await user.save();
      res.status(200).json({ success: true, data: updatedUser });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Complete onboarding
// @route   PUT /api/users/me/onboarding
// @access  Private
const completeOnboarding = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
       // Frontend sends all these fields during onboarding
       user.skillsToTeach = req.body.skillsToTeach || user.skillsToTeach;
       user.skillsToLearn = req.body.skillsToLearn || user.skillsToLearn;
       user.learningStyle = req.body.learningStyle || user.learningStyle;
       user.onboardingComplete = true;

       // Basic initial XP reward
       if (user.xpPoints === 0) {
           user.xpPoints += 50; // XP_REWARDS.ONBOARDING_COMPLETE
       }

       const updatedUser = await user.save();

       res.status(200).json({ success: true, data: updatedUser });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
      next(error);
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:userId
// @access  Private
const getUserById = async (req, res, next) => {
  try {
      const user = await User.findById(req.params.userId)
          .select('-password -refreshToken -otp -otpExpiry -email');

      if (user) {
         res.status(200).json({ success: true, data: user });
      } else {
          res.status(404);
          throw new Error('User not found');
      }
  } catch (error) {
     next(error);
  }
};

// @desc    Get leaderboard
// @route   GET /api/users/leaderboard
// @access  Private
const getLeaderboard = async (req, res, next) => {
  try {
    const users = await User.find({ xpPoints: { $gt: 0 } })
      .select('name avatar xpPoints mentorLevel totalSessionsCompleted averageRating badges')
      .sort({ xpPoints: -1 })
      .limit(20)
      .lean();

    const leaderboard = users.map((u, i) => ({ ...u, rank: i + 1 }));

    // Find current user's rank (may be outside top 20)
    const currentUserId = req.user._id.toString();
    const inTop20 = leaderboard.find(u => u._id.toString() === currentUserId);
    let currentUserRank = inTop20 ? inTop20.rank : null;
    if (!currentUserRank) {
      const currentUser = await User.findById(req.user._id).select('xpPoints').lean();
      const aboveCount = await User.countDocuments({ xpPoints: { $gt: currentUser?.xpPoints || 0 } });
      currentUserRank = aboveCount + 1;
    }

    res.status(200).json({ success: true, data: { leaderboard, currentUserRank } });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload Avatar (Multer + Cloudinary expected as middleware, assuming req.file exists)
// @route   POST /api/users/me/avatar
// @access  Private
const uploadAvatar = async (req, res, next) => {
    try {
        if (!req.file) {
             res.status(400);
             throw new Error('No image file provided');
        }

        // Upload to Cloudinary using buffer
        cloudinary.v2.uploader.upload_stream({ folder: 'skillswap_avatars' }, async (error, result) => {
             if (error) {
                 res.status(500);
                 return next(new Error('Image upload failed'));
             }

             const user = await User.findById(req.user._id);
             user.avatar = result.secure_url;
             await user.save();

             res.status(200).json({
                 success: true,
                 data: { avatar: user.avatar }
             });
        }).end(req.file.buffer);

    } catch (error) {
        next(error);
    }
};

export {
  getMe,
  updateMe,
  completeOnboarding,
  getUserById,
  getLeaderboard,
  uploadAvatar
};
