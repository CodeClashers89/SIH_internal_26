from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from products.models import Product
from orders.models import Order, OrderItem
from logistics.models import DeliveryShipment, LogisticsPartner
from route_planning.models import RoutePlan
from route_planning.services.osrm_service import sample_route_points
from route_planning.services.weather_risk_engine import evaluate_route_weather_risk, evaluate_quality_risk
from route_planning.services.sop_service import fetch_commodity_sop
from route_planning.services.route_planner import plan_shipment_route

User = get_user_model()


class RoutePlanningServiceTestCase(TestCase):
    def setUp(self):
        self.farmer = User.objects.create_user(
            username="test_farmer",
            password="password123",
            role="farmer",
            district="Anand"
        )
        self.buyer = User.objects.create_user(
            username="test_buyer",
            password="password123",
            role="bulk_buyer",
            district="Mumbai"
        )
        self.product = Product.objects.create(
            farmer=self.farmer,
            name="Tomato",
            category="vegetables",
            quantity=5000,
            unit="kg",
            price_per_unit=25,
            harvest_date="2026-08-20",
            expiry_date="2026-08-28"
        )
        self.order = Order.objects.create(
            buyer=self.buyer,
            product_subtotal=125000,
            shipping_charge=5000,
            total_amount=130000,
            status="confirmed",
            shipping_address="Bandra, Mumbai",
            shipping_pincode="400050"
        )
        self.order_item = OrderItem.objects.create(
            order=self.order,
            product=self.product,
            quantity=5000,
            price=25
        )
        self.shipment = DeliveryShipment.objects.create(
            order=self.order,
            pickup_address="Anand, Gujarat",
            delivery_address="Bandra, Mumbai",
            pickup_lat=22.5645,
            pickup_lng=72.9289,
            destination_lat=19.0760,
            destination_lng=72.8777,
            distance_km=536.0,
            status="assigned"
        )

    def test_sample_route_points(self):
        geometry = [
            [22.5645, 72.9289],
            [22.3072, 73.1812],
            [21.1702, 72.8311],
            [19.0760, 72.8777]
        ]
        sampled = sample_route_points(geometry, interval_km=30.0)
        self.assertGreaterEqual(len(sampled), 2)
        self.assertEqual(sampled[0]["latitude"], 22.5645)

    def test_sop_fetching(self):
        sop = fetch_commodity_sop("Tomato", "vegetables")
        self.assertIn("commodity_handling_profile", sop)
        self.assertIn("transportation_protocol", sop)

    def test_weather_risk_engine(self):
        checkpoints = [
            {
                "point_id": "P1",
                "latitude": 22.5645,
                "longitude": 72.9289,
                "weather": {
                    "temperature_c": 32,
                    "precipitation_probability": 20,
                    "precipitation_mm": 0,
                    "wind_speed_kmh": 15,
                    "visibility_m": 10000
                }
            }
        ]
        enriched, risk = evaluate_route_weather_risk(checkpoints)
        self.assertEqual(risk, "LOW")

    def test_plan_shipment_route(self):
        route_plan = plan_shipment_route(
            shipment_id=self.shipment.id,
            user=self.farmer,
            auto_confirm=True
        )
        self.assertIsNotNone(route_plan)
        self.assertEqual(route_plan.shipment_id, self.shipment.id)
        self.assertEqual(route_plan.status, "CONFIRMED")
        self.assertTrue(route_plan.is_active)

    def test_shared_route_api(self):
        client = APIClient()
        client.force_authenticate(user=self.farmer)

        response = client.get(f"/api/route-planning/shipments/{self.shipment.id}/route/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("route", response.data)
        self.assertIn("route_geometry", response.data["route"])
