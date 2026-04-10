import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/skillswap")
client = AsyncIOMotorClient(MONGO_URI)
db = client.get_database()
users_collection = db["users"]

async def calculate_matches(user_id, source_skills_teach, source_skills_learn, source_learning_style, existing_connections):
    # Fetch all candidate users (exclude self and existing connections)
    # Exclude those who haven't completed onboarding
    exclude_ids = [ObjectId(u_id) for u_id in existing_connections if ObjectId.is_valid(u_id)]
    exclude_ids.append(ObjectId(user_id))
    
    cursor = users_collection.find({
        "_id": {"$nin": exclude_ids},
        "onboardingComplete": True
    })
    
    candidates = await cursor.to_list(length=1000)
    
    scored_matches = []
    source_teach_set = set(str(s).lower() for s in source_skills_teach)
    source_learn_set = set(str(s).lower() for s in source_skills_learn)

    now = datetime.now(timezone.utc)

    for candidate in candidates:
        cand_teach = candidate.get("skillsToTeach", [])
        cand_learn = candidate.get("skillsToLearn", [])
        
        cand_teach_set = set(str(s.get("name", "")).lower() for s in cand_teach)
        cand_learn_set = set(str(s.get("name", "")).lower() for s in cand_learn)

        # 1. Skill Complementarity
        i_teach_they_learn = bool(source_teach_set.intersection(cand_learn_set))
        they_teach_i_learn = bool(cand_teach_set.intersection(source_learn_set))

        if i_teach_they_learn and they_teach_i_learn:
            skill_comp = 1.0
        elif i_teach_they_learn or they_teach_i_learn:
            skill_comp = 0.5
        else:
            skill_comp = 0.0
            
        # Match reasons
        reasons = []
        if skill_comp == 1.0:
            reasons.append("Perfect skill swap")
        elif they_teach_i_learn:
            reasons.append("They teach what you want to learn")
        elif i_teach_they_learn:
            reasons.append("They want to learn what you teach")

        # 2. Learning Style
        cand_style = candidate.get("learningStyle", "")
        if cand_style == source_learning_style and cand_style != "":
            style_match = 1.0
            reasons.append("Same learning style")
        else:
            style_match = 0.0

        # 3. Activity Score (Normalize lastActive)
        # Assuming lastActive is a datetime object in UTC
        cand_last_active = candidate.get("lastActive", now)
        # Ensure timezone-aware if naive
        if cand_last_active.tzinfo is None:
             cand_last_active = cand_last_active.replace(tzinfo=timezone.utc)
             
        days_inactive = (now - cand_last_active).days
        if days_inactive <= 0:
            activity_score = 1.0
        elif days_inactive >= 30:
            activity_score = 0.0
        else:
            activity_score = 1.0 - (days_inactive / 30.0)

        # 4. Rating Score (Normalize 0-5 to 0-1)
        # If no ratings, give them a neutral starting point of 0.6 (represents 3.0 stars) to not heavily penalize new users
        avg_rating = candidate.get("averageRating", 0)
        if candidate.get("ratingCount", 0) == 0:
             rating_score = 0.6 
        else:
             rating_score = avg_rating / 5.0
             if avg_rating >= 4.5:
                 reasons.append("Highly rated mentor")

        # Calculate final score
        match_score = (
            (skill_comp * 0.40) +
            (style_match * 0.20) +
            (activity_score * 0.20) +
            (rating_score * 0.20)
        ) * 100

        # Filter out 0 skill_comp if you only want people with AT LEAST some skill relation
        if skill_comp > 0:
            scored_matches.append({
                "userId": str(candidate["_id"]),
                "name": candidate.get("name", "Unknown"),
                "avatar": candidate.get("avatar", ""),
                "skillsToTeach": [s.get("name") for s in cand_teach],
                "skillsToLearn": [s.get("name") for s in cand_learn],
                "matchScore": int(match_score),
                "mentorLevel": candidate.get("mentorLevel", "Novice"),
                "averageRating": round(avg_rating, 1),
                "matchReasons": reasons
            })

    # Sort descending and take top 10
    scored_matches.sort(key=lambda x: x["matchScore"], reverse=True)
    return scored_matches[:10]
