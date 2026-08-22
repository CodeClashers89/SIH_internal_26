import pytest
from sop_engine.sop_engine import SOPEngine, GenerateSOPRequest, CommodityInput, ReferenceDataInput, BuyerRequirementsInput

def test_generate_sop_highly_perishable():
    engine = SOPEngine()
    request = GenerateSOPRequest(
        action="generate_sop",
        commodity=CommodityInput(name="Tomatoes", perishability="high"),
        reference_data=ReferenceDataInput(requires_cold_chain=True)
    )
    
    response = engine.generate_sop(request)
    
    assert response.commodity.name == "Tomatoes"
    assert response.commodity.perishability == "high"
    
    # Pre-cooling stage should exist
    stage_ids = [s.stage_id for s in response.stages]
    assert "stage_precool" in stage_ids
    
    assert response.transportation_protocol.temperature_requirements.required is True
    
def test_generate_sop_low_perishability():
    engine = SOPEngine()
    request = GenerateSOPRequest(
        action="generate_sop",
        commodity=CommodityInput(name="Wheat", perishability="low"),
        reference_data=ReferenceDataInput(requires_cold_chain=False)
    )
    
    response = engine.generate_sop(request)
    
    # Pre-cooling stage should NOT exist
    stage_ids = [s.stage_id for s in response.stages]
    assert "stage_precool" not in stage_ids
    
    assert response.transportation_protocol.temperature_requirements.required is False

def test_default_flag_generation():
    engine = SOPEngine()
    # High perishability but missing cold chain and transit time
    request = GenerateSOPRequest(
        action="generate_sop",
        commodity=CommodityInput(name="Strawberries", perishability="high")
    )
    
    response = engine.generate_sop(request)
    
    assert response.reference_usage.default_used is True
    assert response.reference_usage.requires_human_review is True
    assert any("requires_cold_chain defaulted to True" in flag for flag in response.review_flags)
