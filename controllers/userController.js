const User = require("../models/userModel");
const createError = require("../utils/appError");

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('ratings.ratedBy', 'name avatar')
      .select('-password');

    if (!user) {
      return next(new createError("User not found", 404));
    }

    // Calculate profile completion
    const profileCompletion = user.calculateProfileCompletion();

    res.status(200).json({
      success: true,
      data: {
        user,
        profileCompletion,
      },
    });
  } catch (err) {
    console.error("Get profile error:", err);
    return next(new createError("Server error", 500));
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const {
      name,
      bio,
      phoneNumber,
      dateOfBirth,
      avatar,
      gender,
      location,
      occupation,
      education,
      languages,
      socialLinks,
      preferences,
    } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return next(new createError("User not found", 404));
    }

    // Update fields if provided
    if (name) user.name = name;
    if (avatar) user.avatar = avatar;
    if (bio !== undefined) user.bio = bio;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    if (dateOfBirth) user.dateOfBirth = dateOfBirth;
    if (gender) user.gender = gender;
    if (location) user.location = { ...user.location, ...location };
    if (occupation !== undefined) user.occupation = occupation;
    if (education) user.education = education;
    if (languages) user.languages = languages;
    if (socialLinks) user.socialLinks = { ...user.socialLinks, ...socialLinks };
    if (preferences) user.preferences = { ...user.preferences, ...preferences };

    // Calculate profile completion
    user.calculateProfileCompletion();

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: user,
    });
  } catch (err) {
    console.error("Update profile error:", err);
    return next(new createError("Server error", 500));
  }
};


exports.addSkillToTeach = async (req, res, next) => {
  try {
    const {
      name,
      category,
      level,
      description,
      yearsOfExperience,
      certifications,
      portfolioLinks,
    } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return next(new createError("User not found", 404));
    }

    // Check if skill already exists
    const existingSkill = user.skillsToTeach.find(
      skill => skill.name.toLowerCase() === name.toLowerCase()
    );

    if (existingSkill) {
      return next(new createError("Skill already exists in your teaching list", 400));
    }

    const newSkill = {
      name,
      category,
      level,
      description,
      yearsOfExperience,
      certifications: certifications || [],
      portfolioLinks: portfolioLinks || [],
    };

    user.skillsToTeach.push(newSkill);
    user.calculateProfileCompletion();
    await user.save();

    res.status(201).json({
      success: true,
      message: "Skill added to teaching list successfully",
      data: newSkill,
    });
  } catch (err) {
    console.error("Add skill to teach error:", err);
    return next(new createError("Server error", 500));
  }
};


exports.addSkillToLearn = async (req, res, next) => {
  try {
    const { name, category, level, description, priority } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return next(new createError("User not found", 404));
    }

    // Check if skill already exists
    const existingSkill = user.skillsToLearn.find(
      skill => skill.name.toLowerCase() === name.toLowerCase()
    );

    if (existingSkill) {
      return next(new createError("Skill already exists in your learning list", 400));
    }

    const newSkill = {
      name,
      category,
      level: level || 'beginner',
      description,
      priority: priority || 'medium',
    };

    user.skillsToLearn.push(newSkill);
    user.calculateProfileCompletion();
    await user.save();

    res.status(201).json({
      success: true,
      message: "Skill added to learning list successfully",
      data: newSkill,
    });
  } catch (err) {
    console.error("Add skill to learn error:", err);
    return next(new createError("Server error", 500));
  }
};


exports.updateSkillToTeach = async (req, res, next) => {
  try {
    const { skillId } = req.params;
    const updates = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return next(new createError("User not found", 404));
    }

    const skill = user.skillsToTeach.id(skillId);

    if (!skill) {
      return next(new createError("Skill not found", 404));
    }

    // Update skill fields
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        skill[key] = updates[key];
      }
    });

    await user.save();

    res.status(200).json({
      success: true,
      message: "Skill updated successfully",
      data: skill,
    });
  } catch (err) {
    console.error("Update skill to teach error:", err);
    return next(new createError("Server error", 500));
  }
};

exports.removeSkillToTeach = async (req, res, next) => {
  try {
    const { skillId } = req.params;

    const user = await User.findById(req.user.id);

    if (!user) {
      return next(new createError("User not found", 404));
    }

    const skillIndex = user.skillsToTeach.findIndex(
      skill => skill._id.toString() === skillId
    );

    if (skillIndex === -1) {
      return next(new createError("Skill not found", 404));
    }

    user.skillsToTeach.splice(skillIndex, 1);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Skill removed successfully",
    });
  } catch (err) {
    console.error("Remove skill to teach error:", err);
    return next(new createError("Server error", 500));
  }
};


exports.removeSkillToLearn = async (req, res, next) => {
  try {
    const { skillId } = req.params;

    const user = await User.findById(req.user.id);

    if (!user) {
      return next(new createError("User not found", 404));
    }

    const skillIndex = user.skillsToLearn.findIndex(
      skill => skill._id.toString() === skillId
    );

    if (skillIndex === -1) {
      return next(new createError("Skill not found", 404));
    }

    user.skillsToLearn.splice(skillIndex, 1);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Skill removed successfully",
    });
  } catch (err) {
    console.error("Remove skill to learn error:", err);
    return next(new createError("Server error", 500));
  }
};

exports.updateAvailability = async (req, res, next) => {
  try {
    const { timezone, preferredDays, preferredTimes, isAvailable } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return next(new createError("User not found", 404));
    }

    if (!user.availability) {
      user.availability = {};
    }

    if (timezone) user.availability.timezone = timezone;
    if (preferredDays) user.availability.preferredDays = preferredDays;
    if (preferredTimes) user.availability.preferredTimes = preferredTimes;
    if (isAvailable !== undefined) user.availability.isAvailable = isAvailable;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Availability updated successfully",
      data: user.availability,
    });
  } catch (err) {
    console.error("Update availability error:", err);
    return next(new createError("Server error", 500));
  }
};


exports.searchUsers = async (req, res, next) => {
  try {
    const {
      skill,
      category,
      level,
      location,
      rating,
      page = 1,
      limit = 10,
    } = req.query;

    let query = {
      isActive: true,
      isVerified: true,
      _id: { $ne: req.user.id }, // Exclude current user
    };

    // Search by skill name
    if (skill) {
      query.$or = [
        { 'skillsToTeach.name': { $regex: skill, $options: 'i' } },
      ];
    }

    // Filter by category
    if (category) {
      query['skillsToTeach.category'] = category;
    }

    // Filter by skill level
    if (level) {
      query['skillsToTeach.level'] = level;
    }

    // Filter by location
    if (location) {
      query.$or = [
        { 'location.city': { $regex: location, $options: 'i' } },
        { 'location.country': { $regex: location, $options: 'i' } },
      ];
    }

    // Filter by minimum rating
    if (rating) {
      query.averageRating = { $gte: parseFloat(rating) };
    }

    const skip = (page - 1) * limit;

    const users = await User.find(query)
      .select('name bio avatar location skillsToTeach averageRating totalRatings lastActiveAt')
      .sort({ averageRating: -1, totalRatings: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
        },
      },
    });
  } catch (err) {
    console.error("Search users error:", err);
    return next(new createError("Server error", 500));
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .populate('ratings.ratedBy', 'name avatar')
      .select('-password -email -phoneNumber');

    if (!user) {
      return next(new createError("User not found", 404));
    }

    if (!user.isActive) {
      return next(new createError("User profile is not active", 404));
    }

    // Increment profile views if not viewing own profile
    if (userId !== req.user.id.toString()) {
      user.profileViews += 1;
      await user.save();
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    console.error("Get user by ID error:", err);
    return next(new createError("Server error", 500));
  }
};

exports.addRating = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { rating, review, skillTaught } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return next(new createError("Rating must be between 1 and 5", 400));
    }

    const user = await User.findById(userId);

    if (!user) {
      return next(new createError("User not found", 404));
    }

    if (userId === req.user.id.toString()) {
      return next(new createError("You cannot rate yourself", 400));
    }

    // Check if user already rated this person
    const existingRating = user.ratings.find(
      r => r.ratedBy.toString() === req.user.id.toString()
    );

    if (existingRating) {
      return next(new createError("You have already rated this user", 400));
    }

    const newRating = {
      ratedBy: req.user.id,
      rating,
      review,
      skillTaught,
    };

    user.ratings.push(newRating);
    user.calculateAverageRating();

    await user.save();

    res.status(201).json({
      success: true,
      message: "Rating added successfully",
      data: newRating,
    });
  } catch (err) {
    console.error("Add rating error:", err);
    return next(new createError("Server error", 500));
  }
};

exports.getSkillCategories = async (req, res, next) => {
  try {
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

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (err) {
    console.error("Get categories error:", err);
    return next(new createError("Server error", 500));
  }
};

exports.updateActivity = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      lastActiveAt: Date.now(),
    });

    res.status(200).json({
      success: true,
      message: "Activity updated",
    });
  } catch (err) {
    console.error("Update activity error:", err);
    return next(new createError("Server error", 500));
  }
};

exports.getDashboard = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('ratings.ratedBy', 'name avatar')
      .select('-password');

    if (!user) {
      return next(new createError("User not found", 404));
    }

    const profileCompletion = user.calculateProfileCompletion();
    
    // Recent ratings (last 5)
    const recentRatings = user.ratings
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    const stats = {
      profileViews: user.profileViews,
      skillsShared: user.skillsShared,
      skillsLearned: user.skillsLearned,
      averageRating: user.averageRating,
      totalRatings: user.totalRatings,
      profileCompletion,
      totalSkillsToTeach: user.skillsToTeach.length,
      totalSkillsToLearn: user.skillsToLearn.length,
    };

    res.status(200).json({
      success: true,
      data: {
        user,
        stats,
        recentRatings,
      },
    });
  } catch (err) {
    console.error("Get dashboard error:", err);
    return next(new createError("Server error", 500));
  }
};