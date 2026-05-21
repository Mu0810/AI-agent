import subprocess
import math
import json
import os
import urllib.request
import urllib.parse
from datetime import datetime
from ddgs import DDGS
from bs4 import BeautifulSoup
import requests

IS_PRODUCTION = os.getenv("PRODUCTION", "false").lower() == "true"

def web_search(query: str, max_results: int = 5) -> str:
    try:
        results = DDGS().text(query, max_results=max_results)
        if not results:
            return _fallback_search(query, max_results)
        formatted = []
        for i, r in enumerate(results[:max_results], 1):
            formatted.append(f"[{i}] {r.get('title', 'No title')}\nURL: {r.get('href', '')}\n{r.get('body', '')}")
        return "\n\n".join(formatted)
    except Exception as e:
        return _fallback_search(query, max_results)

def _fallback_search(query: str, max_results: int = 5) -> str:
    try:
        url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query)}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"})
        html = urllib.request.urlopen(req, timeout=10).read()
        soup = BeautifulSoup(html, "html.parser")
        results = []
        for a in soup.select("a.result__snippet")[:max_results]:
            title = a.parent.find("a", class_="result__title")
            title_text = title.get_text(strip=True) if title else "No title"
            body = a.get_text(strip=True)
            results.append(f"Title: {title_text}\nSnippet: {body}")
        return "\n\n".join(results) if results else f"No results found for '{query}'."
    except Exception as e:
        return f"Search failed: {str(e)}"

def web_scrape(url: str) -> str:
    try:
        resp = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
        soup = BeautifulSoup(resp.text, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()
        return soup.get_text(separator="\n", strip=True)[:3000]
    except Exception as e:
        return f"Scrape error: {str(e)}"

def calculate(expression: str) -> str:
    try:
        result = eval(expression, {"__builtins__": {}, "math": math})
        return f"Result: {result}"
    except Exception as e:
        return f"Calculation error: {str(e)}"

def execute_code(code: str, language: str = "python") -> str:
    """Execute code locally. DISABLED in production for security."""
    if IS_PRODUCTION:
        return "Code execution is disabled in cloud mode for security. I can still write and explain code for you."
    try:
        if language == "python":
            result = subprocess.run(["python3", "-c", code], capture_output=True, text=True, timeout=30)
        elif language == "bash":
            result = subprocess.run(code, shell=True, capture_output=True, text=True, timeout=30)
        else:
            return f"Unsupported language: {language}"
        output = result.stdout
        if result.stderr:
            output += f"\nErrors:\n{result.stderr}"
        return output.strip() or "Executed successfully (no output)."
    except subprocess.TimeoutExpired:
        return "Error: Execution timed out (30s)."
    except Exception as e:
        return f"Execution error: {str(e)}"

def read_file(file_path: str) -> str:
    """Read file contents. DISABLED in production for security."""
    if IS_PRODUCTION:
        return "File reading is disabled in cloud mode for security."
    try:
        with open(file_path, "r") as f:
            return f.read()
    except Exception as e:
        return f"Error: {str(e)}"

def write_file(file_path: str, content: str) -> str:
    """Write file contents. DISABLED in production for security."""
    if IS_PRODUCTION:
        return "File writing is disabled in cloud mode for security."
    try:
        os.makedirs(os.path.dirname(file_path) or ".", exist_ok=True)
        with open(file_path, "w") as f:
            f.write(content)
        return f"Written to {file_path}"
    except Exception as e:
        return f"Error: {str(e)}"

def list_directory(path: str = ".") -> str:
    """List directory contents. DISABLED in production for security."""
    if IS_PRODUCTION:
        return "Directory listing is disabled in cloud mode for security."
    try:
        entries = []
        for e in os.listdir(path):
            full = os.path.join(path, e)
            entries.append(f"{'DIR' if os.path.isdir(full) else 'FILE'} {e}")
        return "\n".join(entries)
    except Exception as e:
        return f"Error: {str(e)}"

def get_current_time() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S %Z")

def get_weather(city="auto") -> str:
    try:
        if city == "auto":
            try:
                ip_info = json.loads(urllib.request.urlopen("http://ip-api.com/json/", timeout=5).read())
                city = ip_info.get("city", "London")
            except:
                city = "London"
        url = f"https://wttr.in/{urllib.parse.quote(city)}?format=j1"
        data = json.loads(urllib.request.urlopen(url, timeout=10).read())
        current = data.get("current_condition", [{}])[0]
        return json.dumps({
            "city": city,
            "temperature": f"{current.get('temp_C', 'N/A')}C / {current.get('temp_F', 'N/A')}F",
            "condition": current.get("weatherDesc", [{}])[0].get("value", "Unknown"),
            "humidity": f"{current.get('humidity', 'N/A')}%",
            "wind": f"{current.get('windspeedKmph', 'N/A')} km/h",
            "feels_like": f"{current.get('FeelsLikeC', 'N/A')}C",
        }, indent=2)
    except Exception as e:
        return f"Weather fetch failed: {str(e)}"

def get_crypto_price(symbol="BTC") -> str:
    try:
        url = f"https://api.coincap.io/v2/assets/{symbol.lower()}"
        data = json.loads(urllib.request.urlopen(url, timeout=10).read())
        asset = data.get("data", {})
        return json.dumps({
            "symbol": asset.get("symbol", symbol),
            "name": asset.get("name", symbol),
            "price_usd": f"${float(asset.get('priceUsd', 0)):,.2f}",
            "change_24h": f"{float(asset.get('changePercent24Hr', 0)):.2f}%",
            "market_cap": f"${float(asset.get('marketCapUsd', 0)):,.0f}",
        }, indent=2)
    except Exception as e:
        return f"Crypto fetch failed: {str(e)}"

def get_stock_price(symbol="AAPL") -> str:
    try:
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol.upper()}?interval=1d&range=1d"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        data = json.loads(urllib.request.urlopen(req, timeout=10).read())
        meta = data["chart"]["result"][0]["meta"]
        return json.dumps({
            "symbol": meta.get("symbol", symbol),
            "price": f"${meta.get('regularMarketPrice', 0):,.2f}",
            "change": f"{meta.get('regularMarketChangePercent', 0):.2f}%",
            "market_cap": f"${(meta.get('marketCap', 0) / 1e9):,.1f}B",
        }, indent=2)
    except Exception as e:
        return f"Stock fetch failed: {str(e)}"

# Full tool definitions (OpenAI/Groq compatible format)
TOOLS = [
    {"type": "function", "function": {"name": "web_search", "description": "Search the web for current information", "parameters": {"type": "object", "properties": {"query": {"type": "string"}, "max_results": {"type": "integer", "default": 5}}, "required": ["query"]}}},
    {"type": "function", "function": {"name": "web_scrape", "description": "Scrape content from a URL", "parameters": {"type": "object", "properties": {"url": {"type": "string"}}, "required": ["url"]}}},
    {"type": "function", "function": {"name": "calculate", "description": "Evaluate mathematical expressions", "parameters": {"type": "object", "properties": {"expression": {"type": "string"}}, "required": ["expression"]}}},
    {"type": "function", "function": {"name": "execute_code", "description": "Execute Python or Bash code", "parameters": {"type": "object", "properties": {"code": {"type": "string"}, "language": {"type": "string", "enum": ["python", "bash"]}}, "required": ["code"]}}},
    {"type": "function", "function": {"name": "read_file", "description": "Read file contents", "parameters": {"type": "object", "properties": {"file_path": {"type": "string"}}, "required": ["file_path"]}}},
    {"type": "function", "function": {"name": "write_file", "description": "Write content to a file", "parameters": {"type": "object", "properties": {"file_path": {"type": "string"}, "content": {"type": "string"}}, "required": ["file_path", "content"]}}},
    {"type": "function", "function": {"name": "list_directory", "description": "List files in a directory", "parameters": {"type": "object", "properties": {"path": {"type": "string", "default": "."}}}}},
    {"type": "function", "function": {"name": "get_current_time", "description": "Get current date and time", "parameters": {"type": "object", "properties": {}}}},
    {"type": "function", "function": {"name": "get_weather", "description": "Get current weather for a city", "parameters": {"type": "object", "properties": {"city": {"type": "string", "default": "auto"}}}}},
    {"type": "function", "function": {"name": "get_crypto_price", "description": "Get cryptocurrency price", "parameters": {"type": "object", "properties": {"symbol": {"type": "string", "default": "BTC"}}}}},
    {"type": "function", "function": {"name": "get_stock_price", "description": "Get stock price", "parameters": {"type": "object", "properties": {"symbol": {"type": "string", "default": "AAPL"}}}}},
]

TOOL_FUNCTIONS = {
    "web_search": web_search,
    "web_scrape": web_scrape,
    "calculate": calculate,
    "execute_code": execute_code,
    "read_file": read_file,
    "write_file": write_file,
    "list_directory": list_directory,
    "get_current_time": get_current_time,
    "get_weather": get_weather,
    "get_crypto_price": get_crypto_price,
    "get_stock_price": get_stock_price,
}

# In production, only expose safe tools (no filesystem/code execution)
SAFE_TOOLS = ["web_search", "web_scrape", "calculate", "get_current_time", "get_weather", "get_crypto_price", "get_stock_price"]

def get_active_tools():
    """Return tool definitions that are enabled for the current environment."""
    if IS_PRODUCTION:
        return [t for t in TOOLS if t["function"]["name"] in SAFE_TOOLS]
    return TOOLS
