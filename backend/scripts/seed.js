const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Badge = require('../models/Badge');
const Season = require('../models/Season');

const seedDB = async () => {
  try {
    // 1. Connect to MongoDB Atlas
    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected! 🚀");

    // 2. Clear existing data (Starts fresh)
    console.log("Clearing old data...");
    await User.deleteMany({});
    await Badge.deleteMany({});
    await Season.deleteMany({});

    // 3. Create default badges
    const badges = [
      { icon: "⚡", name: "Speed Demon", desc: "Submit 5 tasks more than 24h early", rarity: "rare", condition: "tasks_speed_5" },
      { icon: "🔥", name: "On Fire", desc: "Maintain a 7-day task streak", rarity: "epic", condition: "streak_7" },
      { icon: "🏆", name: "Class Champion", desc: "Reach #1 on the leaderboard", rarity: "legendary", condition: "rank_1" },
      { icon: "📚", name: "Scholar", desc: "Complete 10 tasks with grade A", rarity: "rare", condition: "tasks_10_A" },
      { icon: "🎯", name: "Perfect Aim", desc: "Get full marks on 3 assessments", rarity: "epic", condition: "assess_3_100" },
      { icon: "👑", name: "Elite", desc: "Reach the Elite level", rarity: "legendary", condition: "level_elite" },
      { icon: "🌟", name: "First Star", desc: "Submit your very first task", rarity: "common", condition: "streak_1" },
      { icon: "💬", name: "Helper", desc: "Send 10 messages in class chat", rarity: "common", condition: "helper_10" },
      { icon: "🚀", name: "Rocket Start", desc: "First to submit in any task", rarity: "rare", condition: "first_submit" },
      { icon: "🎖️", name: "Attendance King", desc: "100% attendance for a month", rarity: "epic", condition: "attendance_100" },
      { icon: "🧙", name: "Code Wizard", desc: "Get grade A on 5 coding tasks", rarity: "epic", condition: "code_A_5" },
      { icon: "💎", name: "Diamond Coder", desc: "Complete the legendary bonus task", rarity: "legendary", condition: "bonus_done" }
    ];
    await Badge.insertMany(badges);
    console.log(`✅ ${badges.length} Badges created.`);

    // 4. Create default season
    await Season.create({
      number: 1,
      name: "Season I: Genesis",
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Ends in 30 days
      active: true,
      currentMilestone: 1,
      milestones: [
        { icon: "⭐", reward: "5 XP Boost", done: false, claimable: false },
        { icon: "🎨", reward: "Blue Frame", done: false, claimable: false },
        { icon: "🔥", reward: "Fire Badge", done: false, claimable: false },
        { icon: "👑", reward: "Gold Frame", done: false, claimable: false },
        { icon: "🏆", reward: "Legend Title", done: false, claimable: false }
      ]
    });
    console.log("✅ Default season initialized.");

    console.log("\n✨ Elite Class database seeded successfully!");
    process.exit();
  } catch (err) {
    console.error("❌ Error seeding database:", err);
    process.exit(1);
  }
};

seedDB();
