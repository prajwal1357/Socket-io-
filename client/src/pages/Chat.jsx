import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { socket } from "../socket/socket";
import { getUser, logout } from "../utils/auth";

export default function Chat() {
  const user = getUser();
  const navigate = useNavigate();
  const scrollRef = useRef(); // For auto-scrolling to bottom

  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  // Auto-scroll to the newest message
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      logout();
      socket.disconnect();
      navigate("/login");
    }
  };

  useEffect(() => {
    socket.connect();
    socket.on("receive_message", (msg) => {
      // Only add message if it belongs to the current open chat
      if (msg.senderId === selectedUser?._id || msg.receiverId === selectedUser?._id) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    return () => {
      socket.off("receive_message");
      socket.disconnect();
    };
  }, [selectedUser]);

  const searchUsers = async (q) => {
    setSearch(q);
    if (!q) return setUsers([]);
    try {
      const res = await api.get(`/users/search?q=${q}`);
      setUsers(res.data);
    } catch (err) {
      console.error("Search failed", err);
    }
  };

  const openChat = async (u) => {
    setSelectedUser(u);
    const res = await api.get(`/messages/${u._id}`);
    setMessages(res.data);
  };

  const sendMessage = (e) => {
    e?.preventDefault(); // Prevent page refresh
    if (!text.trim() || !selectedUser) return;

    socket.emit("send_message", {
      receiverId: selectedUser._id,
      message: text,
    });

    setText("");
  };

  return (
    <div className="h-screen flex bg-gray-950 text-gray-100 font-sans">
      {/* --- Sidebar --- */}
      <div className="w-80 bg-gray-900 flex flex-col border-r border-gray-800">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h1 className="font-bold text-xl tracking-tight">Messages</h1>
          <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-red-400 transition">Logout</button>
        </div>
        
        <div className="p-4">
          <input
            className="w-full bg-gray-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            placeholder="Search users..."
            value={search}
            onChange={(e) => searchUsers(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-2">
          {users.map((u) => (
            <div
              key={u._id}
              onClick={() => openChat(u)}
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition mb-1 ${
                selectedUser?._id === u._id ? "bg-blue-600" : "hover:bg-gray-800"
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center font-bold">
                {u.username[0].toUpperCase()}
              </div>
              <span className="font-medium">@{u.username}</span>
            </div>
          ))}
        </div>
      </div>

      {/* --- Main Chat Window --- */}
      <div className="flex-1 flex flex-col bg-gray-950">
        {selectedUser ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex items-center gap-3 bg-gray-950/50 backdrop-blur-md sticky top-0">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">
                {selectedUser.username[0].toUpperCase()}
              </div>
              <h2 className="font-semibold text-lg">@{selectedUser.username}</h2>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.senderId === user.id ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] px-4 py-2 rounded-2xl shadow-sm ${
                    m.senderId === user.id 
                      ? "bg-blue-600 text-white rounded-br-none" 
                      : "bg-gray-800 text-gray-100 rounded-bl-none"
                  }`}>
                    {m.message}
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={sendMessage} className="p-4 bg-gray-900 border-t border-gray-800">
              <div className="flex gap-3 max-w-4xl mx-auto">
                <input
                  className="flex-1 bg-gray-800 rounded-full px-6 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Write a message..."
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-full font-medium transition shadow-lg active:scale-95"
                >
                  Send
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
             <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mb-4">
               💬
             </div>
             <p className="text-lg">Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}