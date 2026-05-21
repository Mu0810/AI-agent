import json
import re
import os
from datetime import datetime
from backend.db import NexusDB
from backend.tools.registry import TOOLS, TOOL_FUNCTIONS, get_active_tools

db = NexusDB()

# ===== AI Provider Configuration =====
AI_PROVIDER = os.getenv("AI_PROVIDER", "ollama")  # "groq" or "ollama"
AI_MODEL = os.getenv("AI_MODEL", "qwen2.5:7b")

def get_ai_client():
    """Get the appropriate AI client based on provider config."""
    if AI_PROVIDER == "groq":
        from groq import Groq
        return Groq(api_key=os.getenv("GROQ_API_KEY"))
    else:
        import ollama
        return ollama

def chat_completion(messages, tools=None, stream=False, temperature=0.7):
    """Unified chat completion that works with both Groq and Ollama."""
    client = get_ai_client()

    if AI_PROVIDER == "groq":
        model = os.getenv("AI_MODEL", "llama-3.3-70b-versatile")
        kwargs = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "stream": stream,
        }
        if tools:
            kwargs["tools"] = tools
            kwargs["tool_choice"] = "auto"
            kwargs["stream"] = False  # Groq tool calls don't stream well
        
        response = client.chat.completions.create(**kwargs)
        return response
    else:
        # Ollama
        kwargs = {
            "model": os.getenv("AI_MODEL", "qwen2.5:7b"),
            "messages": messages,
            "options": {"temperature": temperature},
        }
        if tools:
            kwargs["tools"] = tools
        if stream:
            kwargs["stream"] = True
        
        return client.chat(**kwargs)

def extract_content(response):
    """Extract content from response regardless of provider."""
    if AI_PROVIDER == "groq":
        return response.choices[0].message.content or ""
    else:
        return response.get("message", {}).get("content", "")

def extract_tool_calls(response):
    """Extract tool calls from response regardless of provider."""
    if AI_PROVIDER == "groq":
        msg = response.choices[0].message
        if msg.tool_calls:
            calls = []
            for tc in msg.tool_calls:
                args = tc.function.arguments
                if isinstance(args, str):
                    try:
                        args = json.loads(args)
                    except json.JSONDecodeError:
                        args = {}
                calls.append({
                    "id": tc.id,
                    "name": tc.function.name,
                    "arguments": args,
                })
            return calls, msg
        return None, msg
    else:
        message = response.get("message", {})
        if message.get("tool_calls"):
            calls = []
            for tc in message["tool_calls"]:
                calls.append({
                    "id": tc.get("id", "call_0"),
                    "name": tc["function"]["name"],
                    "arguments": tc["function"]["arguments"],
                })
            return calls, message
        return None, message

def build_tool_response_message(tool_call_id, result):
    """Build a tool response message for the appropriate provider."""
    msg = {"role": "tool", "content": str(result)}
    if AI_PROVIDER == "groq":
        msg["tool_call_id"] = tool_call_id
    return msg

def build_assistant_tool_message(raw_message):
    """Convert the raw assistant message with tool_calls into a dict for message history."""
    if AI_PROVIDER == "groq":
        # Convert Groq message object to dict
        msg = {"role": "assistant", "content": raw_message.content or ""}
        if raw_message.tool_calls:
            msg["tool_calls"] = [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments if isinstance(tc.function.arguments, str) else json.dumps(tc.function.arguments),
                    }
                }
                for tc in raw_message.tool_calls
            ]
        return msg
    else:
        return raw_message  # Ollama messages are already dicts


# Keywords that strongly suggest the user wants real-time / internet data
INTERNET_KEYWORDS = [
    "latest", "recent", "current", "today", "right now", "news", "trending",
    "price of", "stock price", "weather in", "weather today", "who won",
    "what is happening", "2026", "2025", "this year", "this month",
    "release date", "how much does", "how much is",
    "crypto", "bitcoin", "ethereum", "market cap",
]

# Phrases that are conversational / about code / not internet-needing
NON_INTERNET_PHRASES = [
    "what does this", "what is this", "explain this", "how does this work",
    "fix this", "debug this", "write a", "create a", "help me",
    "what do you think", "can you", "tell me a joke", "hello", "hi",
    "how are you", "what are you", "who are you", "thanks", "thank you",
]

CUSTOM_COMMANDS = {
    "/analyze": "Analyze the following in detail. Provide insights, patterns, and conclusions.",
    "/summarize": "Summarize the following concisely with key points.",
    "/explain": "Explain the following concept in simple terms with examples.",
    "/translate": "Translate the following text to English.",
    "/code": "Write clean, well-documented code for the following requirement.",
    "/debug": "Debug the following code. Find errors and suggest fixes.",
    "/compare": "Compare the following items. List pros, cons, and differences.",
    "/brainstorm": "Brainstorm creative ideas. Provide at least 5 options.",
    "/save": "Remember this information for future reference.",
}

def needs_internet(query):
    """Determine if a query needs internet access. More conservative than before."""
    q = query.lower().strip()
    
    # Skip internet for non-internet conversational phrases
    if any(phrase in q for phrase in NON_INTERNET_PHRASES):
        return False
    
    # Check for strong internet keywords
    if any(kw in q for kw in INTERNET_KEYWORDS):
        return True
    
    # Only trigger for specific factual question patterns with temporal hints
    factual_prefixes = ["what is the", "who is the", "where is the", "when is the", "when did", "when will"]
    if any(q.startswith(prefix) for prefix in factual_prefixes):
        # Only if it seems like a factual lookup (not code/concept question)
        if not any(word in q for word in ["code", "function", "variable", "error", "bug", "syntax", "algorithm"]):
            return True
    
    return False

def process_command(query):
    for cmd, instruction in CUSTOM_COMMANDS.items():
        if query.lower().startswith(cmd):
            content = query[len(cmd):].strip()
            if cmd == "/save": return None, f"I'll remember that: {content}"
            return instruction, content
    return None, query

def build_search_query(query):
    q = query.lower()
    for prefix in ["what is", "who is", "where is", "when is", "how to", "tell me about", "explain"]:
        if q.startswith(prefix): return query[len(prefix):].strip()
    return query

SYSTEM_PROMPT = """You are NEXUS, an advanced AI reasoning agent with real-time internet access and tool use capabilities.

CAPABILITIES:
- Web search for current information and real-time data
- Real-time weather, cryptocurrency, and stock market data
- Code execution in Python and Bash with full output
- File operations (read, write, list directories)
- Mathematical calculations and expressions
- Smart memory and knowledge retention
- Document analysis (PDF, images)

PERSONALITY:
- Professional yet approachable
- Thorough but concise — avoid unnecessary verbosity
- Proactive — suggest follow-up actions when relevant
- Honest about limitations and uncertainties

RULES:
- Use provided search results for accurate, up-to-date answers
- Always cite sources with URLs when using search results
- When writing code, ALWAYS include print statements and call your functions so output is visible
- Never fabricate information — say "I don't know" if uncertain
- Use rich markdown formatting: headers, lists, bold, code blocks, tables
- For code, always specify the language in code blocks
- When comparing options, use tables for clarity
- Break complex answers into clear sections with headers
- If a question is ambiguous, ask for clarification before answering"""

class ReasoningAgent:
    def __init__(self, user_id="default", conversation_id="default"):
        self.user_id = user_id
        self.conversation_id = conversation_id
        self.base_messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        self.messages = list(self.base_messages)
        self.steps = []
        self._load_history()
    
    def _load_history(self):
        history = db.get_history(self.conversation_id, limit=10)
        for msg in history:
            if msg["role"] in ["user", "assistant"]:
                self.messages.append({"role": msg["role"], "content": msg["content"]})
    
    def run(self, user_input, max_steps=15):
        db.create_user(self.user_id)
        db.create_conversation(self.conversation_id, self.user_id, user_input[:50])
        db.add_message(self.conversation_id, "user", user_input)
        db.log_event(self.user_id, "message_sent", {"length": len(user_input)})
        self.steps = []
        
        cmd_instruction, content = process_command(user_input)
        if cmd_instruction: user_input = f"{cmd_instruction}\n\n{content}"
        
        if user_input.lower().startswith("/save"):
            db.save_knowledge(self.user_id, f"mem_{datetime.now().strftime('%Y%m%d_%H%M%S')}", content, "user_memory")
            return "Saved to my knowledge base. I'll remember this.", [{"type": "final", "content": "Saved to knowledge base."}]
        
        if needs_internet(user_input):
            self.steps.append({"type": "thinking", "content": "Searching the internet..."})
            search_query = build_search_query(user_input)
            search_results = TOOL_FUNCTIONS["web_search"](search_query, max_results=5)
            self.steps.append({"type": "tool", "tool": "web_search", "args": {"query": search_query}, "result": search_results[:500]})
            
            self.messages.append({"role": "user", "content": f"Search results for '{search_query}':\n\n{search_results}\n\nBased on these results, answer: {user_input}\n\nUse the search results. Cite sources."})
            
            response = chat_completion(self.messages)
            content = extract_content(response)
            
            if not content or len(content.strip()) < 10:
                self.messages.pop()
                self.messages.append({"role": "user", "content": user_input})
                content = self._run_with_tools(user_input, max_steps)
        else:
            self.messages.append({"role": "user", "content": user_input})
            content = self._run_with_tools(user_input, max_steps)
        
        self.steps.append({"type": "final", "content": content})
        db.add_message(self.conversation_id, "assistant", content)
        db.log_event(self.user_id, "message_received", {"length": len(content)})
        return content, self.steps
    
    def run_streaming(self, user_input, max_steps=15):
        """Generator that yields SSE events for streaming responses."""
        db.create_user(self.user_id)
        db.create_conversation(self.conversation_id, self.user_id, user_input[:50])
        db.add_message(self.conversation_id, "user", user_input)
        db.log_event(self.user_id, "message_sent", {"length": len(user_input)})
        
        cmd_instruction, content = process_command(user_input)
        if cmd_instruction: user_input = f"{cmd_instruction}\n\n{content}"
        
        if user_input.lower().startswith("/save"):
            db.save_knowledge(self.user_id, f"mem_{datetime.now().strftime('%Y%m%d_%H%M%S')}", content, "user_memory")
            yield {"type": "token", "content": "Saved to my knowledge base. I'll remember this."}
            yield {"type": "done"}
            return
        
        search_results = None
        if needs_internet(user_input):
            yield {"type": "step", "step": {"type": "thinking", "content": "Searching the internet..."}}
            search_query = build_search_query(user_input)
            search_results = TOOL_FUNCTIONS["web_search"](search_query, max_results=5)
            yield {"type": "step", "step": {"type": "tool", "tool": "web_search", "args": {"query": search_query}, "result": search_results[:500]}}
            
            self.messages.append({"role": "user", "content": f"Search results for '{search_query}':\n\n{search_results}\n\nBased on these results, answer: {user_input}\n\nUse the search results. Cite sources."})
        else:
            self.messages.append({"role": "user", "content": user_input})
        
        # Try streaming
        full_content = ""
        try:
            active_tools = get_active_tools()

            # First: check if tools are needed (non-streaming call)
            if active_tools:
                try:
                    tool_response = chat_completion(self.messages, tools=active_tools, stream=False)
                    tool_calls, raw_msg = extract_tool_calls(tool_response)
                    
                    if tool_calls:
                        # Process tool calls
                        self.messages.append(build_assistant_tool_message(raw_msg))
                        for tc in tool_calls:
                            fn = tc["name"]
                            args = tc["arguments"]
                            yield {"type": "step", "step": {"type": "thinking", "content": f"Using {fn}..."}}
                            result = TOOL_FUNCTIONS.get(fn, lambda **k: "Unknown tool")(**args)
                            yield {"type": "step", "step": {"type": "tool", "tool": fn, "args": args, "result": str(result)[:500]}}
                            self.messages.append(build_tool_response_message(tc["id"], result))
                except Exception:
                    pass  # Fall through to streaming response
            
            # Stream the final response
            if AI_PROVIDER == "groq":
                stream = chat_completion(self.messages, stream=True)
                for chunk in stream:
                    delta = chunk.choices[0].delta
                    token = delta.content if delta and delta.content else ""
                    if token:
                        full_content += token
                        yield {"type": "token", "content": token}
            else:
                stream = chat_completion(self.messages, stream=True)
                for chunk in stream:
                    token = chunk.get("message", {}).get("content", "")
                    if token:
                        full_content += token
                        yield {"type": "token", "content": token}

        except Exception as e:
            # Fallback to non-streaming
            try:
                response = chat_completion(self.messages)
                full_content = extract_content(response)
                if not full_content:
                    full_content = "I couldn't process that request."
                yield {"type": "token", "content": full_content}
            except Exception as e2:
                full_content = f"Error: {str(e2)}"
                yield {"type": "token", "content": full_content}
        
        if full_content:
            db.add_message(self.conversation_id, "assistant", full_content)
            db.log_event(self.user_id, "message_received", {"length": len(full_content)})
        
        yield {"type": "done"}
    
    def _run_with_tools(self, user_input, max_steps):
        active_tools = get_active_tools()

        for step in range(max_steps):
            try:
                if active_tools:
                    response = chat_completion(self.messages, tools=active_tools)
                else:
                    response = chat_completion(self.messages)
            except Exception as e:
                return f"Error communicating with AI: {str(e)}"
            
            tool_calls, raw_msg = extract_tool_calls(response)
            
            if tool_calls:
                self.messages.append(build_assistant_tool_message(raw_msg))
                for tc in tool_calls:
                    fn = tc["name"]
                    args = tc["arguments"]
                    self.steps.append({"type": "thinking", "content": f"Using {fn}..."})
                    try:
                        result = TOOL_FUNCTIONS.get(fn, lambda **k: "Unknown tool")(**args)
                    except Exception as e:
                        result = f"Tool error: {str(e)}"
                    self.steps.append({"type": "tool", "tool": fn, "args": args, "result": str(result)[:500]})
                    self.messages.append(build_tool_response_message(tc["id"], result))
            else:
                content = extract_content(response)
                if content and len(content.strip()) > 0:
                    return content
                # If model returns empty content with no tool calls, ask it to try again
                if step < max_steps - 1:
                    self.messages.append({"role": "user", "content": "Please provide a response to the previous question."})
                    continue
                return "I wasn't able to generate a response. Please try rephrasing your question."
        return "Reached thinking limit. Please try a simpler question."
    
    def reset(self):
        self.messages = list(self.base_messages)
        self.steps = []
