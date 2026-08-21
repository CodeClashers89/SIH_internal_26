from rest_framework.permissions import BasePermission

class IsFarmer(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'farmer'

class IsConsumer(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'consumer'

class IsBulkBuyer(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'bulk_buyer'

class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and (request.user.role == 'admin' or request.user.is_staff)
