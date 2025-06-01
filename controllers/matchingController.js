const User = require("../models/userModel");
const createError = require("../utils/appError");

// Get profile matches for logged-in user with advanced filtering
exports.getProfileMatches = async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.user.id);
    
    if (!currentUser) {
      return next(new createError("User not found", 404));
    }

    // Get query parameters for advanced filtering
    const { 
      limit = 20, 
      page = 1, 
      minScore = 0,
      maxScore = 100,
      skill,
      category,
      location,
      minRating = 0,
      maxRating = 5,
      skillLevel, // beginner, intermediate, advanced, expert
      minExperience = 0,
      maxExperience = 50,
      activityStatus, // active, recent, any
      availabilityStatus, // available, any
      languages,
      sortBy = 'score', // score, rating, activity, name
      sortOrder = 'desc', // asc, desc
      searchQuery, // general search across name, bio, skills
    } = req.query;

    // Build base query for finding potential matches
    let matchQuery = {
      _id: { $ne: req.user.id },
      isActive: true,
      isVerified: true,
    };

    // Apply rating filter
    if (minRating > 0 || maxRating < 5) {
      matchQuery.averageRating = {
        ...(minRating > 0 && { $gte: parseFloat(minRating) }),
        ...(maxRating < 5 && { $lte: parseFloat(maxRating) })
      };
    }

    // Apply activity status filter
    if (activityStatus && activityStatus !== 'any') {
      const now = new Date();
      if (activityStatus === 'active') {
        // Active in last 24 hours
        matchQuery.lastActiveAt = { $gte: new Date(now - 24 * 60 * 60 * 1000) };
      } else if (activityStatus === 'recent') {
        // Active in last 7 days
        matchQuery.lastActiveAt = { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) };
      }
    }

    // Apply availability filter
    if (availabilityStatus === 'available') {
      matchQuery['availability.isAvailable'] = true;
    }

    // Apply location filter (more flexible)
    if (location) {
      matchQuery.$or = [
        { 'location.city': { $regex: location, $options: 'i' } },
        { 'location.state': { $regex: location, $options: 'i' } },
        { 'location.country': { $regex: location, $options: 'i' } },
      ];
    }

    // Apply general search query
    if (searchQuery) {
      const searchRegex = { $regex: searchQuery, $options: 'i' };
      matchQuery.$or = [
        { name: searchRegex },
        { bio: searchRegex },
        { occupation: searchRegex },
        { 'skillsToTeach.name': searchRegex },
        { 'skillsToLearn.name': searchRegex },
        ...(matchQuery.$or || [])
      ];
    }

    // Apply languages filter
    if (languages) {
      const languageArray = Array.isArray(languages) ? languages : [languages];
      matchQuery['languages.language'] = { $in: languageArray };
    }

    // Get all potential matches based on basic filters
    const allUsers = await User.find(matchQuery)
      .select('name email avatar bio location skillsToTeach skillsToLearn averageRating totalRatings lastActiveAt profileViews languages availability');

    // Calculate matches with advanced filtering
    const matches = [];

    for (const user of allUsers) {
      // Apply skill-specific filters
      let skillsMatch = true;
      
      if (skill || category || skillLevel || minExperience !== undefined || maxExperience !== undefined) {
        skillsMatch = false;
        
        for (const teachSkill of user.skillsToTeach) {
          let skillMatches = true;
          
          // Filter by specific skill
          if (skill && !teachSkill.name.toLowerCase().includes(skill.toLowerCase())) {
            skillMatches = false;
          }
          
          // Filter by category
          if (category && teachSkill.category !== category) {
            skillMatches = false;
          }
          
          // Filter by skill level
          if (skillLevel && teachSkill.level !== skillLevel) {
            skillMatches = false;
          }
          
          // Filter by experience range
          const experience = teachSkill.yearsOfExperience || 0;
          if (experience < parseInt(minExperience) || experience > parseInt(maxExperience)) {
            skillMatches = false;
          }
          
          if (skillMatches) {
            skillsMatch = true;
            break;
          }
        }
      }

      if (!skillsMatch) continue;

      const matchScore = calculateMatchScore(currentUser, user);
      
      // Apply score filter
      if (matchScore.totalScore >= minScore && matchScore.totalScore <= maxScore) {
        matches.push({
          user: {
            id: user._id,
            name: user.name,
            avatar: user.avatar,
            bio: user.bio,
            location: user.location,
            averageRating: user.averageRating,
            totalRatings: user.totalRatings,
            profileViews: user.profileViews,
            lastActiveAt: user.lastActiveAt,
            skillsToTeach: user.skillsToTeach,
            skillsToLearn: user.skillsToLearn,
            languages: user.languages,
            availability: user.availability,
          },
          matchScore: matchScore.totalScore,
          matchDetails: {
            canTeachYou: matchScore.canTeachYou,
            canLearnFromYou: matchScore.canLearnFromYou,
            locationMatch: matchScore.locationMatch,
            ratingBonus: matchScore.ratingBonus,
            activityBonus: matchScore.activityBonus,
            breakdown: matchScore.breakdown,
          },
        });
      }
    }

    // Apply sorting
    matches.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'rating':
          aValue = a.user.averageRating || 0;
          bValue = b.user.averageRating || 0;
          break;
        case 'activity':
          aValue = new Date(a.user.lastActiveAt || 0);
          bValue = new Date(b.user.lastActiveAt || 0);
          break;
        case 'name':
          aValue = a.user.name.toLowerCase();
          bValue = b.user.name.toLowerCase();
          break;
        case 'views':
          aValue = a.user.profileViews || 0;
          bValue = b.user.profileViews || 0;
          break;
        default: // score
          aValue = a.matchScore;
          bValue = b.matchScore;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedMatches = matches.slice(startIndex, endIndex);

    // Calculate advanced statistics
    const stats = {
      totalMatches: matches.length,
      averageScore: matches.length > 0 
        ? matches.reduce((sum, match) => sum + match.matchScore, 0) / matches.length 
        : 0,
      topSkillCategories: getTopSkillCategories(matches),
      locationBreakdown: getLocationBreakdown(matches),
      ratingDistribution: getRatingDistribution(matches),
      activityBreakdown: getActivityBreakdown(matches),
      scoreDistribution: getScoreDistribution(matches),
    };

    res.status(200).json({
      success: true,
      data: {
        matches: paginatedMatches,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(matches.length / limit),
          hasNext: endIndex < matches.length,
          hasPrev: startIndex > 0,
          count: paginatedMatches.length,
          totalCount: matches.length,
        },
        stats,
        userProfile: {
          skillsToTeach: currentUser.skillsToTeach.length,
          skillsToLearn: currentUser.skillsToLearn.length,
          location: currentUser.location,
          averageRating: currentUser.averageRating,
          languages: currentUser.languages,
        },
        appliedFilters: {
          skill,
          category,
          location,
          minRating,
          maxRating,
          skillLevel,
          minExperience,
          maxExperience,
          activityStatus,
          availabilityStatus,
          languages,
          sortBy,
          sortOrder,
          searchQuery,
        }
      },
    });

  } catch (err) {
    console.error("Get profile matches error:", err);
    return next(new createError("Server error", 500));
  }
};

// View user profile and increment profile views
exports.viewUserProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    if (!userId) {
      return next(new createError("User ID is required", 400));
    }

    // Find the user profile
    const user = await User.findById(userId)
      .populate('ratings.ratedBy', 'name avatar')
      .select('-password -email -phoneNumber -verificationToken -resetPasswordToken');

    if (!user) {
      return next(new createError("User not found", 404));
    }

    if (!user.isActive) {
      return next(new createError("User profile is not active", 404));
    }

    // Increment profile views only if not viewing own profile
    if (userId !== currentUserId.toString()) {
      user.profileViews += 1;
      
      // Update last active time for the viewer
      await User.findByIdAndUpdate(currentUserId, {
        lastActiveAt: Date.now(),
      });
      
      await user.save();
    }

    // Calculate profile completion
    const profileCompletion = user.calculateProfileCompletion();

    // Get mutual connections (users who have skills that match)
    const mutualConnections = await findMutualConnections(currentUserId, userId);

    // Calculate compatibility score if not viewing own profile
    let compatibilityScore = null;
    if (userId !== currentUserId.toString()) {
      const currentUser = await User.findById(currentUserId);
      const compatibility = calculateMatchScore(currentUser, user);
      compatibilityScore = compatibility.totalScore;
    }

    res.status(200).json({
      success: true,
      data: {
        user,
        profileCompletion,
        compatibilityScore,
        mutualConnections,
        isOwnProfile: userId === currentUserId.toString(),
        viewedAt: new Date(),
      },
    });

  } catch (err) {
    console.error("View user profile error:", err);
    return next(new createError("Server error", 500));
  }
};

// Get advanced filter options
exports.getFilterOptions = async (req, res, next) => {
  try {
    // Get all available categories
    const categories = [
      'Technology',
      'Design',
      'Business',
      'Language',
      'Music',
      'Arts & Crafts',
      'Sports & Fitness',
      'Cooking',
      'Photography',
      'Writing',
      'Marketing',
      'Science',
      'Health & Wellness',
      'Other'
    ];

    // Get available languages from users
    const languagesResult = await User.distinct('languages.language', {
      isActive: true,
      isVerified: true,
    });

    // Get location suggestions
    const locations = await User.aggregate([
      {
        $match: {
          isActive: true,
          isVerified: true,
          $or: [
            { 'location.city': { $exists: true, $ne: null, $ne: '' } },
            { 'location.country': { $exists: true, $ne: null, $ne: '' } }
          ]
        }
      },
      {
        $group: {
          _id: null,
          cities: { $addToSet: '$location.city' },
          countries: { $addToSet: '$location.country' }
        }
      }
    ]);

    const filterOptions = {
      categories,
      skillLevels: ['beginner', 'intermediate', 'advanced', 'expert'],
      languages: languagesResult.filter(lang => lang && lang.trim() !== ''),
      locations: locations[0] || { cities: [], countries: [] },
      sortOptions: [
        { value: 'score', label: 'Match Score' },
        { value: 'rating', label: 'User Rating' },
        { value: 'activity', label: 'Last Activity' },
        { value: 'name', label: 'Name' },
        { value: 'views', label: 'Profile Views' },
      ],
      activityOptions: [
        { value: 'any', label: 'Any Time' },
        { value: 'active', label: 'Active Today' },
        { value: 'recent', label: 'Active This Week' },
      ],
    };

    res.status(200).json({
      success: true,
      data: filterOptions,
    });

  } catch (err) {
    console.error("Get filter options error:", err);
    return next(new createError("Server error", 500));
  }
};

// Helper function to find mutual connections
const findMutualConnections = async (currentUserId, targetUserId) => {
  try {
    // This is a simplified version - you might want to implement a proper connections system
    const currentUser = await User.findById(currentUserId).select('skillsToTeach skillsToLearn');
    const targetUser = await User.findById(targetUserId).select('skillsToTeach skillsToLearn');
    
    const mutualSkills = [];
    
    // Find skills both users can teach
    currentUser.skillsToTeach.forEach(currentSkill => {
      targetUser.skillsToTeach.forEach(targetSkill => {
        if (currentSkill.name.toLowerCase() === targetSkill.name.toLowerCase()) {
          mutualSkills.push({
            skill: currentSkill.name,
            type: 'both_teach',
            category: currentSkill.category
          });
        }
      });
    });
    
    return mutualSkills.slice(0, 5); // Return top 5 mutual skills
  } catch (error) {
    console.error("Error finding mutual connections:", error);
    return [];
  }
};

// Calculate match score between current user and potential match (enhanced version)
const calculateMatchScore = (currentUser, potentialMatch) => {
  let score = 0;
  const breakdown = {
    skillMatches: [],
    bonuses: []
  };

  // 1. Skills the potential match can teach that current user wants to learn
  const canTeachYou = [];
  currentUser.skillsToLearn.forEach(wantedSkill => {
    potentialMatch.skillsToTeach.forEach(teachingSkill => {
      if (skillsMatch(wantedSkill, teachingSkill)) {
        const skillScore = calculateSkillScore(wantedSkill, teachingSkill);
        score += skillScore;
        canTeachYou.push({
          skill: teachingSkill.name,
          category: teachingSkill.category,
          teacherLevel: teachingSkill.level,
          learnerLevel: wantedSkill.level,
          priority: wantedSkill.priority,
          experience: teachingSkill.yearsOfExperience,
          score: skillScore
        });
        breakdown.skillMatches.push(`Can teach you ${teachingSkill.name} (+${skillScore})`);
      }
    });
  });

  // 2. Skills the current user can teach that potential match wants to learn
  const canLearnFromYou = [];
  currentUser.skillsToTeach.forEach(teachingSkill => {
    potentialMatch.skillsToLearn.forEach(wantedSkill => {
      if (skillsMatch(teachingSkill, wantedSkill)) {
        const skillScore = calculateSkillScore(wantedSkill, teachingSkill);
        score += skillScore;
        canLearnFromYou.push({
          skill: teachingSkill.name,
          category: teachingSkill.category,
          teacherLevel: teachingSkill.level,
          learnerLevel: wantedSkill.level,
          priority: wantedSkill.priority,
          experience: teachingSkill.yearsOfExperience,
          score: skillScore
        });
        breakdown.skillMatches.push(`Can learn ${teachingSkill.name} from you (+${skillScore})`);
      }
    });
  });

  // 3. Location bonus (enhanced)
  let locationMatch = false;
  if (currentUser.location && potentialMatch.location) {
    if (currentUser.location.city && potentialMatch.location.city &&
        currentUser.location.city.toLowerCase() === potentialMatch.location.city.toLowerCase()) {
      score += 5;
      locationMatch = true;
      breakdown.bonuses.push("Same city (+5)");
    } else if (currentUser.location.state && potentialMatch.location.state &&
               currentUser.location.state.toLowerCase() === potentialMatch.location.state.toLowerCase()) {
      score += 3;
      locationMatch = true;
      breakdown.bonuses.push("Same state (+3)");
    } else if (currentUser.location.country && potentialMatch.location.country &&
               currentUser.location.country.toLowerCase() === potentialMatch.location.country.toLowerCase()) {
      score += 2;
      locationMatch = true;
      breakdown.bonuses.push("Same country (+2)");
    }
  }

  // 4. Rating bonus (enhanced)
  let ratingBonus = 0;
  if (potentialMatch.averageRating >= 4.5) {
    ratingBonus = 3;
    score += 3;
    breakdown.bonuses.push("Excellent rating (+3)");
  } else if (potentialMatch.averageRating >= 4.0) {
    ratingBonus = 2;
    score += 2;
    breakdown.bonuses.push("Great rating (+2)");
  } else if (potentialMatch.averageRating >= 3.5) {
    ratingBonus = 1;
    score += 1;
    breakdown.bonuses.push("Good rating (+1)");
  }

  // 5. Activity bonus (enhanced)
  let activityBonus = 0;
  const daysSinceLastActive = potentialMatch.lastActiveAt 
    ? (Date.now() - new Date(potentialMatch.lastActiveAt)) / (1000 * 60 * 60 * 24)
    : 999;
  
  if (daysSinceLastActive <= 1) {
    activityBonus = 3;
    score += 3;
    breakdown.bonuses.push("Very active (+3)");
  } else if (daysSinceLastActive <= 3) {
    activityBonus = 2;
    score += 2;
    breakdown.bonuses.push("Recently active (+2)");
  } else if (daysSinceLastActive <= 7) {
    activityBonus = 1;
    score += 1;
    breakdown.bonuses.push("Active this week (+1)");
  }

  // 6. Mutual skill exchange bonus
  if (canTeachYou.length > 0 && canLearnFromYou.length > 0) {
    score += 5;
    breakdown.bonuses.push("Mutual skill exchange (+5)");
  }

  // 7. Language compatibility bonus
  if (currentUser.languages && potentialMatch.languages) {
    const commonLanguages = currentUser.languages.filter(lang1 =>
      potentialMatch.languages.some(lang2 => 
        lang1.language.toLowerCase() === lang2.language.toLowerCase()
      )
    );
    if (commonLanguages.length > 0) {
      score += commonLanguages.length * 1;
      breakdown.bonuses.push(`Common languages (+${commonLanguages.length})`);
    }
  }

  // 8. Availability bonus
  if (potentialMatch.availability?.isAvailable) {
    score += 2;
    breakdown.bonuses.push("Available for sessions (+2)");
  }

  return {
    totalScore: Math.round(score * 10) / 10,
    canTeachYou,
    canLearnFromYou,
    locationMatch,
    ratingBonus,
    activityBonus,
    breakdown
  };
};

// Check if two skills match (enhanced)
const skillsMatch = (skill1, skill2) => {
  // Exact name match
  if (skill1.name.toLowerCase() === skill2.name.toLowerCase()) {
    return true;
  }
  
  // Partial name match (contains)
  if (skill1.name.toLowerCase().includes(skill2.name.toLowerCase()) ||
      skill2.name.toLowerCase().includes(skill1.name.toLowerCase())) {
    return true;
  }
  
  // Category match for related skills
  if (skill1.category === skill2.category) {
    // Additional logic for category-based matching
    const relatedSkills = getRelatedSkills(skill1.category);
    if (relatedSkills.includes(skill1.name.toLowerCase()) && 
        relatedSkills.includes(skill2.name.toLowerCase())) {
      return true;
    }
  }
  
  return false;
};

// Get related skills for better matching
const getRelatedSkills = (category) => {
  const relatedSkillsMap = {
    'Technology': ['javascript', 'react', 'node.js', 'python', 'java', 'html', 'css', 'programming'],
    'Design': ['ui design', 'ux design', 'graphic design', 'web design', 'photoshop', 'figma'],
    'Language': ['english', 'spanish', 'french', 'german', 'chinese', 'japanese'],
    // Add more categories as needed
  };
  
  return relatedSkillsMap[category] || [];
};

// Calculate enhanced skill score
const calculateSkillScore = (wantedSkill, teachingSkill) => {
  let score = 10; // Base score
  
  // Exact name match bonus
  if (wantedSkill.name.toLowerCase() === teachingSkill.name.toLowerCase()) {
    score += 15;
  } else if (wantedSkill.name.toLowerCase().includes(teachingSkill.name.toLowerCase()) ||
             teachingSkill.name.toLowerCase().includes(wantedSkill.name.toLowerCase())) {
    score += 8;
  } else if (wantedSkill.category === teachingSkill.category) {
    score += 5;
  }
  
  // Priority bonus
  if (wantedSkill.priority === 'high') {
    score += 8;
  } else if (wantedSkill.priority === 'medium') {
    score += 4;
  }
  
  // Experience bonus
  const experienceYears = teachingSkill.yearsOfExperience || 0;
  if (experienceYears >= 10) {
    score += 8;
  } else if (experienceYears >= 5) {
    score += 6;
  } else if (experienceYears >= 2) {
    score += 4;
  } else if (experienceYears >= 1) {
    score += 2;
  }
  
  // Level compatibility
  const levelScores = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
  const teacherLevel = levelScores[teachingSkill.level] || 1;
  const learnerLevel = levelScores[wantedSkill.level] || 1;
  
  if (teacherLevel > learnerLevel) {
    score += (teacherLevel - learnerLevel) * 3;
  } else if (teacherLevel === learnerLevel && teacherLevel > 1) {
    score += 2; // Same intermediate+ level bonus
  }
  
  return score;
};

// Enhanced statistics functions
const getTopSkillCategories = (matches) => {
  const categoryCount = {};
  
  matches.forEach(match => {
    match.user.skillsToTeach.forEach(skill => {
      categoryCount[skill.category] = (categoryCount[skill.category] || 0) + 1;
    });
  });
  
  return Object.entries(categoryCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([category, count]) => ({ category, count }));
};

const getLocationBreakdown = (matches) => {
  const locationCount = {};
  
  matches.forEach(match => {
    const location = match.user.location;
    if (location?.city && location?.country) {
      const key = `${location.city}, ${location.country}`;
      locationCount[key] = (locationCount[key] || 0) + 1;
    } else if (location?.country) {
      locationCount[location.country] = (locationCount[location.country] || 0) + 1;
    }
  });
  
  return Object.entries(locationCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([location, count]) => ({ location, count }));
};

const getRatingDistribution = (matches) => {
  const distribution = { '4.5+': 0, '4.0-4.4': 0, '3.5-3.9': 0, '3.0-3.4': 0, 'Below 3.0': 0 };
  
  matches.forEach(match => {
    const rating = match.user.averageRating || 0;
    if (rating >= 4.5) distribution['4.5+']++;
    else if (rating >= 4.0) distribution['4.0-4.4']++;
    else if (rating >= 3.5) distribution['3.5-3.9']++;
    else if (rating >= 3.0) distribution['3.0-3.4']++;
    else distribution['Below 3.0']++;
  });
  
  return Object.entries(distribution).map(([range, count]) => ({ range, count }));
};

const getActivityBreakdown = (matches) => {
  const now = new Date();
  const breakdown = { 'Today': 0, 'This Week': 0, 'This Month': 0, 'Older': 0 };
  
  matches.forEach(match => {
    const lastActive = new Date(match.user.lastActiveAt || 0);
    const daysDiff = (now - lastActive) / (1000 * 60 * 60 * 24);
    
    if (daysDiff <= 1) breakdown['Today']++;
    else if (daysDiff <= 7) breakdown['This Week']++;
    else if (daysDiff <= 30) breakdown['This Month']++;
    else breakdown['Older']++;
  });
  
  return Object.entries(breakdown).map(([period, count]) => ({ period, count }));
};

const getScoreDistribution = (matches) => {
  const distribution = { '30+': 0, '20-29': 0, '10-19': 0, '0-9': 0 };
  
  matches.forEach(match => {
    const score = match.matchScore;
    if (score >= 30) distribution['30+']++;
    else if (score >= 20) distribution['20-29']++;
    else if (score >= 10) distribution['10-19']++;
    else distribution['0-9']++;
  });
  
  return Object.entries(distribution).map(([range, count]) => ({ range, count }));
};

// Export the calculateMatchScore function for testing
exports.calculateMatchScore = calculateMatchScore;