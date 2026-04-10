import User from '../models/User.js';

const XP_REWARDS = {
  ONBOARDING_COMPLETE: 50,
  SESSION_COMPLETED: 75,
  TAUGHT_SESSION: 50,
  FIVE_STAR_REVIEW_RECEIVED: 30,
  REVIEW_SUBMITTED: 15,
  SKILL_ENDORSEMENT_RECEIVED: 10,
  FIRST_SESSION: 100,
};

const MENTOR_LEVELS = [
  { name: 'Novice', min: 0 },
  { name: 'Learner', min: 201 },
  { name: 'Practitioner', min: 501 },
  { name: 'Expert', min: 1001 },
  { name: 'Mentor', min: 2501 },
];

const awardXP = async (userId, amount, reason) => {
  try {
    const user = await User.findById(userId);
    if (!user) return null;

    // Use atomic operation to prevent race conditions during high concurrency
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $inc: { xpPoints: amount }
      },
      { new: true } // Return updated document
    );

    let newLevel = updatedUser.mentorLevel;
    
    // Calculate if level changed
    for (let i = MENTOR_LEVELS.length - 1; i >= 0; i--) {
        if (updatedUser.xpPoints >= MENTOR_LEVELS[i].min) {
            newLevel = MENTOR_LEVELS[i].name;
            break;
        }
    }

    if (newLevel !== updatedUser.mentorLevel) {
        updatedUser.mentorLevel = newLevel;
        await updatedUser.save();
    }

    // Badge logic could go here based on reason or thresholds

    console.log(`Awarded ${amount} XP to User ${userId} for ${reason}. New total: ${updatedUser.xpPoints}`);
    return updatedUser;

  } catch (err) {
    console.error(`Failed to award XP to User ${userId}`, err);
    return null;
  }
};

export { awardXP, XP_REWARDS, MENTOR_LEVELS };
