from django.db import models
from django.conf import settings

class Review(models.Model):
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reviews_written'
    )
    farmer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='farmer_reviews'
    )
    rating = models.IntegerField() # 1 to 5
    comment = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Review for {self.farmer.username} by {self.reviewer.username} - Rating: {self.rating}"
