import { initDbConnection } from "./connection";

let isInitialized = false;

export async function initDatabase() {
  if (isInitialized) return;

  await initDbConnection();
  isInitialized = true;
}
