import axios from "axios";
import { getToken } from "./storageUtils";


const api = axios.create({
    baseURL: "http://10.135.170.165:8000/api",
  //  baseURL: "https://menro.opol.site/api",
    headers: {"Content-Type": "application/json"},
});


api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;