import Constants from "expo-constants";
import { Platform } from "react-native";

// Try several places where `extra` may be provided depending on SDK/config
const expoApi =
  Constants?.manifest?.extra?.API ||
  Constants?.expoConfig?.extra?.API ||
  Constants?.manifest2?.extra?.API;
const envApi = process.env.API;

let API = expoApi || envApi || "http://localhost:4000/api";

// Only map localhost -> 10.0.2.2 when ALL of:
// - running on Android, AND
// - the API is the default localhost (not provided via extra/env), AND
// - Constants.isDevice is explicitly false (emulator). If isDevice is undefined, do not map.
if (
  Platform.OS === "android" &&
  expoApi === undefined &&
  envApi === undefined &&
  Constants.isDevice === false
) {
  API = API.replace("localhost", "10.0.2.2");
  API = API.replace("127.0.0.1", "10.0.2.2");
}

export const API_ORIGIN = API.replace(/\/api\/?$/, "");

export { API };
export default API;
