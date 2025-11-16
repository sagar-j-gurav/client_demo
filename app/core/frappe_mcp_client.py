"""Frappe MCP Client for interacting with Frappe Lead Management."""

import httpx
import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)


class FrappeMCPClient:
    """Client for interacting with Frappe MCP Server via HTTP Streamable transport."""

    def __init__(self, base_url: str = "http://localhost:3000"):
        """Initialize the Frappe MCP client.

        Args:
            base_url: Base URL of the Frappe MCP HTTP server
        """
        self.base_url = base_url
        self.endpoint = f"{base_url}/sse"
        self.client = httpx.AsyncClient(timeout=30.0)

    async def _call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Call an MCP tool via HTTP Streamable transport.

        Args:
            tool_name: Name of the tool to call
            arguments: Tool arguments

        Returns:
            Tool response
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

            logger.info(f"Calling Frappe MCP tool: {tool_name}")
            logger.debug(f"Tool arguments: {arguments}")

            response = await self.client.post(
                self.endpoint,
                json=request_payload,
                headers={"Content-Type": "application/json"}
            )

            response.raise_for_status()
            result = response.json()

            logger.info(f"Frappe MCP tool {tool_name} responded successfully")

            # Extract the content from MCP response
            if "result" in result and "content" in result["result"]:
                content = result["result"]["content"]
                if isinstance(content, list) and len(content) > 0:
                    return {
                        "success": True,
                        "text": content[0].get("text", ""),
                        "full_response": result
                    }

            return {
                "success": False,
                "error": "Invalid MCP response format",
                "full_response": result
            }

        except httpx.HTTPError as e:
            logger.error(f"HTTP error calling Frappe MCP: {e}")
            return {
                "success": False,
                "error": f"HTTP error: {str(e)}"
            }
        except Exception as e:
            logger.error(f"Error calling Frappe MCP: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def search_lead(
        self,
        email: Optional[str] = None,
        mobile: Optional[str] = None,
        phone: Optional[str] = None,
        lead_name: Optional[str] = None,
        company_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Search for leads in Frappe CRM.

        Args:
            email: Email address to search
            mobile: Mobile number to search
            phone: Phone number to search
            lead_name: Lead name to search
            company_name: Company name to search

        Returns:
            Search results
        """
        args = {}
        if email:
            args["email"] = email
        if mobile:
            args["mobile"] = mobile
        if phone:
            args["phone"] = phone
        if lead_name:
            args["lead_name"] = lead_name
        if company_name:
            args["company_name"] = company_name

        return await self._call_tool("search_lead", args)

    async def add_lead(self, lead_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new lead in Frappe CRM.

        Args:
            lead_data: Dictionary containing lead information.
                Required: At least one of email_id, mobile_no, or phone
                Optional: first_name, last_name, company_name, custom fields, etc.

        Returns:
            Lead creation result
        """
        return await self._call_tool("add_lead", lead_data)

    async def update_lead(self, lead_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing lead in Frappe CRM.

        Args:
            lead_id: Frappe Lead ID (e.g., 'CRM-LEAD-2025-00001')
            update_data: Dictionary containing fields to update

        Returns:
            Update result
        """
        update_data["lead_id"] = lead_id
        return await self._call_tool("update_lead", update_data)

    async def list_tools(self) -> Dict[str, Any]:
        """List available MCP tools.

        Returns:
            List of available tools
        """
        try:
            request_payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "tools/list",
                "params": {}
            }

            response = await self.client.post(
                self.endpoint,
                json=request_payload,
                headers={"Content-Type": "application/json"}
            )

            response.raise_for_status()
            result = response.json()

            return {
                "success": True,
                "tools": result.get("result", {}).get("tools", [])
            }

        except Exception as e:
            logger.error(f"Error listing MCP tools: {e}")
            return {
                "success": False,
                "error": str(e)
            }

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
