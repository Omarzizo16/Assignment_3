// Assignment 3 - Node.js Streams and HTTP CRUD APIs
const fs = require("fs");
const http = require("http");
const { pipeline } = require("stream");
const zlib = require("zlib");

// ============================================
// PART 1: Core Modules
// ============================================

// Question 1: Read file in chunks
function readFileInChunks(filePath) {
  console.log("Reading file in chunks:");
  const readStream = fs.createReadStream(filePath, {
    encoding: "utf-8",
    highWaterMark: 64 * 1024,
  });
  let chunkNumber = 0;
  
  readStream.on("data", (chunk) => {
    chunkNumber++;
    console.log(`Chunk ${chunkNumber}:`, chunk.substring(0, 100) + "...");
  });
  
  readStream.on("end", () => {
    console.log(`Finished reading. Total chunks: ${chunkNumber}\n`);
  });
  
  readStream.on("error", (error) => {
    console.error("Error reading file:", error.message);
  });
}

// Question 2: Copy file using streams
function copyFileUsingStreams(sourcePath, destPath) {
  const readStream = fs.createReadStream(sourcePath);
  const writeStream = fs.createWriteStream(destPath);

  pipeline(readStream, writeStream, (err) => {
    if (err) {
      console.error("Copy failed:", err.message);
    } else {
      console.log("File copied using streams\n");
    }
  });
}
/*    another solution  */
function copyFileUsingStreams(sourcePath, destPath) {
  const readStream = fs.createReadStream(sourcePath);
  const writeStream = fs.createWriteStream(destPath);

  readStream.pipe(writeStream);
  writeStream.on("finish", () => {
    console.log("File copied using streams");
  });

  readStream.on("error", (err) => {
    console.error("Error reading source file:", err.message);
  });
  writeStream.on("error", (err) => {
    console.error("Error writing to destination file:", err.message);
  });
}


// Question 3: Compress file using pipeline
function compressFile(inputPath, outputPath) {
  const readStream = fs.createReadStream(inputPath);
  const gzip = zlib.createGzip();
  const writeStream = fs.createWriteStream(outputPath);
  
  pipeline(readStream, gzip, writeStream, (err) => {
    if (err) {
      console.error("Compression failed:", err.message);
    } else {
      console.log("File compressed successfully\n");
    }
  });
}

// ============================================
// Create Test Files
// ============================================
function createTestFiles() {
  const bigContent = "This is test content for streams.\n".repeat(1000);
  fs.writeFileSync("./big.txt", bigContent);
  
  const sourceContent = "This is the source file content for testing streams and compression.";
  fs.writeFileSync("./source.txt", sourceContent);
  
  console.log("Test files created successfully!\n");
}

// ============================================
// Test Part 1
// ============================================

createTestFiles();
readFileInChunks("./big.txt");

setTimeout(() => {
  copyFileUsingStreams("./source.txt", "./dest.txt");
}, 2000);

setTimeout(() => {
  compressFile("./source.txt", "./data.txt.gz");
}, 4000);


// ============================================
// PART 2: HTTP CRUD OPERATIONS
// ============================================

const USERS_FILE = "./users.json";
const PORT = 3000;

// ============================================
// Helper Functions (Refactored - No Code Duplication!)
// ============================================

// Helper function to read users from JSON file
function readUsersFromFile() {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
      return [];
    }
    const data = fs.readFileSync(USERS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading users file:", err.message);
    return [];
  }
}

// Helper function to write users to JSON file
function writeUsersToFile(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (err) {
    console.error("Error writing to users file:", err.message);
  }
}

// Helper function to parse request body
function parseRequestBody(req, callback) {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });
  req.on("end", () => {
    try {
      const parsedBody = JSON.parse(body);
      callback(null, parsedBody);
    } catch (error) {
      callback(error, null);
    }
  });
}

// Send JSON response
function sendResponse(res, statusCode, data) {
  res.writeHead(statusCode);
  res.end(JSON.stringify(data));
}

// Validate user ID from URL
function getUserIdFromUrl(url) {
  const userId = parseInt(url.split("/")[2]);
  return isNaN(userId) ? null : userId;
}

// Find user by ID
function findUserById(users, userId) {
  return users.findIndex((user) => user.id === userId);
}

// ============================================
// Create HTTP Server
// ============================================
const server = http.createServer((req, res) => {
  const { method, url } = req; 
  
  // Set CORS headers
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  
  // Handle OPTIONS request
  if (method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // ============================================
  // POST /user - Add new user
  // ============================================
  if (method === "POST" && url === "/user") {
    parseRequestBody(req, (err, userData) => {
      if (err) {
        return sendResponse(res, 400, { error: "Invalid JSON" });
      }
      
      const { name, email, age } = userData;
      
      if (!name || !email) {
        return sendResponse(res, 400, { error: "Name and email are required" });
      }
      
      const users = readUsersFromFile();
      
      const emailExists = users.some((user) => user.email === email);
      if (emailExists) {
        return sendResponse(res, 409, { error: "Email already exists" });
      }
      
      const newUser = {
        id: users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1,
        name,
        email,
        age: age || null,
      };
      
      users.push(newUser);
      writeUsersToFile(users);
      
      sendResponse(res, 201, { 
        message: "User added successfully", 
        user: newUser 
      });
    });
  }
  
  // ============================================
  // PATCH /user/:id - Update user
  // ============================================
  else if (method === "PATCH" && url.startsWith("/user/")) {
    const userId = getUserIdFromUrl(url);
    
    if (userId === null) {
      return sendResponse(res, 400, { error: "Invalid user ID" });
    }
    
    parseRequestBody(req, (err, updateData) => {
      if (err) {
        return sendResponse(res, 400, { error: "Invalid JSON" });
      }
      
      const users = readUsersFromFile();
      const userIndex = findUserById(users, userId);
      
      if (userIndex === -1) {
        return sendResponse(res, 404, { error: "User not found" });
      }
      
      if (updateData.name) users[userIndex].name = updateData.name;
      if (updateData.email) users[userIndex].email = updateData.email;
      if (updateData.age !== undefined) users[userIndex].age = updateData.age;
      
      writeUsersToFile(users);
      
      sendResponse(res, 200, {
        message: "User updated successfully",
        user: users[userIndex],
      });
    });
  }
  
  // ============================================
  // DELETE /user/:id - Delete user
  // ============================================
  else if (method === "DELETE" && url.startsWith("/user/")) {
    const userId = getUserIdFromUrl(url);
    
    if (userId === null) {
      return sendResponse(res, 400, { error: "Invalid user ID" });
    }
    
    const users = readUsersFromFile();
    const userIndex = findUserById(users, userId);
    
    if (userIndex === -1) {
      return sendResponse(res, 404, { error: "User not found" });
    }
    
    const deletedUser = users.splice(userIndex, 1)[0];
    writeUsersToFile(users);
    
    sendResponse(res, 200, {
      message: "User deleted successfully",
      user: deletedUser,
    });
  }
  
  // ============================================
  // GET /user - Get all users
  // ============================================
  else if (method === "GET" && url === "/user") {
    const users = readUsersFromFile();
    sendResponse(res, 200, { users });
  }
  
  // ============================================
  // GET /user/:id - Get user by ID
  // ============================================
  else if (method === "GET" && url.startsWith("/user/")) {
    const userId = getUserIdFromUrl(url);
    
    if (userId === null) {
      return sendResponse(res, 400, { error: "Invalid user ID" });
    }
    
    const users = readUsersFromFile();
    const user = users.find((user) => user.id === userId);
    
    if (!user) {
      return sendResponse(res, 404, { error: "User not found" });
    }
    
    sendResponse(res, 200, { user });
  }
  
  // ============================================
  // 404 - Route not found
  // ============================================
  else {
    sendResponse(res, 404, { error: "Route not found" });
  }
});

// ============================================
// Start Server
// ============================================
server.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
  console.log(`📁 Users will be stored in: ${USERS_FILE}\n`);
});