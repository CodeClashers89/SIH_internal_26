from rest_framework import serializers
from .models import Review
from users.serializers import UserSerializer

class ReviewSerializer(serializers.ModelSerializer):
    reviewer_details = UserSerializer(source='reviewer', read_only=True)

    class Meta:
        model = Review
        fields = ('id', 'reviewer', 'reviewer_details', 'farmer', 'rating', 'comment', 'created_at')
        read_only_fields = ('id', 'reviewer', 'created_at')

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

    def validate(self, data):
        reviewer = self.context['request'].user
        farmer = data.get('farmer')
        if reviewer == farmer:
            raise serializers.ValidationError("You cannot review yourself.")
        if farmer.role != 'farmer':
            raise serializers.ValidationError("You can only review farmers.")
        return data
