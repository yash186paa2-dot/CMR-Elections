import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from './supabase';
import { 
  updateElectionStatus, 
  updateResultsVisibility, 
  fetchStatistics, 
  searchCandidate, 
  searchStudent,
  getAuditLogs,
  logAdminAction
} from './admin-actions';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

/**
 * Dynamically selects the best available Flash model to avoid 404 errors.
 */
async function getBestModel() {
  const MODEL_PRIORITY = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-pro-latest"
  ];

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_GEMINI_API_KEY}`);
    const data = await response.json();
    
    if (data.models) {
      const availableModels = data.models.map((m: any) => m.name.replace("models/", ""));
      console.log("[AI Agent] Available models:", availableModels.join(", "));
      
      for (const modelName of MODEL_PRIORITY) {
        if (availableModels.includes(modelName)) {
          console.log(`[AI Agent] Selected model: ${modelName}`);
          return modelName;
        }
      }
    } else if (data.error) {
      console.error("[AI Agent] API Error listing models:", data.error);
    }
  } catch (err) {
    console.error("[AI Agent] Failed to list models, falling back:", err);
  }
  
  const fallback = "gemini-2.0-flash";
  console.log(`[AI Agent] Fallback model: ${fallback}`);
  return fallback;
}

const SYSTEM_PROMPT = `
You are the "CMR Election AI Agent", a highly capable and secure assistant for the CMR National PU College Student Council Elections 2026.
Your role is to help administrators manage the election through natural language.

You have access to the following live data through tools:
1. Candidates (name, position, department, year, vote_count, house, display_order)
2. Votes (total counts, turnout)
3. Students (name, roll_no, class, has_voted)
4. Election Settings (election_status, results_visibility)
5. Houses (name, color)
6. Audit Logs (administrative history)

Core Mandates:
- Always be professional, concise, and helpful.
- For ANY information query, use the relevant tool to get LIVE data. Never guess.
- For "dangerous" actions (Open, Close, Pause Election, Publish/Hide Results), you MUST:
  1. Explain what the action does.
  2. Ask for explicit confirmation (e.g., "Are you sure? Type CONFIRM [ACTION]").
  3. ONLY call the tool if the user provides the confirmation.
- If a user asks "who is winning [position]", fetch all candidates, filter by position, and show the top ones by vote count.
- If a user asks for "top 5 candidates", fetch all candidates and show the top 5 by total vote count.
- Never say "I'm not sure how to help". Analyze the request and use the best tool or explain the limitation.
- If the user provides a "CONFIRM ..." message, proceed with the tool call.
- If the user says "Respond only with CONNECTED", you MUST respond ONLY with the word "CONNECTED".

Context:
Today's date is Saturday, June 13, 2026.
Election Status values: open, closed, paused, scheduled.
Results Visibility values: visible, hidden.
`;

export async function runElectionAgent(message: string, history: any[] = [], adminId: string) {
  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    return { content: "Error: GOOGLE_GEMINI_API_KEY is not configured in the environment." };
  }

  const MODEL_NAME = await getBestModel();
  console.log(`[AI Agent] Initializing with model: ${MODEL_NAME}`);

  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: SYSTEM_PROMPT,
  });

  // Prepare and validate history
  let chatHistory = history.slice(-10).map(h => ({
    role: h.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: h.content }],
  }));

  // MANDATE: First content should be with role 'user'
  while (chatHistory.length > 0 && chatHistory[0].role !== 'user') {
    chatHistory.shift();
  }

  console.log("--- Gemini Chat History ---");
  console.dir(chatHistory, { depth: null });
  console.log("--- User Message ---");
  console.log(message);

  const tools = {
    get_statistics: fetchStatistics,
    search_candidate: (q: string) => searchCandidate(q),
    search_student: (q: string) => searchStudent(q),
    get_logs: () => getAuditLogs(10),
    get_all_candidates: async () => {
      const { data } = await supabase.from('candidates').select('*').order('vote_count', { ascending: false });
      return data;
    },
    get_election_settings: async () => {
      const { data } = await supabase.from('election_settings').select('*');
      return data;
    },
    get_houses: async () => {
      const { data } = await supabase.from('houses').select('*');
      return data;
    },
    get_positions: async () => {
      const { data } = await supabase.from('candidates').select('position');
      const positions = Array.from(new Set((data || []).map(c => c.position)));
      return positions;
    },
    // Actions
    open_election: (adminId: string) => updateElectionStatus('open', adminId),
    close_election: (adminId: string) => updateElectionStatus('closed', adminId),
    pause_election: (adminId: string) => updateElectionStatus('paused', adminId),
    publish_results: (adminId: string) => updateResultsVisibility('visible', adminId),
    hide_results: (adminId: string) => updateResultsVisibility('hidden', adminId),
  };

  const decisionPrompt = `
  User is asking: "${message}"
  
  Available Tools:
  - get_statistics(): Returns turnout counts (unique_voters, total_students). Use this for "turnout" or "how many people voted".
  - search_candidate(query): Searches candidates by name. Use this to find specific vote counts for a person.
  - search_student(query): Searches students by name or roll number.
  - get_logs(): Returns recent admin activity.
  - get_all_candidates(): Returns all candidates sorted by vote count. Use this for "who is winning", "winners", or "leaderboard".
  - get_election_settings(): Returns status and visibility.
  - get_houses(): Returns house list.
  - get_positions(): Returns list of unique positions.
  - open_election(): ACTION. Requires "CONFIRM OPEN" from user.
  - close_election(): ACTION. Requires "CONFIRM CLOSE" from user.
  - pause_election(): ACTION. Requires "CONFIRM PAUSE" from user.
  - publish_results(): ACTION. Requires "CONFIRM PUBLISH" from user.
  - hide_results(): ACTION. Requires "CONFIRM HIDE" from user.

  Instructions:
  1. For data queries (votes, winners, turnout), call the tool by responding ONLY with: {"tool": "tool_name", "params": { ... }}
  2. If it's a state-change action (Open/Close/Pause/Publish/Hide) and NOT explicitly confirmed, ask for confirmation.
  3. If it's confirmed (e.g., "CONFIRM OPEN"), call the action tool.
  4. Always prefer tools over guessing.
  `;

  try {
    let responseText = "";
    
    try {
      if (chatHistory.length === 0) {
        const result = await model.generateContent(decisionPrompt);
        responseText = result.response.text().trim();
      } else {
        const chat = model.startChat({ history: chatHistory });
        const result = await chat.sendMessage(decisionPrompt);
        responseText = result.response.text().trim();
      }
    } catch (apiErr: any) {
      console.error("[Gemini API Error Detail]:", apiErr);
      return { content: `Gemini API Error: ${apiErr.message || 'Unknown API error'}` };
    }

    if (responseText.includes('{') && responseText.includes('}')) {
      try {
        const startIdx = responseText.indexOf('{');
        const endIdx = responseText.lastIndexOf('}') + 1;
        const jsonStr = responseText.substring(startIdx, endIdx);
        const toolCall = JSON.parse(jsonStr);
        let toolResult;

        console.log(`Agent calling tool: ${toolCall.tool}`, toolCall.params);

        switch (toolCall.tool) {
          case 'get_statistics': toolResult = await tools.get_statistics(); break;
          case 'search_candidate': toolResult = await tools.search_candidate(toolCall.params.query); break;
          case 'search_student': toolResult = await tools.search_student(toolCall.params.query); break;
          case 'get_logs': toolResult = await tools.get_logs(); break;
          case 'get_all_candidates': toolResult = await tools.get_all_candidates(); break;
          case 'get_election_settings': toolResult = await tools.get_election_settings(); break;
          case 'get_houses': toolResult = await tools.get_houses(); break;
          case 'get_positions': toolResult = await tools.get_positions(); break;
          case 'open_election': toolResult = await tools.open_election(adminId); break;
          case 'close_election': toolResult = await tools.close_election(adminId); break;
          case 'pause_election': toolResult = await tools.pause_election(adminId); break;
          case 'publish_results': toolResult = await tools.publish_results(adminId); break;
          case 'hide_results': toolResult = await tools.hide_results(adminId); break;
          default: toolResult = { error: `Unknown tool: ${toolCall.tool}` };
        }

        // Send tool result back for final friendly response
        try {
          if (chatHistory.length === 0) {
            const chat = model.startChat({
              history: [
                { role: 'user', parts: [{ text: decisionPrompt }] },
                { role: 'model', parts: [{ text: responseText }] }
              ]
            });
            const finalResult = await chat.sendMessage(`Tool result: ${JSON.stringify(toolResult)}. Provide a friendly final response to the admin based on this data. Be specific about the numbers if available.`);
            return { content: finalResult.response.text() };
          } else {
            const chat = model.startChat({ history: chatHistory });
            await chat.sendMessage(decisionPrompt); 
            const finalResult = await chat.sendMessage(`Tool result: ${JSON.stringify(toolResult)}. Provide a friendly final response to the admin based on this data. Be specific about the numbers if available.`);
            return { content: finalResult.response.text() };
          }
        } catch (apiFinalErr: any) {
          console.error("[Gemini API Final Response Error]:", apiFinalErr);
          return { content: `I got the data, but failed to format the response: ${JSON.stringify(toolResult)}` };
        }
      } catch (e) {
        console.error("Agent execution error:", e);
        return { content: `I encountered an error while processing the tool result: ${e instanceof Error ? e.message : String(e)}` };
      }
    }

    return { content: responseText };
  } catch (error: any) {
    console.error("Gemini SDK Exception:", error);
    return { content: `AI Error: ${error.message || 'Internal SDK Exception'}` };
  }
}
