from datetime import date, timedelta

from django.test import TestCase
from rest_framework.test import APIClient

from products.models import Product
from users.models import User
from .models import BulkRequirement


class FarmerBulkRequirementVisibilityTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		self.farmer = User.objects.create_user(username='crop_farmer', password='test-pass', role='farmer')
		self.buyer = User.objects.create_user(username='bulk_buyer', password='test-pass', role='bulk_buyer')
		Product.objects.create(
			farmer=self.farmer,
			name='Organic Tomato',
			category='vegetables',
			quantity=20,
			unit='kg',
			price_per_unit=30,
			harvest_date=date.today(),
			expiry_date=date.today() + timedelta(days=5),
		)

	def test_farmer_sees_only_matching_registered_crops(self):
		visible = BulkRequirement.objects.create(
			buyer=self.buyer,
			crop_name='Fresh Tomatoes',
			quantity=100,
			required_date=date.today() + timedelta(days=3),
			target_price_min=20,
			target_price_max=35,
			location='Pune',
		)
		hidden = BulkRequirement.objects.create(
			buyer=self.buyer,
			crop_name='Cabbage',
			quantity=100,
			required_date=date.today() + timedelta(days=3),
			target_price_min=20,
			target_price_max=35,
			location='Pune',
		)

		self.client.force_authenticate(user=self.farmer)
		response = self.client.get('/api/orders/bulk-requirements/')

		self.assertEqual(response.status_code, 200)
		ids = {item['id'] for item in response.data}
		self.assertIn(visible.id, ids)
		self.assertNotIn(hidden.id, ids)

	def test_empty_inventory_hides_matching_crop(self):
		Product.objects.filter(farmer=self.farmer).update(quantity=0)
		BulkRequirement.objects.create(
			buyer=self.buyer,
			crop_name='Tomato',
			quantity=10,
			required_date=date.today() + timedelta(days=3),
			target_price_min=20,
			target_price_max=35,
			location='Pune',
		)

		self.client.force_authenticate(user=self.farmer)
		response = self.client.get('/api/orders/bulk-requirements/')

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data, [])
