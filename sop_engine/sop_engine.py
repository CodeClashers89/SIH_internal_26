import uuid
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field
from datetime import datetime

# ---------------------------------------------------------
# INPUT MODELS
# ---------------------------------------------------------

class CommodityInput(BaseModel):
    name: str
    category: Optional[str] = None
    variety: Optional[str] = None
    form: Optional[str] = None
    perishability: Optional[Literal["high", "medium", "low"]] = None

class TemperatureRange(BaseModel):
    min_celsius: Optional[float] = None
    max_celsius: Optional[float] = None

class ReferenceDataInput(BaseModel):
    source: Optional[str] = None
    typical_shelf_life_days: Optional[float] = None
    requires_cold_chain: Optional[bool] = None
    temperature_range: Optional[TemperatureRange] = None
    maximum_transit_time_hours: Optional[float] = None
    standard_packaging_types: Optional[List[str]] = None
    storage_requirements: Optional[List[str]] = None
    quality_parameters: Optional[List[str]] = None
    grading_standards: Optional[List[str]] = None
    regulatory_requirements: Optional[List[str]] = None

class BuyerRequirementsInput(BaseModel):
    required_grade: Optional[str] = None
    allowed_quantity_variance_percent: Optional[float] = None
    required_packaging: Optional[List[str]] = None
    delivery_window: Optional[str] = None
    additional_quality_requirements: Optional[List[str]] = None

class GenerateSOPRequest(BaseModel):
    action: Literal["generate_sop"]
    commodity: CommodityInput
    reference_data: Optional[ReferenceDataInput] = None
    buyer_requirements: Optional[BuyerRequirementsInput] = None

# ---------------------------------------------------------
# OUTPUT MODELS
# ---------------------------------------------------------

class SOPCommodity(BaseModel):
    name: str
    category: Optional[str] = None
    perishability: Optional[str] = None

class Step(BaseModel):
    step_id: str
    action: str
    responsible_party: str
    severity: Optional[Literal["blocking", "warning"]] = None
    required: bool
    evidence_required: List[str]
    required_records: List[str]
    completion_condition: str

class QualityControl(BaseModel):
    check: str
    method: str
    severity: Literal["blocking", "warning"]
    failure_action: str

class Stage(BaseModel):
    stage_id: str
    stage_name: str
    status: Literal["required", "recommended", "conditional", "not_applicable"]
    responsible_party: str
    objective: str
    steps: List[Step]
    quality_controls: List[QualityControl]
    handover_requirements: List[str]

class CommodityHandlingProfile(BaseModel):
    perishability: str
    physical_damage_sensitivity: Literal["high", "medium", "low", "unknown"]
    temperature_sensitivity: Literal["high", "medium", "low", "unknown"]
    moisture_sensitivity: Literal["high", "medium", "low", "unknown"]
    ventilation_requirement: Literal["high", "medium", "low", "unknown"]
    handling_priority: List[str]
    storage_priority: List[str]
    transport_priority: List[str]

class PackagingStandard(BaseModel):
    approved_types: List[str]
    preferred_type: Optional[str] = None
    rules: List[str]
    prohibited_handling: List[str]
    inspection_points: List[str]

class TemperatureRequirementsOutput(BaseModel):
    required: Optional[bool] = None
    min_celsius: Optional[float] = None
    max_celsius: Optional[float] = None
    default_used: bool

class MaxTransitTimeOutput(BaseModel):
    value: Optional[float] = None
    default_used: bool

class TransportationProtocol(BaseModel):
    vehicle_requirements: List[str]
    loading_requirements: List[str]
    handling_requirements: List[str]
    temperature_requirements: TemperatureRequirementsOutput
    maximum_transit_time_hours: MaxTransitTimeOutput
    tracking_requirements: List[str]
    delay_response: List[str]

class GradingCategory(BaseModel):
    grade: str
    description: str
    acceptance_status: Literal["accepted", "conditional", "rejected"]

class QualityAndGrading(BaseModel):
    inspection_points: List[str]
    grading_categories: List[GradingCategory]
    common_rejection_reasons: List[str]

class ReceivingProtocol(BaseModel):
    buyer_checklist: List[str]
    quantity_verification: List[str]
    quality_verification: List[str]
    evidence_to_capture: List[str]
    acceptance_outcomes: List[str]

class ExceptionHandling(BaseModel):
    scenario: str
    severity: Literal["blocking", "warning"]
    immediate_action: str
    responsible_party: str
    recovery_options: List[str]
    required_evidence: List[str]
    escalation_required: bool

class ActionGroup(BaseModel):
    enabled: Optional[bool] = None
    recommended_actions: List[str]

class RecoveryWorkflows(BaseModel):
    partial_rejection: ActionGroup
    full_rejection: ActionGroup
    transport_failure: ActionGroup
    quality_failure: ActionGroup
    quantity_mismatch: ActionGroup

class ChainEvent(BaseModel):
    event: str
    responsible_party: str
    records_required: List[str]
    evidence_required: List[str]

class ChainOfCustody(BaseModel):
    required_events: List[ChainEvent]

class ChecklistItem(BaseModel):
    stage: str
    task: str
    responsible_party: str
    required: bool

class ReferenceUsage(BaseModel):
    reference_data_used: List[str]
    defaults_used: List[str]
    default_used: bool
    requires_human_review: bool
    requires_regulatory_verification: bool

class GenerateSOPResponse(BaseModel):
    commodity: SOPCommodity
    sop_version: str
    sop_summary: str
    operational_priority: List[str]
    stages: List[Stage]
    commodity_handling_profile: CommodityHandlingProfile
    packaging_standard: PackagingStandard
    transportation_protocol: TransportationProtocol
    quality_and_grading: QualityAndGrading
    receiving_protocol: ReceivingProtocol
    exception_handling: List[ExceptionHandling]
    recovery_workflows: RecoveryWorkflows
    chain_of_custody: ChainOfCustody
    operational_checklist: List[ChecklistItem]
    reference_usage: ReferenceUsage
    review_flags: List[str]

# ---------------------------------------------------------
# CORE ENGINE LOGIC
# ---------------------------------------------------------

class SOPEngine:
    def __init__(self):
        pass

    def generate_sop(self, request: GenerateSOPRequest) -> GenerateSOPResponse:
        comm = request.commodity
        ref = request.reference_data or ReferenceDataInput()
        buy = request.buyer_requirements or BuyerRequirementsInput()

        review_flags = []
        defaults_used = []
        requires_human_review = False
        requires_regulatory_verification = False

        # 1. Profile Generation
        perishability = comm.perishability or "medium"
        requires_cold = ref.requires_cold_chain if ref.requires_cold_chain is not None else (True if perishability == "high" else False)
        
        if ref.requires_cold_chain is None and perishability == "high":
            defaults_used.append("Assumed cold chain required for high perishability commodity")
            review_flags.append("requires_cold_chain defaulted to True")
            requires_human_review = True

        profile = CommodityHandlingProfile(
            perishability=perishability,
            physical_damage_sensitivity="high" if perishability == "high" else "medium",
            temperature_sensitivity="high" if requires_cold else "low",
            moisture_sensitivity="medium",
            ventilation_requirement="high" if perishability in ["high", "medium"] else "low",
            handling_priority=["Minimize physical impact", "Speed to market" if perishability == "high" else "Ensure dry conditions"],
            storage_priority=["Temperature control" if requires_cold else "Dry and ventilated"],
            transport_priority=["Refrigerated transport" if requires_cold else "Covered transport"]
        )

        # 2. Temperature & Transit
        temp_req = TemperatureRequirementsOutput(
            required=requires_cold,
            min_celsius=ref.temperature_range.min_celsius if ref.temperature_range else None,
            max_celsius=ref.temperature_range.max_celsius if ref.temperature_range else None,
            default_used=False
        )
        if requires_cold and not ref.temperature_range:
            temp_req.default_used = True
            defaults_used.append("No specific temperature range provided despite cold chain requirement.")
            review_flags.append("Temperature range missing for cold chain.")
            requires_human_review = True

        transit_hours = ref.maximum_transit_time_hours
        max_transit_used_default = False
        if not transit_hours:
            if perishability == "high":
                transit_hours = 48.0
                max_transit_used_default = True
                defaults_used.append("Assumed 48h max transit for high perishability commodity")
                review_flags.append("Max transit time defaulted to 48h")
                requires_human_review = True

        transportation = TransportationProtocol(
            vehicle_requirements=["Refrigerated truck" if requires_cold else "Clean, covered truck"],
            loading_requirements=["Pre-cool vehicle before loading" if requires_cold else "Ensure dry bed"],
            handling_requirements=["Do not stack above recommended height", "Secure load to prevent shifting"],
            temperature_requirements=temp_req,
            maximum_transit_time_hours=MaxTransitTimeOutput(value=transit_hours, default_used=max_transit_used_default),
            tracking_requirements=["GPS tracking", "Temperature logger" if requires_cold else "Route logging"],
            delay_response=["Notify buyer immediately", "Check quality if delayed > 4 hours"]
        )

        # 3. Stages Assembly
        stages = []
        
        # HARVEST
        stages.append(Stage(
            stage_id="stage_harvest",
            stage_name="Harvest",
            status="required",
            responsible_party="farmer",
            objective="Harvest commodity at optimal maturity and prevent initial damage.",
            steps=[
                Step(
                    step_id="step_h1",
                    action=f"Harvest {comm.name} avoiding physical damage.",
                    responsible_party="farmer",
                    severity="warning",
                    required=True,
                    evidence_required=["Date/time of harvest"],
                    required_records=["Harvest lot ID"],
                    completion_condition="Crop removed from field and placed in clean containers."
                )
            ],
            quality_controls=[
                QualityControl(
                    check="Visual inspection for severe damage/rot",
                    method="Visual",
                    severity="blocking",
                    failure_action="Discard unfit produce immediately"
                )
            ],
            handover_requirements=["Harvest lot identified and isolated"]
        ))

        # PRE-COOLING (if perishable/cold)
        if requires_cold:
            stages.append(Stage(
                stage_id="stage_precool",
                stage_name="Pre-cooling",
                status="required",
                responsible_party="collection_center_operator",
                objective="Remove field heat rapidly.",
                steps=[
                    Step(
                        step_id="step_pc1",
                        action="Place harvested crop in pre-cooling chamber within 4 hours.",
                        responsible_party="collection_center_operator",
                        severity="blocking",
                        required=True,
                        evidence_required=["Temperature reading"],
                        required_records=["Cooling duration"],
                        completion_condition="Target temperature achieved."
                    )
                ],
                quality_controls=[],
                handover_requirements=[]
            ))

        # PACKAGING
        approved_pkgs = buy.required_packaging or ref.standard_packaging_types or ["Standard Crates", "Woven Sacks"]
        stages.append(Stage(
            stage_id="stage_packaging",
            stage_name="Packaging",
            status="required",
            responsible_party="farmer or collection_center_operator",
            objective="Protect commodity for transit.",
            steps=[
                Step(
                    step_id="step_pkg1",
                    action=f"Pack into {approved_pkgs[0]}.",
                    responsible_party="operator",
                    severity="blocking",
                    required=True,
                    evidence_required=["Photograph of packed lot"],
                    required_records=["Package count", "Net weight"],
                    completion_condition="All units securely packed and labeled."
                )
            ],
            quality_controls=[],
            handover_requirements=["Ready for loading"]
        ))

        # TRANSPORTATION
        stages.append(Stage(
            stage_id="stage_transport",
            stage_name="Transportation",
            status="required",
            responsible_party="transporter",
            objective="Deliver commodity without quality degradation.",
            steps=[
                Step(
                    step_id="step_t1",
                    action="Load packages onto vehicle safely.",
                    responsible_party="driver",
                    severity="blocking",
                    required=True,
                    evidence_required=["Loaded vehicle photo", "Weight slip"],
                    required_records=["Vehicle ID", "Dispatch timestamp"],
                    completion_condition="Doors secured and journey started."
                )
            ],
            quality_controls=[
                QualityControl(
                    check="Vehicle cleanliness",
                    method="Visual",
                    severity="blocking",
                    failure_action="Reject vehicle, request replacement"
                )
            ],
            handover_requirements=["Driver holds dispatch documentation"]
        ))

        # RECEIVING
        stages.append(Stage(
            stage_id="stage_receiving",
            stage_name="Receiving",
            status="required",
            responsible_party="buyer",
            objective="Verify quantity, quality, and complete handover.",
            steps=[
                Step(
                    step_id="step_r1",
                    action="Unload and inspect shipment.",
                    responsible_party="receiving_operator",
                    severity="blocking",
                    required=True,
                    evidence_required=["Receiving weight slip", "Quality photos if rejected"],
                    required_records=["Arrival timestamp", "Accepted quantity"],
                    completion_condition="Acceptance decision recorded."
                )
            ],
            quality_controls=[
                QualityControl(
                    check="Quantity variance",
                    method="Weighing",
                    severity="blocking",
                    failure_action="Initiate quantity dispute if variance > allowed %"
                )
            ],
            handover_requirements=["GRN (Goods Receipt Note) issued"]
        ))

        # Assembly packaging standard
        packaging = PackagingStandard(
            approved_types=approved_pkgs,
            preferred_type=buy.required_packaging[0] if buy.required_packaging else None,
            rules=["Do not overfill containers", "Ensure ventilation holes are unblocked"],
            prohibited_handling=["Dropping containers", "Stacking beyond structural limit"],
            inspection_points=["Bottom tier crushing", "Moisture accumulation inside packaging"]
        )

        # Quality & Grading
        req_grade = buy.required_grade or "Standard Acceptable"
        grading = QualityAndGrading(
            inspection_points=["Appearance", "Size", "Damage/Rot percentage"],
            grading_categories=[
                GradingCategory(grade=req_grade, description="Meets buyer specifications", acceptance_status="accepted"),
                GradingCategory(grade="Substandard", description="Minor defects exceeding tolerance", acceptance_status="conditional"),
                GradingCategory(grade="Reject", description="Severe damage or contamination", acceptance_status="rejected")
            ],
            common_rejection_reasons=["Mold/Rot", "Severe mechanical damage", "Off-odor", "Pest infestation"]
        )

        # Receiving Protocol
        receiving = ReceivingProtocol(
            buyer_checklist=["Verify vehicle seal/lock", "Check temperature logs if applicable", "Perform random sampling"],
            quantity_verification=["Weigh loaded vehicle", "Weigh empty vehicle", "Calculate net weight"],
            quality_verification=["Sample 5% of packages", "Check against grading standard"],
            evidence_to_capture=["Weight bridge ticket", "Photos of damaged goods"],
            acceptance_outcomes=["full_acceptance", "partial_acceptance", "conditional_acceptance", "rejection"]
        )

        # Exception Handling
        exceptions = [
            ExceptionHandling(
                scenario="Quantity mismatch at receiving",
                severity="blocking",
                immediate_action="Hold vehicle, re-weigh, notify seller",
                responsible_party="receiving_operator",
                recovery_options=["Accept actual quantity", "Reject shipment if below minimum viability"],
                required_evidence=["Double weight slip"],
                escalation_required=True
            ),
            ExceptionHandling(
                scenario="Quality degradation in transit",
                severity="blocking",
                immediate_action="Isolate degraded packages to prevent spread",
                responsible_party="receiving_operator",
                recovery_options=["Partial rejection", "Downgrade to processing buyer"],
                required_evidence=["Photographs of spoilage", "Temperature logger data"],
                escalation_required=True
            )
        ]

        # Recovery Workflows
        recovery = RecoveryWorkflows(
            partial_rejection=ActionGroup(enabled=True, recommended_actions=["Re-grade", "Adjust invoice"]),
            full_rejection=ActionGroup(enabled=True, recommended_actions=["Return to sender", "Liquidate locally"]),
            transport_failure=ActionGroup(enabled=True, recommended_actions=["Dispatch backup vehicle", "Transfer to local cold storage"]),
            quality_failure=ActionGroup(enabled=True, recommended_actions=["Downgrade grade", "Divert to processing"]),
            quantity_mismatch=ActionGroup(enabled=True, recommended_actions=["Accept measured weight", "Investigate theft/loss"])
        )

        # Chain of Custody
        coc = ChainOfCustody(
            required_events=[
                ChainEvent(event="HARVESTED", responsible_party="farmer", records_required=["Lot ID"], evidence_required=[]),
                ChainEvent(event="PACKAGED", responsible_party="operator", records_required=["Package count"], evidence_required=[]),
                ChainEvent(event="DISPATCHED", responsible_party="transporter", records_required=["Vehicle ID", "Weight"], evidence_required=["Loading photo"]),
                ChainEvent(event="RECEIVED", responsible_party="buyer", records_required=["Arrival weight"], evidence_required=["Unloading photo"])
            ]
        )

        # Checklist
        checklist = [
            ChecklistItem(stage="Harvest", task="Record harvest time", responsible_party="farmer", required=True),
            ChecklistItem(stage="Packaging", task="Verify packaging type", responsible_party="operator", required=True),
            ChecklistItem(stage="Loading", task="Capture dispatch weight", responsible_party="transporter", required=True),
            ChecklistItem(stage="Receiving", task="Perform quality sampling", responsible_party="buyer", required=True)
        ]

        if ref.regulatory_requirements:
            requires_regulatory_verification = True
            review_flags.append("Regulatory requirements present. Manual verification needed.")

        ref_usage = ReferenceUsage(
            reference_data_used=["Commodity profile inference", "Temperature parameters", "Transit parameters"],
            defaults_used=defaults_used,
            default_used=len(defaults_used) > 0,
            requires_human_review=requires_human_review,
            requires_regulatory_verification=requires_regulatory_verification
        )

        return GenerateSOPResponse(
            commodity=SOPCommodity(name=comm.name, category=comm.category, perishability=perishability),
            sop_version="1.0.0",
            sop_summary=f"Operational playbook for {comm.name} optimized for {perishability} perishability profile.",
            operational_priority=profile.handling_priority + profile.transport_priority,
            stages=stages,
            commodity_handling_profile=profile,
            packaging_standard=packaging,
            transportation_protocol=transportation,
            quality_and_grading=grading,
            receiving_protocol=receiving,
            exception_handling=exceptions,
            recovery_workflows=recovery,
            chain_of_custody=coc,
            operational_checklist=checklist,
            reference_usage=ref_usage,
            review_flags=review_flags
        )
