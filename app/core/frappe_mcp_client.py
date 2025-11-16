"""Generic MCP Client for dynamic tool discovery and execution."""

import httpx
import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)


class FrappeMCPClient:
    """Generic MCP client with dynamic tool discovery via HTTP Streamable transport."""

    def __init__(self, base_url: str = "http://localhost:3000"):
        """Initialize the MCP client.

        Args:
            base_url: Base URL of the MCP HTTP server
        """
        self.base_url = base_url
        self.endpoint = f"{base_url}/sse"
        self.client = httpx.AsyncClient(timeout=30.0)
        self._tools_cache: Optional[List[Dict[str, Any]]] = None

    async def list_tools(self, use_cache: bool = True) -> Dict[str, Any]:
        """Discover available tools from the MCP server.

        Args:
            use_cache: Use cached tools list if available

        Returns:
            Dictionary with tools list or error
        """
        if use_cache and self._tools_cache is not None:
            return {
                "success": True,
                "tools": self._tools_cache
            }

        try:
            request_payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "tools/list",
                "params": {}
            }

            logger.info("Discovering MCP tools...")
            response = await self.client.post(
                self.endpoint,
                json=request_payload,
                headers={"Content-Type": "application/json"}
            )

            response.raise_for_status()
            result = response.json()

            tools = result.get("result", {}).get("tools", [])
            self._tools_cache = tools

            logger.info(f"Discovered {len(tools)} MCP tools: {[t.get('name') for t in tools]}")

            return {
                "success": True,
                "tools": tools
            }

        except Exception as e:
            logger.error(f"Error listing MCP tools: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Call any MCP tool dynamically.

        Args:
            tool_name: Name of the tool to call
            arguments: Tool arguments as dictionary

        Returns:
            Tool execution result
        """
        try:
            # MCP protocol message format
            request_payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "tools/call",
                "params": {
                    "name": tool_name,
                    "arguments": arguments
                }
            }

            logger.info(f"Calling MCP tool: {tool_name}")
            logger.debug(f"Tool arguments: {arguments}")

            response = await self.client.post(
                self.endpoint,
                json=request_payload,
                headers={"Content-Type": "application/json"}
            )

            response.raise_for_status()
            result = response.json()

            logger.info(f"MCP tool '{tool_name}' executed successfully")

            # Extract the content from MCP response
            if "result" in result and "content" in result["result"]:
                content = result["result"]["content"]
                if isinstance(content, list) and len(content) > 0:
                    return {
                        "success": True,
                        "text": content[0].get("text", ""),
                        "content": content,
                        "full_response": result
                    }

            return {
                "success": False,
                "error": "Invalid MCP response format",
                "full_response": result
            }

        except httpx.HTTPError as e:
            logger.error(f"HTTP error calling MCP tool '{tool_name}': {e}")
            return {
                "success": False,
                "error": f"HTTP error: {str(e)}"
            }
        except Exception as e:
            logger.error(f"Error calling MCP tool '{tool_name}': {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def get_tool_schema(self, tool_name: str) -> Optional[Dict[str, Any]]:
        """Get the schema for a specific tool.

        Args:
            tool_name: Name of the tool

        Returns:
            Tool schema or None if not found
        """
        tools_result = await self.list_tools()
        if not tools_result.get("success"):
            return None

        for tool in tools_result.get("tools", []):
            if tool.get("name") == tool_name:
                return tool

        return None

    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()


# Global client instance
frappe_mcp_client = None


def get_frappe_mcp_client(base_url: str = "http://localhost:3000") -> FrappeMCPClient:
    """Get Frappe MCP client instance.

    Args:
        base_url: Base URL of Frappe MCP server

    Returns:
        FrappeMCPClient instance
    """
    global frappe_mcp_client
    if frappe_mcp_client is None:
        frappe_mcp_client = FrappeMCPClient(base_url)
    return frappe_mcp_client
