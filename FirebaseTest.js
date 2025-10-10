// FirebaseTest.js
import { db } from "./firebase";
import { getDatabase, ref, set } from "firebase/database";

export default function FirebaseTest() {
  const sendTestData = async () => {
    await set(ref(db, "test_connection"), {
      message: "Hello Firebase!",
      time: new Date().toISOString(),
    });
    console.log("✅ Data sent successfully to Realtime Database!");
  };

  sendTestData();

  return null;
}
