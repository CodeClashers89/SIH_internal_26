"""
Database router for chatbot app.
Directs all chatbot models to use the 'chatbot' database alias.
"""


class ChatbotRouter:
    """
    A router to control all database operations on models for the chatbot app.
    """

    def db_for_read(self, model, **hints):
        """Direct chatbot reads to the chatbot database."""
        if model._meta.app_label == 'chatbot':
            return 'chatbot'
        return None

    def db_for_write(self, model, **hints):
        """Direct chatbot writes to the chatbot database."""
        if model._meta.app_label == 'chatbot':
            return 'chatbot'
        return None

    def allow_relation(self, obj1, obj2, **hints):
        """Allow relations if both models are in the chatbot app."""
        db1 = 'chatbot' if obj1._meta.app_label == 'chatbot' else None
        db2 = 'chatbot' if obj2._meta.app_label == 'chatbot' else None
        if db1 is not None or db2 is not None:
            return db1 == db2
        return None

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """Ensure chatbot migrations run only on the chatbot database."""
        if app_label == 'chatbot':
            return db == 'chatbot'
        return None
