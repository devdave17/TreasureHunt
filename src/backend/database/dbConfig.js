import { randomUUID } from "node:crypto"
import { MongoClient } from "mongodb"
import process from "node:process"

const getMongoUri = () => process.env.MONGO_URI || process.env.MONGODB_URI

const getMongoDbName = () => process.env.MONGO_DB_NAME || process.env.MONGODB_DB || "treasurehunt"

const deepClone = (value) => {
  if (value === undefined) {
    return undefined
  }

  return structuredClone(value)
}

const normalizeId = (value) => String(value || "").trim()

const getFieldValue = (document, fieldPath) => {
  if (!fieldPath.includes(".")) {
    return document?.[fieldPath]
  }

  return fieldPath.split(".").reduce((current, key) => current?.[key], document)
}

const matchesFilter = (document, { field, operator, value }) => {
  const fieldValue = getFieldValue(document, field)

  switch (operator) {
    case "==":
    case "===":
      return fieldValue === value
    case "!=":
      return fieldValue !== value
    case ">":
      return fieldValue > value
    case ">=":
      return fieldValue >= value
    case "<":
      return fieldValue < value
    case "<=":
      return fieldValue <= value
    default:
      throw new Error(`Unsupported query operator: ${operator}`)
  }
}

const MONGO_OPERATOR_MAP = {
  "==": "$eq",
  "===": "$eq",
  "!=": "$ne",
  ">": "$gt",
  ">=": "$gte",
  "<": "$lt",
  "<=": "$lte",
  in: "$in",
}

const canUseMongoFilter = (filters = []) =>
  filters.every((filter) => Object.prototype.hasOwnProperty.call(MONGO_OPERATOR_MAP, filter.operator))

const buildMongoFilter = (filters = []) => {
  if (!filters.length) {
    return {}
  }

  const conditions = filters.map(({ field, operator, value }) => {
    if (operator === "==" || operator === "===") {
      return { [field]: value }
    }

    if (operator === "in") {
      return { [field]: { $in: Array.isArray(value) ? value : [value] } }
    }

    return { [field]: { [MONGO_OPERATOR_MAP[operator]]: value } }
  })

  return conditions.length === 1 ? conditions[0] : { $and: conditions }
}

const toStoredDocument = (data) => {
  const clone = deepClone(data) || {}
  delete clone.id
  delete clone._id
  return clone
}

class MongoDocumentSnapshot {
  constructor(ref, data) {
    this.ref = ref
    this.id = ref.id
    this.exists = Boolean(data)
    this._data = data ? deepClone(data) : null
  }

  data() {
    return this._data ? deepClone(this._data) : undefined
  }
}

class MongoQuerySnapshot {
  constructor(ref, docs) {
    this.ref = ref
    this.docs = docs
    this.size = docs.length
    this.empty = docs.length === 0
  }
}

class MongoDocumentReference {
  constructor(database, collectionName, id) {
    this.database = database
    this.collectionName = collectionName
    this.id = normalizeId(id)
    this.path = `${collectionName}/${this.id}`
  }

  async get() {
    await this.database.ensureReady()
    const collection = this.database.mongoDb.collection(this.collectionName)
    const data = await collection.findOne({ _id: this.id })
    return new MongoDocumentSnapshot(this, data)
  }

  async set(data, options = {}) {
    await this.database.ensureReady()
    const collection = this.database.mongoDb.collection(this.collectionName)
    const payload = toStoredDocument(data)

    if (options?.merge) {
      await collection.updateOne(
        { _id: this.id },
        { $set: payload, $setOnInsert: { _id: this.id } },
        { upsert: true },
      )
      return
    }

    await collection.replaceOne({ _id: this.id }, { _id: this.id, ...payload }, { upsert: true })
  }

  async update(data) {
    await this.database.ensureReady()
    const collection = this.database.mongoDb.collection(this.collectionName)
    const payload = toStoredDocument(data)
    await collection.updateOne({ _id: this.id }, { $set: payload })
  }

  async delete() {
    await this.database.ensureReady()
    const collection = this.database.mongoDb.collection(this.collectionName)
    await collection.deleteOne({ _id: this.id })
  }
}

class MongoQueryReference {
  constructor(database, collectionName, filters = [], limitCount = null) {
    this.database = database
    this.collectionName = collectionName
    this.filters = filters
    this.limitCount = limitCount
    this.id = collectionName
    this.path = collectionName
  }

  doc(id) {
    return new MongoDocumentReference(this.database, this.collectionName, id)
  }

  where(field, operator, value) {
    return new MongoQueryReference(
      this.database,
      this.collectionName,
      [...this.filters, { field, operator, value }],
      this.limitCount,
    )
  }

  limit(count) {
    return new MongoQueryReference(this.database, this.collectionName, this.filters, Number(count) || 0)
  }

  async get() {
    await this.database.ensureReady()
    const collection = this.database.mongoDb.collection(this.collectionName)
    const useMongoFilter = this.filters.length > 0 && canUseMongoFilter(this.filters)
    const queryFilter = useMongoFilter ? buildMongoFilter(this.filters) : {}

    let cursor = collection.find(queryFilter)

    if (useMongoFilter && this.limitCount > 0) {
      cursor = cursor.limit(this.limitCount)
    }

    let documents = await cursor.toArray()

    if (!useMongoFilter && this.filters.length) {
      documents = documents.filter((document) => this.filters.every((filter) => matchesFilter(document, filter)))
      if (this.limitCount > 0) {
        documents = documents.slice(0, this.limitCount)
      }
    }

    const docSnapshots = documents.map((document) => {
      const ref = new MongoDocumentReference(this.database, this.collectionName, document._id)
      return new MongoDocumentSnapshot(ref, document)
    })

    return new MongoQuerySnapshot(this, docSnapshots)
  }

  async add(data) {
    await this.database.ensureReady()
    const collection = this.database.mongoDb.collection(this.collectionName)
    const id = randomUUID()
    const payload = { _id: id, ...toStoredDocument(data) }
    await collection.insertOne(payload)
    return new MongoDocumentReference(this.database, this.collectionName, id)
  }

  async onSnapshot(callback, errorCallback) {
    try {
      const initialSnapshot = await this.get()
      await callback(initialSnapshot)
    } catch (error) {
      if (typeof errorCallback === "function") {
        errorCallback(error)
      }
    }

    return () => {}
  }
}

class MongoWriteBatch {
  constructor() {
    this.operations = []
  }

  delete(docRef) {
    this.operations.push({ type: "delete", docRef })
  }

  update(docRef, data) {
    this.operations.push({ type: "update", docRef, data })
  }

  set(docRef, data, options = {}) {
    this.operations.push({ type: "set", docRef, data, options })
  }

  async commit() {
    for (const operation of this.operations) {
      if (operation.type === "delete") {
        await operation.docRef.delete()
      } else if (operation.type === "update") {
        await operation.docRef.update(operation.data)
      } else if (operation.type === "set") {
        await operation.docRef.set(operation.data, operation.options)
      }
    }
  }
}

class MongoBulkWriter {
  constructor() {
    this.operations = []
  }

  delete(docRef) {
    this.operations.push({ type: "delete", docRef })
  }

  update(docRef, data) {
    this.operations.push({ type: "update", docRef, data })
  }

  set(docRef, data, options = {}) {
    this.operations.push({ type: "set", docRef, data, options })
  }

  async close() {
    for (const operation of this.operations) {
      if (operation.type === "delete") {
        await operation.docRef.delete()
      } else if (operation.type === "update") {
        await operation.docRef.update(operation.data)
      } else if (operation.type === "set") {
        await operation.docRef.set(operation.data, operation.options)
      }
    }
  }
}

class MongoDatabaseAdapter {
  constructor() {
    this.client = null
    this.mongoDb = null
    this.readyPromise = null
  }

  async ensureReady() {
    if (this.mongoDb) {
      return this.mongoDb
    }

    const mongoUri = getMongoUri()

    if (!mongoUri) {
      throw new Error("MongoDB is not configured. Set MONGO_URI or MONGODB_URI.")
    }

    if (!this.readyPromise) {
      this.client = new MongoClient(mongoUri)
      this.readyPromise = this.client.connect().then((client) => {
        this.mongoDb = client.db(getMongoDbName())
        return this.mongoDb
      })
    }

    return this.readyPromise
  }

  collection(name) {
    return new MongoQueryReference(this, name)
  }

  batch() {
    return new MongoWriteBatch()
  }

  bulkWriter() {
    return new MongoBulkWriter()
  }

  async terminate() {
    if (this.client) {
      await this.client.close()
    }
    this.client = null
    this.mongoDb = null
    this.readyPromise = null
  }
}

const database = new MongoDatabaseAdapter()

export const dbConfig = {
  COLLECTIONS: {
    USERS: "users",
    QUESTS: "quests",
    QUEST_PROGRESS: "questProgress",
    LEVELS: "levels",
    SCOREBOARD: "scoreboard",
    CLUES: "clues",
    QUESTIONS: "questions"
  },
  USER_DEFAULTS: {
    createdAt: new Date(),
    currentLevel: 1,
    isBlocked: false,
    score: 0,
    completedLevels: [],
    lastActive: new Date()
  },
  getDb: () => database,
  closeConnection: async () => {
    await database.terminate()
  }
}

export const db = database
