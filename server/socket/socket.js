const jwt = require("jsonwebtoken");

const socketHandler = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Authentication error"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.userId);

    // 🔑 Join personal room
    socket.join(socket.userId);

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.userId);
    });
  });
};

module.exports = socketHandler;
