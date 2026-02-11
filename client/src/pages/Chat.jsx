import { useEffect } from "react";
import { socket } from "../socket/socket";
import { getToken } from "../utils/auth";
import { useNavigate } from "react-router-dom";

export default function Chat() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!getToken()) {
      navigate("/login");
      return;
    }

    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
      <h1>Socket Connected 🚀</h1>
    </div>
  );
}
