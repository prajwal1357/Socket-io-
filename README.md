# Socket.IO Chat Application

A real-time chat application built with Socket.IO, React, Express, and MongoDB that enables users to send and receive messages instantly.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [How Socket.IO Works](#how-socketio-works)
- [How Different People Chat with Different People](#how-different-people-chat-with-different-people)
- [Project Structure](#project-structure)
- [Key Components](#key-components)
- [Message Flow](#message-flow)
- [Setup Instructions](#setup-instructions)

---

## Overview

This application provides a real-time messaging platform where authenticated users can:
- Search for other users by username
- Send and receive messages in real-time
- View chat history with any user
- Maintain separate conversations with multiple users

---

## Architecture

The application follows a **client-server architecture** with:

- **Frontend (Client)**: React application running on `http://localhost:5173`
- **Backend (Server)**: Express server with Socket.IO on `http://localhost:5000`
- **Database**: MongoDB for storing users and message history
- **Authentication**: JWT-based authentication for secure connections

---

## How Socket.IO Works

### 1. **Connection Establishment**

#### Server-Side (`server/socket/socket.js`)
```javascript
// Socket.IO server is initialized in server.js
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});
```

#### Client-Side (`client/src/socket/socket.js`)
```javascript
// Client connects to the server
export const socket = io("http://localhost:5000", {
  autoConnect: false,
  auth: {
    token: getToken(), // JWT token for authentication
  },
});
```

### 2. **Authentication Middleware**

Before a socket connection is established, the server validates the user's JWT token:

```javascript
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("No token"));
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId; // Attach userId to socket
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});
```

**Key Points:**
- Every socket connection requires a valid JWT token
- The `userId` is extracted from the token and attached to the socket object
- This ensures only authenticated users can establish connections

### 3. **Socket Rooms**

When a user connects, they automatically join a room named after their `userId`:

```javascript
io.on("connection", (socket) => {
  socket.join(socket.userId); // User joins their own room
});
```

**Why Rooms?**
- Rooms allow targeted message delivery
- Each user has a unique room (their `userId`)
- Messages can be sent directly to a specific user's room

### 4. **Real-Time Message Events**

#### Sending Messages
- **Event Name**: `send_message`
- **Client emits**: `socket.emit("send_message", { receiverId, message })`
- **Server listens**: `socket.on("send_message", async ({ receiverId, message }) => {...})`

#### Receiving Messages
- **Event Name**: `receive_message`
- **Server emits**: `io.to(receiverId).emit("receive_message", newMessage)`
- **Client listens**: `socket.on("receive_message", (msg) => {...})`

### 5. **Bidirectional Communication**

Socket.IO enables **full-duplex communication**:
- Client can send messages to the server
- Server can push messages to clients instantly
- No need for polling or constant HTTP requests
- Messages are delivered in real-time using WebSocket protocol

---

## How Different People Chat with Different People

### 1. **User Identification**

Each user is uniquely identified by:
- **User ID (`_id`)**: MongoDB ObjectId stored in the database
- **Socket Room**: Each user joins a room named after their `userId`
- **JWT Token**: Contains the `userId` for authentication

### 2. **Message Routing System**

When User A sends a message to User B:

```javascript
socket.on("send_message", async ({ receiverId, message }) => {
  // 1. Create message in database
  const newMessage = await Message.create({
    senderId: socket.userId,    // User A's ID
    receiverId,                  // User B's ID
    message,
  });

  // 2. Send to receiver (User B) via their room
  io.to(receiverId).emit("receive_message", newMessage);

  // 3. Send back to sender (User A) for confirmation
  socket.emit("receive_message", newMessage);
});
```

**How it works:**
1. **Message Storage**: Message is saved to MongoDB with `senderId` and `receiverId`
2. **Targeted Delivery**: Server uses `io.to(receiverId)` to send message only to User B's room
3. **Sender Confirmation**: Server also sends the message back to User A's socket

### 3. **Multiple Concurrent Conversations**

A single user can have multiple active conversations simultaneously:

#### On the Client Side (`client/src/pages/Chat.jsx`):

```javascript
// User searches and selects different users
const openChat = async (u) => {
  setSelectedUser(u);  // Set the current conversation partner
  const res = await api.get(`/messages/${u._id}`);  // Load chat history
  setMessages(res.data);
};

// Messages are filtered based on selected user
socket.on("receive_message", (msg) => {
  // Only add message if it belongs to the current open chat
  if (msg.senderId === selectedUser?._id || msg.receiverId === selectedUser?._id) {
    setMessages((prev) => [...prev, msg]);
  }
});
```

**Key Features:**
- Each user can search and select different conversation partners
- Chat history is loaded per conversation
- Real-time messages are filtered to show only relevant messages
- Multiple users can chat with the same person independently

### 4. **Message Persistence**

Messages are stored in MongoDB with the following structure:

```javascript
{
  senderId: ObjectId,      // Who sent the message
  receiverId: ObjectId,    // Who should receive it
  message: String,         // Message content
  status: String,          // "sent", "delivered", "seen"
  createdAt: Date,         // Timestamp
  updatedAt: Date
}
```

**Retrieving Chat History:**
```javascript
// GET /api/messages/:receiverId
// Returns all messages between current user and receiverId
const messages = await Message.find({
  $or: [
    { senderId: req.userId, receiverId },
    { senderId: receiverId, receiverId: req.userId },
  ],
}).sort({ createdAt: 1 });
```

### 5. **Example Scenario**

**Scenario**: Alice (userId: `user123`) wants to chat with Bob (userId: `user456`) and Charlie (userId: `user789`)

1. **Alice connects:**
   - Socket connects with JWT token containing `user123`
   - Alice joins room `user123`

2. **Alice opens chat with Bob:**
   - Frontend calls `GET /api/messages/user456` to load history
   - Alice's UI shows conversation with Bob

3. **Alice sends message to Bob:**
   - Client emits: `socket.emit("send_message", { receiverId: "user456", message: "Hi Bob!" })`
   - Server saves message to DB (senderId: `user123`, receiverId: `user456`)
   - Server sends to Bob: `io.to("user456").emit("receive_message", message)`
   - Server sends to Alice: `socket.emit("receive_message", message)`

4. **Alice opens chat with Charlie:**
   - Frontend calls `GET /api/messages/user789` to load history
   - Alice's UI switches to show conversation with Charlie
   - Messages from Bob are filtered out (only Charlie's messages shown)

5. **Bob receives Alice's message:**
   - If Bob has chat open with Alice, message appears instantly
   - If Bob is chatting with someone else, message is received but not displayed until he opens Alice's chat

---

## Project Structure

```
socketio/
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Chat.jsx    # Main chat interface
│   │   │   ├── Login.jsx
│   │   │   └── Signup.jsx
│   │   ├── socket/
│   │   │   └── socket.js   # Socket.IO client configuration
│   │   └── ...
│   └── package.json
│
├── server/                 # Express backend
│   ├── socket/
│   │   └── socket.js       # Socket.IO server handlers
│   ├── models/
│   │   ├── User.js         # User schema
│   │   └── Message.js      # Message schema
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── user.routes.js  # User search endpoint
│   │   └── message.routes.js # Chat history endpoint
│   ├── server.js           # Express + Socket.IO server
│   └── package.json
│
└── README.md
```

---

## Key Components

### Server Components

1. **`server/server.js`**
   - Initializes Express app and HTTP server
   - Sets up Socket.IO with CORS configuration
   - Connects to MongoDB
   - Registers socket handler

2. **`server/socket/socket.js`**
   - Handles socket authentication
   - Manages user connections and rooms
   - Processes `send_message` events
   - Emits `receive_message` events

3. **`server/models/Message.js`**
   - Defines message schema with senderId, receiverId, message, status
   - Stores message history in MongoDB

### Client Components

1. **`client/src/socket/socket.js`**
   - Configures Socket.IO client connection
   - Sets up authentication token
   - Exports socket instance for use across the app

2. **`client/src/pages/Chat.jsx`**
   - Main chat interface
   - Handles user search and selection
   - Manages message state and real-time updates
   - Filters messages based on selected conversation

---

## Message Flow

### Complete Message Flow Diagram

```
┌─────────┐                    ┌─────────┐                    ┌─────────┐
│ User A  │                    │ Server  │                    │ User B  │
│(Client) │                    │(Socket) │                    │(Client) │
└────┬────┘                    └────┬────┘                    └────┬────┘
     │                               │                               │
     │ 1. Connect with JWT token     │                               │
     ├──────────────────────────────>│                               │
     │                               │                               │
     │ 2. Join room (userId)         │                               │
     ├──────────────────────────────>│                               │
     │                               │                               │
     │ 3. Select User B              │                               │
     │    GET /api/messages/userB    │                               │
     ├──────────────────────────────>│                               │
     │                               │ 4. Query MongoDB              │
     │                               ├───────────────────────────────┐
     │                               │<───────────────────────────────┘
     │ 5. Return chat history        │                               │
     │<──────────────────────────────┤                               │
     │                               │                               │
     │ 6. Send message               │                               │
     │    emit("send_message")       │                               │
     ├──────────────────────────────>│                               │
     │                               │                               │
     │                               │ 7. Save to MongoDB            │
     │                               ├───────────────────────────────┐
     │                               │<───────────────────────────────┘
     │                               │                               │
     │ 8. Receive confirmation       │                               │
     │<──────────────────────────────┤                               │
     │                               │                               │
     │                               │ 9. Send to User B's room      │
     │                               ├──────────────────────────────>│
     │                               │    emit("receive_message")    │
     │                               │                               │
     │                               │                               │ 10. Display message
     │                               │                               │
```

### Step-by-Step Flow

1. **Connection**: User A connects with JWT token
2. **Authentication**: Server validates token and extracts `userId`
3. **Room Join**: User A joins room named after their `userId`
4. **Chat Selection**: User A selects User B, frontend loads chat history via REST API
5. **Message Send**: User A types message and clicks send
6. **Server Processing**: 
   - Server receives `send_message` event
   - Saves message to MongoDB
   - Emits to User B's room (`io.to(receiverId)`)
   - Emits back to User A's socket
7. **Real-Time Delivery**: User B receives message instantly if connected
8. **Message Display**: Both users see the message in their respective chat windows

---

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Server Setup

1. Navigate to server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
```

4. Start the server:
```bash
npm run dev
```

### Client Setup

1. Navigate to client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

### Access the Application

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`
- Socket.IO Server: `http://localhost:5000`

---

## Key Features

✅ **Real-Time Messaging**: Instant message delivery using Socket.IO WebSockets  
✅ **User Authentication**: JWT-based secure authentication  
✅ **User Search**: Find and connect with other users  
✅ **Chat History**: Persistent message storage in MongoDB  
✅ **Multiple Conversations**: Chat with multiple users simultaneously  
✅ **Targeted Delivery**: Messages routed to specific users via Socket.IO rooms  
✅ **Auto-Scroll**: Chat automatically scrolls to newest messages  

---

## Technologies Used

- **Frontend**: React, Vite, TailwindCSS, Socket.IO Client
- **Backend**: Node.js, Express, Socket.IO Server
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)

---

## Notes

- Socket connections require valid JWT tokens
- Each user joins a room named after their `userId`
- Messages are delivered using Socket.IO rooms for targeted routing
- Chat history is loaded via REST API when opening a conversation
- Real-time messages are filtered on the client side based on selected user
- Multiple users can have independent conversations with the same person
