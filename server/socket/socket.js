const jwt = require("jsonwebtoken");
const Message = require("../models/Message");

const socketHandler = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("No token"));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.userId);

    socket.join(socket.userId);

    // 🔥 SEND MESSAGE
    socket.on("send_message", async ({ receiverId, message }) => {
      if (!receiverId || !message) return;

      const newMessage = await Message.create({
        senderId: socket.userId,
        receiverId,
        message,
      });

      // send to receiver
      io.to(receiverId).emit("receive_message", newMessage);

      // send back to sender
      socket.emit("receive_message", newMessage);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.userId);
    });
  });
};

module.exports = socketHandler;
