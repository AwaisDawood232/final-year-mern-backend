const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const keys = require("../config/keys");

// Skill Schema for embedding in User
const SkillSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    enum: [
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
    ],
  },
  level: {
    type: String,
    required: true,
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters'],
  },
  yearsOfExperience: {
    type: Number,
    min: 0,
    max: 50,
  },
  certifications: [{
    name: String,
    issuedBy: String,
    dateIssued: Date,
    url: String,
  }],
  portfolioLinks: [{
    title: String,
    url: String,
    description: String,
  }],
}, { _id: true });

// Social Links Schema
const SocialLinksSchema = new mongoose.Schema({
  linkedin: String,
  github: String,
  twitter: String,
  portfolio: String,
  other: [{
    platform: String,
    url: String,
  }],
}, { _id: false });

// Availability Schema
const AvailabilitySchema = new mongoose.Schema({
  timezone: {
    type: String,
    default: 'UTC',
  },
  preferredDays: [{
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
  }],
  preferredTimes: [{
    start: String, // Format: "HH:MM"
    end: String,   // Format: "HH:MM"
  }],
  isAvailable: {
    type: Boolean,
    default: true,
  },
}, { _id: false });

// Rating Schema
const RatingSchema = new mongoose.Schema({
  ratedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  review: {
    type: String,
    maxlength: [500, 'Review cannot be more than 500 characters'],
  },
  skillTaught: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: true });

const UserSchema = new mongoose.Schema({
  // Existing Authentication Fields
  name: {
    type: String,
    required: [true, "Please provide a name"],
    trim: true,
    maxlength: [50, "Name cannot be more than 50 characters"],
  },
  email: {
    type: String,
    required: [true, "Please provide an email"],
    unique: true,
    match: [
      /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/,
      "Please provide a valid email",
    ],
  },
  password: {
    type: String,
    required: [true, "Please add a password"],
    minlength: [6, "Password must be at least 6 characters"],
    select: false,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationToken: String,
  verificationTokenExpire: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  avatar: {
    type: String,
  },

  // Extended Profile Fields
  bio: {
    type: String,
    maxlength: [1000, 'Bio cannot be more than 1000 characters'],
  },
  
  // Personal Information
  phoneNumber: {
    type: String,
    match: [/^\+?[\d\s-()]+$/, 'Please provide a valid phone number'],
  },
  dateOfBirth: {
    type: Date,
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer-not-to-say'],
  },
  
  // Location
  location: {
    city: String,
    state: String,
    country: String,
    coordinates: {
      latitude: Number,
      longitude: Number,
    },
  },
  
  // Professional Information
  occupation: String,
  education: [{
    institution: String,
    degree: String,
    fieldOfStudy: String,
    startYear: Number,
    endYear: Number,
    current: Boolean,
  }],
  
  // Languages
  languages: [{
    language: String,
    proficiency: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'native'],
    },
  }],
  
  // Skills
  skillsToTeach: [SkillSchema],
  skillsToLearn: [{
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
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
      ],
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    description: String,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
  }],
  
  // Availability
  availability: AvailabilitySchema,
  
  // Social Links
  socialLinks: SocialLinksSchema,
  
  // Ratings and Reviews
  ratings: [RatingSchema],
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  totalRatings: {
    type: Number,
    default: 0,
  },
  
  // Profile Status
  isProfileComplete: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastActiveAt: {
    type: Date,
    default: Date.now,
  },
  
  // Profile Views
  profileViews: {
    type: Number,
    default: 0,
  },
  
  // Skill Exchange Statistics
  skillsShared: {
    type: Number,
    default: 0,
  },
  skillsLearned: {
    type: Number,
    default: 0,
  },
  
  // Preferences
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true,
    },
    profileVisibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'public',
    },
    allowDirectMessages: {
      type: Boolean,
      default: true,
    },
  },
  
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for better performance
UserSchema.index({ 'skillsToTeach.name': 'text', 'skillsToLearn.name': 'text' });
UserSchema.index({ 'location.city': 1, 'location.country': 1 });
UserSchema.index({ averageRating: -1 });
UserSchema.index({ isActive: 1, isVerified: 1 });

// Update the updatedAt field before saving
UserSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Encrypt password using bcrypt
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Calculate profile completion percentage
UserSchema.methods.calculateProfileCompletion = function() {
  let completionScore = 0;
  const totalFields = 10;
  
  if (this.name) completionScore++;
  if (this.bio) completionScore++;
  if (this.avatar) completionScore++;
  if (this.location && this.location.city) completionScore++;
  if (this.occupation) completionScore++;
  if (this.skillsToTeach && this.skillsToTeach.length > 0) completionScore++;
  if (this.skillsToLearn && this.skillsToLearn.length > 0) completionScore++;
  if (this.languages && this.languages.length > 0) completionScore++;
  if (this.availability && this.availability.timezone) completionScore++;
  if (this.phoneNumber) completionScore++;
  
  const percentage = (completionScore / totalFields) * 100;
  this.isProfileComplete = percentage >= 80;
  
  return percentage;
};

// Calculate average rating
UserSchema.methods.calculateAverageRating = function() {
  if (this.ratings.length === 0) {
    this.averageRating = 0;
    this.totalRatings = 0;
    return 0;
  }
  
  const sum = this.ratings.reduce((acc, rating) => acc + rating.rating, 0);
  this.averageRating = Number((sum / this.ratings.length).toFixed(1));
  this.totalRatings = this.ratings.length;
  
  return this.averageRating;
};

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash verification token
UserSchema.methods.getVerificationToken = function () {
  // Generate token
  const verificationToken = crypto.randomBytes(20).toString("hex");

  // Hash token and set to verificationToken field
  this.verificationToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  // Set expire
  this.verificationTokenExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

  return verificationToken;
};

// Generate and hash password reset token
UserSchema.methods.getResetPasswordToken = function () {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString("hex");

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Set expire
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

module.exports = mongoose.model("User", UserSchema);