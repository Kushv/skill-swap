import Review from '../models/Review.js';
import Session from '../models/Session.js';
import User from '../models/User.js';
import { awardXP, XP_REWARDS } from '../utils/xpService.js';

// @desc    Submit review after session
// @route   POST /api/reviews
// @access  Private
const submitReview = async (req, res, next) => {
     try {
         const { sessionId, ratings, reviewText, skillsEndorsed } = req.body;
         const { teachingQuality, communication, helpfulness } = ratings;

         const session = await Session.findById(sessionId);
         if (!session || session.status !== 'completed') {
             res.status(400);
             throw new Error('Invalid session or session not completed');
         }

         if (!session.participants.some(p => p.toString() === req.user._id.toString())) {
             res.status(403);
             throw new Error('Not authorized to review this session');
         }

         const existingReview = await Review.findOne({ sessionId, reviewer: req.user._id });
         if (existingReview) {
              res.status(400);
              throw new Error('Review already submitted for this session');
         }

         const revieweeId = session.participants.find(p => p.toString() !== req.user._id.toString());
         
         const overallRating = (teachingQuality + communication + helpfulness) / 3;

         const review = await Review.create({
             sessionId,
             reviewer: req.user._id,
             reviewee: revieweeId,
             ratings: { teachingQuality, communication, helpfulness },
             overallRating,
             reviewText,
             skillsEndorsed
         });

         // Update Reviewee Rating
         const reviewee = await User.findById(revieweeId);
         const currentAvg = reviewee.averageRating || 0;
         const count = reviewee.ratingCount || 0;
         
         reviewee.averageRating = ((currentAvg * count) + overallRating) / (count + 1);
         reviewee.ratingCount += 1;
         await reviewee.save();

         // Award XP For Submitting Review
         await awardXP(req.user._id, XP_REWARDS.REVIEW_SUBMITTED, 'Review Submitted');

         // Award XP if 5 star received
         if (overallRating === 5) {
             await awardXP(revieweeId, XP_REWARDS.FIVE_STAR_REVIEW_RECEIVED, '5-Star Review Received');
         }

         // Award XP for endorsements
         if (skillsEndorsed && skillsEndorsed.length > 0) {
              await awardXP(revieweeId, XP_REWARDS.SKILL_ENDORSEMENT_RECEIVED * skillsEndorsed.length, 'Skill Endorsements');
         }

         res.status(201).json({ success: true, data: review });
     } catch (error) {
         next(error);
     }
}

// @desc    Get reviews for a user
// @route   GET /api/reviews/user/:userId
// @access  Private
const getUserReviews = async (req, res, next) => {
     try {
         const reviews = await Review.find({ reviewee: req.params.userId })
              .populate('reviewer', 'name avatar mentorLevel')
              .sort({ createdAt: -1 });

         res.status(200).json({ success: true, data: reviews });
     } catch (error) {
         next(error);
     }
}

// @desc    Get reviews for a session
// @route   GET /api/reviews/session/:sessionId
// @access  Private
const getSessionReviews = async (req, res, next) => {
      try {
           const reviews = await Review.find({ sessionId: req.params.sessionId })
               .populate('reviewer', 'name avatar');
              
           res.status(200).json({ success: true, data: reviews });
      } catch (error) {
          next(error);
      }
}

export {
    submitReview,
    getUserReviews,
    getSessionReviews
}
