const express = require("express");
const router = express.Router();
const { signup, login } = require("../controllers/auth.controller");

router.post("/signup", signup);
router.post("/login", login);

//-----------------------------------------------------
const auth = require("../middleware/auth.middleware");

// LOGOUT
router.post("/logout", auth, (req, res) => {
  // Nothing to delete on server
  res.json({ message: "Logout successful" });
});


module.exports = router;
