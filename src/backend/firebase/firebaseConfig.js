import admin from "firebase-admin"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const serviceAccountPath = resolve(
  __dirname,
  "../../../coding-club-fab75-firebase-adminsdk-fbsvc-d69be385d6.json"
)
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"))

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

export { db }