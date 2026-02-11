const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const auth = require("../middleware/auth.middleware");

// 📜 Get chat history
router.get("/:receiverId", auth, async (req, res) => {
  const { receiverId } = req.params;

  const messages = await Message.find({
    $or: [
      { senderId: req.userId, receiverId },
      { senderId: receiverId, receiverId: req.userId },
    ],
  }).sort({ createdAt: 1 });

  res.json(messages);
});

module.exports = router;
