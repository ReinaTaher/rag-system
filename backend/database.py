from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "rag_chat"

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

threads_collection = db["threads"]
messages_collection = db["messages"]
feedback_collection = db["feedback"]
