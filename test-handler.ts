import chatHandler from "./api/chat.js";
import sideHustlesHandler from "./api/side-hustles.js";
import businessBuilderHandler from "./api/business-builder.js";
import taskGenerateHandler from "./api/task-generate.js";

const mockRes = {
  status: function(code: number) {
    console.log(`[Response Status]: ${code}`);
    return this;
  },
  json: function(data: any) {
    console.log("[Response JSON]:", typeof data, JSON.stringify(data, null, 2));
    return this;
  },
  send: function(data: any) {
    console.log("[Response Send]:", typeof data, data);
    return this;
  },
  setHeader: function(name: string, value: any) {
    console.log(`[Response Header]: ${name} = ${value}`);
    return this;
  }
};

async function testSideHustles() {
  console.log("\n--- Testing side-hustles.ts ---");
  const mockReq = {
    method: "POST",
    body: {
      country: "South Africa",
      ageRange: "20-30",
      budget: "1000",
      skills: "programming",
      hoursPerWeek: "10",
      userId: "00000000-0000-0000-0000-000000000000"
    }
  };
  try {
    await sideHustlesHandler(mockReq, mockRes);
  } catch (error: any) {
    console.error("CRASH IN SIDE HUSTLES:", error.stack || error);
  }
}

async function testBusinessBuilder() {
  console.log("\n--- Testing business-builder.ts ---");
  const mockReq = {
    method: "POST",
    body: {
      businessIdea: "Coffee Shop",
      industry: "Retail",
      startingBudget: "5000",
      timeframe: "6 months",
      userId: "00000000-0000-0000-0000-000000000000"
    }
  };
  try {
    await businessBuilderHandler(mockReq, mockRes);
  } catch (error: any) {
    console.error("CRASH IN BUSINESS BUILDER:", error.stack || error);
  }
}

async function testTaskGenerate() {
  console.log("\n--- Testing task-generate.ts ---");
  const mockReq = {
    method: "POST",
    body: {
      taskType: "social_media",
      inputs: {
        topic: "Vite and React",
        platform: "LinkedIn",
        message: "Building fast web apps",
        tone: "Professional"
      },
      userId: "00000000-0000-0000-0000-000000000000"
    }
  };
  try {
    await taskGenerateHandler(mockReq, mockRes);
  } catch (error: any) {
    console.error("CRASH IN TASK GENERATE:", error.stack || error);
  }
}

async function testChat() {
  console.log("\n--- Testing chat.ts ---");
  const mockReq = {
    method: "POST",
    body: {
      message: "Hi",
      history: [],
      systemPrompt: "You are a helpful assistant.",
      userId: "00000000-0000-0000-0000-000000000000"
    }
  };
  try {
    await chatHandler(mockReq, mockRes);
  } catch (error: any) {
    console.error("CRASH IN CHAT:", error.stack || error);
  }
}

async function runAll() {
  await testChat();
  await testSideHustles();
  await testBusinessBuilder();
  await testTaskGenerate();
}

runAll();
