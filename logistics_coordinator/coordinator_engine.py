class LogisticsCoordinatorEngine:
    
    @staticmethod
    def filter_eligible_vehicles(payload: dict) -> dict:
        shipment = payload.get("shipment", {})
        sop_reference = payload.get("sop_reference", {})
        candidate_vehicles = payload.get("candidate_vehicles", [])

        eligible_vehicles = []
        disqualified_vehicles = []
        flagged_vehicles = []
        total_eligible_capacity = 0

        approved_types = sop_reference.get("approved_vehicle_types", [])
        requires_cold_chain = sop_reference.get("requires_cold_chain", False)

        for v in candidate_vehicles:
            vid = v.get("vehicle_id")
            
            # Hard compliance checks
            if not v.get("compliance_docs_valid"):
                disqualified_vehicles.append({"vehicle_id": vid, "reason": "Compliance documents not valid"})
                continue
                
            if requires_cold_chain and not v.get("has_cold_chain"):
                disqualified_vehicles.append({"vehicle_id": vid, "reason": f"Vehicle lacks required cold chain for {shipment.get('commodity_name', 'commodity')} SOP"})
                continue
                
            if approved_types and v.get("vehicle_type") not in approved_types:
                disqualified_vehicles.append({"vehicle_id": vid, "reason": f"Vehicle type '{v.get('vehicle_type')}' not approved for this SOP"})
                continue
            
            # Note: A real system might compare delivery_deadline vs available_from vs distance (not provided directly here)
            # For this simple filtering, we'll assume they pass if they aren't explicitly failing the SOP config checks.
            
            notes = []
            if requires_cold_chain and v.get("has_cold_chain"):
                notes.append("Meets cold chain")
            if v.get("vehicle_type") in approved_types:
                notes.append("Meets vehicle type")
            
            notes_str = " and ".join(notes) + " requirements" if notes else "Meets SOP requirements"
            
            eligible_vehicles.append({
                "vehicle_id": vid,
                "capacity_tons": v.get("capacity_tons", 0),
                "notes": notes_str.replace("Meets cold chain and Meets vehicle type requirements", "Meets cold chain and vehicle type requirements")
            })
            total_eligible_capacity += v.get("capacity_tons", 0)

        quantity_tons = shipment.get("quantity_tons", 0)
        capacity_sufficient = total_eligible_capacity >= quantity_tons

        return {
            "eligible_vehicles": eligible_vehicles,
            "disqualified_vehicles": disqualified_vehicles,
            "flagged_vehicles": flagged_vehicles,
            "total_eligible_capacity_tons": total_eligible_capacity,
            "capacity_sufficient": capacity_sufficient
        }

    @staticmethod
    def build_optimization_spec(payload: dict) -> dict:
        shipment = payload.get("shipment", {})
        eligible_vehicles = payload.get("eligible_vehicles", [])
        cost_data = payload.get("cost_data", [])

        # Structure problem for OR-Tools
        vehicle_capacities = [{"vehicle_id": v.get("vehicle_id"), "capacity_tons": v.get("capacity_tons")} for v in eligible_vehicles]

        return {
            "solver_problem_spec": {
                "objective": "minimize_total_cost",
                "constraints": {
                    "total_quantity_tons": shipment.get("quantity_tons", 0),
                    "deadline": shipment.get("delivery_deadline", ""),
                    "vehicle_capacities": vehicle_capacities,
                    "vehicle_costs": cost_data
                },
                "notes_for_solver": "Prefer fewer vehicles if cost is close to minimize handling fragmentation."
            }
        }

    @staticmethod
    def interpret_optimization_result(payload: dict) -> dict:
        solver_result = payload.get("solver_result", {})
        
        assignments = solver_result.get("assignments", [])
        feasible = solver_result.get("feasible", False)
        
        dispatch_plan = []
        for idx, assignment in enumerate(assignments, start=1):
            dispatch_plan.append({
                "vehicle_id": assignment.get("vehicle_id"),
                "assigned_tons": assignment.get("assigned_tons"),
                "pickup_sequence": idx
            })
            
        warnings = []
        if not feasible:
            warnings.append("Solver found solution infeasible under current constraints (capacity or deadline).")
            plan_summary = "Optimization failed to find a feasible dispatch plan."
        else:
            plan_summary = f"Successfully assigned {len(dispatch_plan)} vehicles for a total cost of {solver_result.get('total_cost', 0)}."
            
        return {
            "dispatch_plan": dispatch_plan,
            "plan_summary": plan_summary,
            "warnings": warnings
        }

    @staticmethod
    def handle_failure_recovery(payload: dict) -> dict:
        shipment_status = payload.get("shipment_status", "")
        failed_vehicle_id = payload.get("failed_vehicle_id", "")
        lost_capacity_tons = payload.get("lost_capacity_tons", 0)
        
        cancellation_locked = False
        if shipment_status in ["handed_over", "in_transit", "delivered"]:
            cancellation_locked = True
            
        # Check if we can recover from remaining candidate vehicles
        remaining_candidate_vehicles = payload.get("remaining_candidate_vehicles", [])
        sop_reference = payload.get("sop_reference", {})
        
        # We can reuse our own filter method
        filter_payload = {
            "shipment": payload.get("shipment", {}),
            "sop_reference": sop_reference,
            "candidate_vehicles": remaining_candidate_vehicles
        }
        
        filter_result = LogisticsCoordinatorEngine.filter_eligible_vehicles(filter_payload)
        newly_eligible_vehicles = filter_result.get("eligible_vehicles", [])
        total_eligible_capacity = filter_result.get("total_eligible_capacity_tons", 0)
        
        recovery_possible = total_eligible_capacity >= lost_capacity_tons
        
        if recovery_possible:
            action_required = "re_optimize"
            operator_message = f"Vehicle {failed_vehicle_id} failed. Found {len(newly_eligible_vehicles)} alternative vehicles with sufficient capacity ({total_eligible_capacity} tons) to cover the lost {lost_capacity_tons} tons. Recommend re-running optimization."
        else:
            action_required = "manual_intervention"
            operator_message = f"Vehicle {failed_vehicle_id} failed. Insufficient alternative capacity ({total_eligible_capacity} tons available vs {lost_capacity_tons} tons needed). Manual intervention required."
            
        return {
            "cancellation_locked": cancellation_locked,
            "recovery_possible": recovery_possible,
            "newly_eligible_vehicles": [{"vehicle_id": v["vehicle_id"], "capacity_tons": v["capacity_tons"]} for v in newly_eligible_vehicles],
            "action_required": action_required,
            "operator_message": operator_message
        }

    @staticmethod
    def generate_monitoring_update(payload: dict) -> dict:
        stage = payload.get("stage", "")
        stage_data = payload.get("stage_data", {})
        
        delay_minutes = stage_data.get("delay_minutes", 0) or 0
        temperature_ok = stage_data.get("temperature_ok")
        
        status_icon = "🟢"
        status_label = "On Track"
        operator_message = f"Shipment is currently in stage: {stage}. Operations proceeding normally."
        requires_attention = False
        
        if temperature_ok is False:
            status_icon = "🔴"
            status_label = "Temperature Deviation"
            operator_message = "CRITICAL: Cold chain temperature deviation detected! Produce at high risk of spoilage."
            requires_attention = True
        elif delay_minutes > 60:
            status_icon = "🔴"
            status_label = "Severe Delay"
            operator_message = f"CRITICAL: Shipment is delayed by {delay_minutes} minutes, risking SLA breach."
            requires_attention = True
        elif delay_minutes > 15:
            status_icon = "🟠"
            status_label = "Minor Delay"
            operator_message = f"WARNING: Shipment is delayed by {delay_minutes} minutes. Monitor closely."
            requires_attention = True
            
        return {
            "status_icon": status_icon,
            "status_label": status_label,
            "operator_message": operator_message,
            "requires_attention": requires_attention
        }
