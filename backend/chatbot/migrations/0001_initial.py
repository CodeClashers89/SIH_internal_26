# Generated migration for chatbot models

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Conversation',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ('farmer_id', models.IntegerField()),
                ('title', models.CharField(blank=True, max_length=255, null=True)),
                ('summary', models.TextField(blank=True, default='')),
                ('state', models.JSONField(blank=True, default=dict)),
                ('is_archived', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'conversations',
            },
        ),
        migrations.CreateModel(
            name='ToolCallLog',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ('tool_name', models.CharField(max_length=100)),
                ('arguments', models.JSONField(blank=True, null=True)),
                ('result', models.JSONField(blank=True, null=True)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('success', 'Success'), ('error', 'Error')], default='pending', max_length=20)),
                ('error_message', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('conversation', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='tool_calls', to='chatbot.conversation')),
            ],
            options={
                'db_table': 'tool_call_logs',
            },
        ),
        migrations.CreateModel(
            name='FarmerMemory',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ('farmer_id', models.IntegerField()),
                ('key', models.CharField(max_length=100)),
                ('value', models.JSONField()),
                ('source', models.CharField(choices=[('conversation', 'Conversation'), ('explicit_user_input', 'Explicit User Input'), ('system', 'System')], default='conversation', max_length=50)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'farmer_memories',
                'unique_together': {('farmer_id', 'key')},
            },
        ),
        migrations.CreateModel(
            name='ChatMessage',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ('role', models.CharField(choices=[('user', 'User'), ('assistant', 'Assistant'), ('tool', 'Tool'), ('system', 'System')], max_length=20)),
                ('content', models.TextField()),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('conversation', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='messages', to='chatbot.conversation')),
            ],
            options={
                'db_table': 'chat_messages',
            },
        ),
        migrations.AddIndex(
            model_name='conversation',
            index=models.Index(fields=['farmer_id'], name='conversations_farmer_id_idx'),
        ),
        migrations.AddIndex(
            model_name='conversation',
            index=models.Index(fields=['updated_at'], name='conversations_updated_at_idx'),
        ),
        migrations.AddIndex(
            model_name='conversation',
            index=models.Index(fields=['farmer_id', 'updated_at'], name='conversations_farmer_updated_idx'),
        ),
        migrations.AddIndex(
            model_name='chatmessage',
            index=models.Index(fields=['conversation'], name='chat_messages_conversation_id_idx'),
        ),
        migrations.AddIndex(
            model_name='chatmessage',
            index=models.Index(fields=['created_at'], name='chat_messages_created_at_idx'),
        ),
        migrations.AddIndex(
            model_name='chatmessage',
            index=models.Index(fields=['conversation', 'created_at'], name='chat_messages_conversation_created_idx'),
        ),
        migrations.AddIndex(
            model_name='farmermemory',
            index=models.Index(fields=['farmer_id'], name='farmer_memories_farmer_id_idx'),
        ),
        migrations.AddIndex(
            model_name='farmermemory',
            index=models.Index(fields=['farmer_id', 'key'], name='farmer_memories_farmer_key_idx'),
        ),
        migrations.AddIndex(
            model_name='toolcalllog',
            index=models.Index(fields=['conversation'], name='tool_call_logs_conversation_id_idx'),
        ),
        migrations.AddIndex(
            model_name='toolcalllog',
            index=models.Index(fields=['created_at'], name='tool_call_logs_created_at_idx'),
        ),
        migrations.AddIndex(
            model_name='toolcalllog',
            index=models.Index(fields=['tool_name'], name='tool_call_logs_tool_name_idx'),
        ),
    ]
