const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("../models/userModel");

dotenv.config();

const skillCategories = [
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

const skillNames = {
  Technology: ['JavaScript', 'Python', 'React', 'Node.js', 'Machine Learning', 'AWS', 'Docker', 'TypeScript'],
  Design: ['UI/UX Design', 'Graphic Design', 'Figma', 'Adobe Photoshop', 'Illustration', '3D Modeling'],
  Business: ['Project Management', 'Business Strategy', 'Marketing', 'Sales', 'Finance', 'Entrepreneurship'],
  Language: ['English', 'Spanish', 'French', 'German', 'Mandarin', 'Japanese'],
  Music: ['Guitar', 'Piano', 'Singing', 'Music Production', 'Drums', 'Violin'],
  'Arts & Crafts': ['Painting', 'Drawing', 'Pottery', 'Knitting', 'Woodworking', 'Jewelry Making'],
  'Sports & Fitness': ['Yoga', 'Personal Training', 'Tennis', 'Swimming', 'Basketball', 'Running'],
  Cooking: ['Italian Cuisine', 'Baking', 'Vegan Cooking', 'Sushi Making', 'BBQ', 'Pastry'],
  Photography: ['Portrait Photography', 'Landscape', 'Photo Editing', 'Studio Lighting', 'Wedding Photography'],
  Writing: ['Creative Writing', 'Copywriting', 'Technical Writing', 'Blogging', 'Poetry', 'Journalism'],
  Marketing: ['Social Media Marketing', 'SEO', 'Content Marketing', 'Email Marketing', 'Google Ads'],
  Science: ['Physics', 'Chemistry', 'Biology', 'Data Science', 'Research Methods', 'Statistics'],
  'Health & Wellness': ['Nutrition', 'Meditation', 'Mental Health', 'Massage Therapy', 'Herbalism'],
  Other: ['Public Speaking', 'Time Management', 'Leadership', 'Negotiation', 'Critical Thinking']
};

const levels = ['beginner', 'intermediate', 'advanced', 'expert'];

const cities = [
  { city: 'New York', state: 'NY', country: 'USA' },
  { city: 'Los Angeles', state: 'CA', country: 'USA' },
  { city: 'Chicago', state: 'IL', country: 'USA' },
  { city: 'Houston', state: 'TX', country: 'USA' },
  { city: 'Phoenix', state: 'AZ', country: 'USA' },
  { city: 'Philadelphia', state: 'PA', country: 'USA' },
  { city: 'San Antonio', state: 'TX', country: 'USA' },
  { city: 'San Diego', state: 'CA', country: 'USA' },
  { city: 'Dallas', state: 'TX', country: 'USA' },
  { city: 'San Jose', state: 'CA', country: 'USA' }
];

const occupations = [
  'Software Engineer',
  'Designer',
  'Teacher',
  'Marketing Manager',
  'Data Scientist',
  'Product Manager',
  'Consultant',
  'Freelancer',
  'Student',
  'Entrepreneur',
  'Artist',
  'Writer',
  'Photographer',
  'Chef',
  'Musician'
];

const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const generateSkills = (count, type) => {
  const skills = [];
  const usedCategories = new Set();

  for (let i = 0; i < count; i++) {
    let category;
    do {
      category = getRandomElement(skillCategories);
    } while (usedCategories.has(category) && usedCategories.size < skillCategories.length);

    usedCategories.add(category);
    const skillsInCategory = skillNames[category];
    const skill = {
      name: getRandomElement(skillsInCategory),
      category: category,
      level: type === 'teach' ? getRandomElement(levels.slice(1)) : getRandomElement(levels.slice(0, 3)),
      description: `${type === 'teach' ? 'Teaching' : 'Learning'} ${getRandomElement(skillsInCategory)} with passion`,
      yearsOfExperience: type === 'teach' ? getRandomNumber(1, 10) : 0
    };

    if (type === 'learn') {
      skill.priority = getRandomElement(['low', 'medium', 'high']);
    }

    skills.push(skill);
  }

  return skills;
};

const seedUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Check if users already exist
    const userCount = await User.countDocuments();

    if (userCount > 5) {
      console.log(`Already have ${userCount} users in the database`);
      const deleteConfirm = process.argv[2] === '--force';

      if (!deleteConfirm) {
        console.log("Use 'npm run seed:users -- --force' to delete existing users and reseed");
        process.exit(0);
      }

      console.log("Deleting existing users...");
      await User.deleteMany({});
    }

    const users = [];

    for (let i = 1; i <= 50; i++) {
      const location = getRandomElement(cities);
      const isVerified = Math.random() > 0.3;
      const isActive = Math.random() > 0.2;

      const user = {
        name: `User ${i}`,
        email: `user${i}@example.com`,
        password: "password123",
        isVerified,
        isActive,
        bio: `I'm passionate about learning and teaching. Looking to exchange skills and knowledge with like-minded individuals.`,
        phoneNumber: `+1${getRandomNumber(1000000000, 9999999999)}`,
        location,
        occupation: getRandomElement(occupations),
        skillsToTeach: generateSkills(getRandomNumber(1, 4), 'teach'),
        skillsToLearn: generateSkills(getRandomNumber(1, 3), 'learn'),
        availability: {
          timezone: 'UTC',
          isAvailable: true,
          preferredDays: ['monday', 'wednesday', 'friday'],
          preferredTimes: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '17:00' }]
        },
        languages: [
          { language: 'English', proficiency: 'native' },
          { language: getRandomElement(['Spanish', 'French', 'German', 'Mandarin']), proficiency: 'intermediate' }
        ],
        preferences: {
          emailNotifications: true,
          profileVisibility: 'public',
          allowDirectMessages: true
        },
        skillsShared: getRandomNumber(0, 20),
        skillsLearned: getRandomNumber(0, 15),
        profileViews: getRandomNumber(0, 100),
        averageRating: Number((Math.random() * 2 + 3).toFixed(1)),
        totalRatings: getRandomNumber(0, 25)
      };

      // Calculate profile completion
      user.isProfileComplete = true;

      users.push(user);
    }

    console.log("Creating 50 sample users...");
    const createdUsers = await User.create(users);

    console.log(`Successfully created ${createdUsers.length} users!`);
    console.log("\nSample users created with:");
    console.log("- Email: user1@example.com to user50@example.com");
    console.log("- Password: password123 (for all users)");
    console.log("- Random skills, locations, and profiles");

    // Show some statistics
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          verifiedUsers: { $sum: { $cond: ["$isVerified", 1, 0] } },
          activeUsers: { $sum: { $cond: ["$isActive", 1, 0] } }
        }
      }
    ]);

    console.log("\nDatabase Statistics:");
    console.log(`- Total Users: ${stats[0].totalUsers}`);
    console.log(`- Verified Users: ${stats[0].verifiedUsers}`);
    console.log(`- Active Users: ${stats[0].activeUsers}`);

    process.exit(0);
  } catch (error) {
    console.error("Error seeding users:", error);
    process.exit(1);
  }
};

seedUsers();