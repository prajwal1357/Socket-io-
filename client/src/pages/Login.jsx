import { useState } from "react";
import api from "../api/axios";
import { setAuth } from "../utils/auth";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    const res = await api.post("/auth/login", {
      identifier,
      password,
    });

    // 🔑 JWT stored HERE
    setAuth(res.data.token, res.data.user);

    navigate("/chat");
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
      <form
        onSubmit={handleLogin}
        className="bg-gray-800 p-6 rounded w-80 space-y-4"
      >
        <h2 className="text-white text-xl text-center">Login</h2>

        <input
          className="w-full p-2 rounded"
          placeholder="Email or Username"
          onChange={(e) => setIdentifier(e.target.value)}
        />

        <input
          type="password"
          className="w-full p-2 rounded"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="w-full bg-green-600 text-white py-2 rounded">
          Login
        </button>
      </form>
    </div>
  );
}
