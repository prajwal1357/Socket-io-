const express = require("express");
const router = express.Router();
const User = require("../models/User");
const auth = require("../middleware/auth.middleware");

// 🔍 Search users by username
router.get("/search", auth, async (req, res) => {
  const { q } = req.query;

  if (!q) return res.json([]);

  const users = await User.find({
    username: { $regex: q, $options: "i" },
    _id: { $ne: req.userId },
  }).select("_id username");

  res.json(users);
});

module.exports = router;
