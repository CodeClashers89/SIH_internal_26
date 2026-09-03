"""
Groq LLM Service
Handles all interactions with the Groq API for the farmer AI assistant.
"""

import os
import json
import logging
from typing import Optional, List, Dict, Any, Tuple
from groq import Groq
import json

logger = logging.getLogger(__name__)


class GroqService:
    """
    Service to manage Groq LLM interactions.
    Provides methods for chat completion, tool calling, and error handling.
    """

    def __init__(self):
        """Initialize Groq client with API key from environment."""
        self.api_key = (os.environ.get('GROQ_API_KEY') or '').strip()
        self.offline_mode = False
        self.model = os.environ.get('GROQ_MODEL', 'mixtral-8x7b-32768')

        if not self.api_key:
            logger.error('GROQ_API_KEY is not configured. Chatbot will return a configuration error instead of a fake offline response.')
            self.client = None
            return

        self.client = Groq(api_key=self.api_key)
        logger.info(f"Groq service initialized with model: {self.model}")

    def send_message(
        self,
        messages: List[Dict[str, str]],
        tools: Optional[List[Dict[str, Any]]] = None,
        tool_choice: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> Dict[str, Any]:
        """
        Send a message to Groq and get a response.

        Args:
            messages: List of message dicts with 'role' and 'content'
            tools: Optional list of tool definitions for function calling
            tool_choice: Optional tool choice ("auto", "any", or specific tool dict)
            temperature: Creativity level (0-2)
            max_tokens: Maximum response length

        Returns:
            Response dict with choices[0].message containing role, content, and tool_calls
        """
        if not self.api_key or self.client is None:
            error_message = (
                'GROQ_API_KEY is not configured. Add a valid Groq API key to backend/.env '
                'or the runtime environment before using the Farmer AI Assistant.'
            )
            logger.error(error_message)
            return {
                'status': 'error',
                'error': error_message,
                'error_type': 'ConfigurationError',
            }

        try:
            kwargs = {
                'model': self.model,
                'messages': messages,
                'temperature': temperature,
                'max_tokens': max_tokens,
            }

            if tools:
                kwargs['tools'] = tools
                if tool_choice:
                    kwargs['tool_choice'] = tool_choice

            response = self.client.chat.completions.create(**kwargs)
            return {
                'status': 'success',
                'response': response,
                'message': response.choices[0].message,
                'finish_reason': response.choices[0].finish_reason,
            }

        except Exception as e:
            logger.error(f"Error calling Groq API: {str(e)}")
            return {
                'status': 'error',
                'error': str(e),
                'error_type': type(e).__name__,
            }

    def process_tool_call(
        self,
        tool_name: str,
        tool_arguments: str,
    ) -> Tuple[bool, Any]:
        """
        Parse and validate tool call arguments.

        Args:
            tool_name: Name of the tool being called
            tool_arguments: JSON string of tool arguments

        Returns:
            Tuple of (success: bool, parsed_args: dict or error_message: str)
        """
        try:
            # Tool arguments should be a JSON string
            parsed_args = json.loads(tool_arguments)
            logger.info(f"Tool call parsed: {tool_name} with args: {parsed_args}")
            return True, parsed_args
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse tool arguments: {str(e)}")
            return False, f"Invalid JSON in tool arguments: {str(e)}"
        except Exception as e:
            logger.error(f"Error processing tool call: {str(e)}")
            return False, f"Error processing tool call: {str(e)}"

    def validate_model_availability(self) -> bool:
        """
        Verify that the configured Groq model is available.

        Returns:
            True if model is available, False otherwise
        """
        try:
            # Make a minimal request to test model availability
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{'role': 'user', 'content': 'test'}],
                max_tokens=5,
            )
            logger.info(f"Model {self.model} is available")
            return True
        except Exception as e:
            logger.error(f"Model {self.model} is not available: {str(e)}")
            return False


class GroqServiceError(Exception):
    """Custom exception for Groq service errors."""
    pass
