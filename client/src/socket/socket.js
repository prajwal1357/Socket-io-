import { io } from "socket.io-client";
import { getToken } from "../utils/auth";

export const socket = io("http://localhost:5000", {
  autoConnect: false,
  auth: {
    token: getToken(),
  },
});
