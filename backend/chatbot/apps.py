"""
Chatbot Django App - Configuration
Isolated app for AI-powered farmer assistant
"""

from django.apps import AppConfig


class ChatbotConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'chatbot'
    verbose_name = 'Farmer AI Assistant Chatbot'
