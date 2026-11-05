"""
ZERO ROT 2.0 — Multi-Stage Supply Chain Network Engine (ISOMORPH Architecture).
Project Code: AGR007

Implements a 7-stage directed graph digital twin representing post-harvest agricultural logistics:
1. Farm Origin (Harvesting & farmgate packing)
2. Collection Center (Aggregation & sorting)
3. Pre-Cooling & Grading Facility (Hydrocooling & sorting)
4. Cold Storage Hub (Multi-chamber atmospheric storage)
5. Reefer Transit Corridor (Refrigerated highway haulage)
6. Regional Distribution Center (Urban staging & cross-docking)
7. APMC Mandi / Retail Destination (Auction & final sale)

Features:
- Directed network graph with node capacities and edge transit times
- Cascading disruption propagation (power outage, heatwave delay, reefer breakdown, ethylene cross-contamination)
- Spoilage and grade downgrade modeling across transit corridors
- Financial loss cascade accounting
"""

import math
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field

from .commodity_registry import ScientificCommodityRegistry

@dataclass
class SupplyChainNode:
    node_id: str
    name: str
    stage_number: int       # 1 to 7
    stage_name: str
    city: str
    latitude: float
    longitude: float
    facility_type: str      # "FARM", "COLLECTION", "PRECOOLING", "COLD_HUB", "DISTRIBUTION", "MANDI"
    capacity_tonnes: float
    current_inventory_tonnes: float = 0.0
    storage_temp_c: float = 4.0
    storage_rh_pct: float = 90.0
    health_status: str = "NORMAL" # "NORMAL", "DEGRADED", "FAILED", "CONGESTED"
    power_backup_active: bool = False
    active_disruptions: List[str] = field(default_factory=list)

@dataclass
class SupplyChainEdge:
    edge_id: str
    from_node_id: str
    to_node_id: str
    name: str
    distance_km: float
    standard_transit_hours: float
    current_transit_hours: float
    transport_mode: str     # "REEFER_TRUCK", "VENTILATED_TRUCK", "OPEN_TRACTOR"
    transit_temp_c: float = 4.0
    status: str = "NORMAL"  # "NORMAL", "DELAYED", "BLOCKED", "REEFER_FAULT"
    active_disruptions: List[str] = field(default_factory=list)

class SupplyChainNetworkTwin:
    """
    Authoritative Digital Twin of the 7-Stage Post-Harvest Supply Chain.
    Propagates cascading delays, thermal stress, and financial spoilage across the graph.
    """
    def __init__(self):
        self.nodes: Dict[str, SupplyChainNode] = {}
        self.edges: Dict[str, SupplyChainEdge] = {}
        self.active_scenarios: List[Dict[str, Any]] = []
        self._build_default_network()

    def _build_default_network(self):
        """Constructs canonical Maharashtra-Karnataka agri-logistics corridor."""
        node_definitions = [
            SupplyChainNode("NODE_FARM", "Khed Farm Gate", 1, "Farm Origin", "Khed, Pune", 18.8415, 73.8966, "FARM", 50.0, 15.0, 28.0, 60.0),
            SupplyChainNode("NODE_COLL", "Manchar Agri Aggregation Center", 2, "Collection Center", "Manchar", 18.9982, 73.9431, "COLLECTION", 80.0, 24.5, 24.0, 65.0),
            SupplyChainNode("NODE_COOL", "Narayangaon Integrated Pre-Cooling", 3, "Pre-Cooling & Grading", "Narayangaon", 19.1245, 73.9782, "PRECOOLING", 120.0, 42.0, 3.5, 92.0),
            SupplyChainNode("NODE_HUB", "Chakan Mega Cold Storage Hub", 4, "Cold Storage Hub", "Chakan", 18.7606, 73.8587, "COLD_HUB", 500.0, 310.0, 4.0, 90.0),
            SupplyChainNode("NODE_TRANSIT", "NH48 Reefer Logistics Corridor", 5, "Reefer Transit Corridor", "NH48 Expressway", 18.9100, 73.5500, "TRANSIT", 100.0, 32.0, 4.5, 85.0),
            SupplyChainNode("NODE_RDC", "Vashi Distribution & Cross-Docking Terminal", 6, "Regional Distribution Center", "Navi Mumbai", 19.0770, 72.9980, "DISTRIBUTION", 250.0, 140.0, 6.0, 85.0),
            SupplyChainNode("NODE_MANDI", "APMC Central Mandi & Export Terminal", 7, "Mandi / Retail Destination", "Vashi APMC", 19.0688, 73.0035, "MANDI", 800.0, 480.0, 22.0, 60.0),
        ]
        for n in node_definitions:
            self.nodes[n.node_id] = n

        edge_definitions = [
            SupplyChainEdge("EDGE_1_2", "NODE_FARM", "NODE_COLL", "Farm to Aggregation Link", 25.0, 1.2, 1.2, "OPEN_TRACTOR", 27.5),
            SupplyChainEdge("EDGE_2_3", "NODE_COLL", "NODE_COOL", "Aggregation to Pre-Cooling Transit", 18.0, 0.8, 0.8, "VENTILATED_TRUCK", 23.0),
            SupplyChainEdge("EDGE_3_4", "NODE_COOL", "NODE_HUB", "Chilled Feeder to Central Cold Hub", 45.0, 1.5, 1.5, "REEFER_TRUCK", 4.0),
            SupplyChainEdge("EDGE_4_5", "NODE_HUB", "NODE_TRANSIT", "Hub Dispatch to Highway Corridor", 30.0, 1.0, 1.0, "REEFER_TRUCK", 4.0),
            SupplyChainEdge("EDGE_5_6", "NODE_TRANSIT", "NODE_RDC", "Expressway Reefer Haulage to Urban RDC", 110.0, 3.5, 3.5, "REEFER_TRUCK", 4.2),
            SupplyChainEdge("EDGE_6_7", "NODE_RDC", "NODE_MANDI", "Terminal Transfer to Auction Floor", 12.0, 0.6, 0.6, "VENTILATED_TRUCK", 18.0),
        ]
        for e in edge_definitions:
            self.edges[e.edge_id] = e

    def inject_disruption(self, scenario_key: str) -> Dict[str, Any]:
        """
        Injects a physical disruption into the supply chain network and calculates cascading effects.
        """
        self.active_scenarios.append({
            "scenario_key": scenario_key,
            "injected_at": datetime.now(timezone.utc).isoformat()
        })

        if scenario_key == "HEATWAVE_TRANSIT_DELAY":
            # Expressway reefer breakdown + 42°C heatwave
            edge = self.edges.get("EDGE_5_6")
            node = self.nodes.get("NODE_TRANSIT")
            if edge and node:
                edge.status = "REEFER_FAULT"
                edge.transit_temp_c = 34.0
                edge.current_transit_hours = 9.5  # +6 hours delay
                edge.active_disruptions.append("Compressor tripped under 42°C ambient heatwave")
                node.health_status = "DEGRADED"
                node.storage_temp_c = 34.0
                node.active_disruptions.append("Thermal excursion on NH48")

            # Cascade: Delay arrivals at RDC and Mandi
            rdc = self.nodes.get("NODE_RDC")
            if rdc:
                rdc.health_status = "CONGESTED"
                rdc.active_disruptions.append("Delayed deliveries causing unloading dock backlog")

            return {
                "scenario": scenario_key,
                "title": "Severe Transit Heatwave & Reefer Failure",
                "affected_components": ["EDGE_5_6", "NODE_TRANSIT", "NODE_RDC"],
                "transit_time_surge_hours": 6.0,
                "cargo_temp_rise_c": 29.8,
                "cascading_impact": "Downstream RDC docking bottleneck with 3.8x Arrhenius decay rate surge"
            }

        elif scenario_key == "COLD_HUB_POWER_OUTAGE":
            # Cold Storage Hub grid failure + diesel genset tripped
            hub = self.nodes.get("NODE_HUB")
            if hub:
                hub.health_status = "FAILED"
                hub.storage_temp_c = 19.5
                hub.storage_rh_pct = 72.0
                hub.power_backup_active = False
                hub.active_disruptions.append("Grid feeder trip; Genset transfer switch locked out")

            return {
                "scenario": scenario_key,
                "title": "Central Cold Hub Power Blackout",
                "affected_components": ["NODE_HUB"],
                "chamber_temp_rise_c": 15.5,
                "cascading_impact": "310 tonnes of cold stored produce undergoing rapid respiration spike"
            }

        elif scenario_key == "ETHYLENE_CROSS_CONTAMINATION":
            # Ripe mangoes placed near sensitive bananas
            precool = self.nodes.get("NODE_COOL")
            if precool:
                precool.health_status = "DEGRADED"
                precool.active_disruptions.append("Climacteric cross-contamination: High ethylene emission")

            return {
                "scenario": scenario_key,
                "title": "Ethylene Cross-Exposure Disruption",
                "affected_components": ["NODE_COOL"],
                "cascading_impact": "Accelerated chlorophyll degreening and senescence in sensitive batches"
            }

        else: # RESET_NORMAL
            self._build_default_network()
            self.active_scenarios.clear()
            return {
                "scenario": "RESET_NORMAL",
                "title": "Supply Chain Network Restored to Baseline",
                "affected_components": ["ALL"],
                "cascading_impact": "Zero thermal excursions; standard transit schedules operational"
            }

    def simulate_produce_journey(
        self,
        commodity_name: str,
        initial_quantity_kg: float,
        initial_quality_score: float = 100.0,
        farmgate_rate_inr_kg: float = 40.0
    ) -> Dict[str, Any]:
        """
        Simulates the journey of a batch through all 7 stages from Farm to Mandi.
        Calculates cumulative stage-by-stage quality loss, moisture loss, transit cost, and terminal value.
        """
        prof = ScientificCommodityRegistry.get_profile(commodity_name)
        current_q = initial_quality_score
        current_mass = initial_quantity_kg
        cumulative_transit_hours = 0.0
        stage_traces = []

        total_logistics_cost_inr = 0.0

        for stage_num in range(1, 8):
            node = [n for n in self.nodes.values() if n.stage_number == stage_num][0]
            
            # Stage dwell duration (hours)
            dwell_hours = {1: 3.0, 2: 4.0, 3: 5.0, 4: 24.0, 5: 4.0, 6: 6.0, 7: 8.0}.get(stage_num, 4.0)
            
            # If stage 5, use edge transit time
            if stage_num == 5:
                edge = self.edges.get("EDGE_5_6")
                if edge:
                    dwell_hours = edge.current_transit_hours

            cumulative_transit_hours += dwell_hours

            # Calculate deterioration at node microclimate
            # In intelligent cold chain stages (Pre-cooling, Cold Hub, Reefer), optimal setpoint is maintained unless disrupted
            if node.facility_type in ["PRECOOLING", "COLD_HUB", "TRANSIT"] and node.health_status == "NORMAL":
                temp_c = prof.optimal_temp_c
                rh_pct = prof.optimal_rh_pct
            else:
                temp_c = node.storage_temp_c
                rh_pct = node.storage_rh_pct

            decay = ScientificCommodityRegistry.calculate_effective_decay(
                commodity_name=commodity_name,
                temp_c=temp_c,
                rh_pct=rh_pct
            )
            k_day = decay["effective_k_day"]
            decay_fraction = 1.0 - math.exp(-k_day * (dwell_hours / 24.0))
            delta_q = current_q * decay_fraction
            current_q = max(0.0, current_q - delta_q)

            # Transpiration water loss
            trans = ScientificCommodityRegistry.calculate_transpiration_rate(commodity_name, temp_c, rh_pct)
            mass_loss_kg = current_mass * ((trans["daily_moisture_loss_pct"] / 100.0) * (dwell_hours / 24.0))
            current_mass = max(0.0, current_mass - mass_loss_kg)

            # Logistics handling & refrigeration cost
            stage_cost = current_mass * {1: 0.5, 2: 0.8, 3: 1.5, 4: 2.2, 5: 3.5, 6: 1.2, 7: 1.0}.get(stage_num, 1.0)
            total_logistics_cost_inr += stage_cost

            stage_traces.append({
                "stage_number": stage_num,
                "node_name": node.name,
                "stage_name": node.stage_name,
                "dwell_hours": dwell_hours,
                "cumulative_hours": round(cumulative_transit_hours, 1),
                "temperature_c": temp_c,
                "rh_pct": rh_pct,
                "health_status": node.health_status,
                "quality_score": round(current_q, 2),
                "mass_remaining_kg": round(current_mass, 1),
                "active_disruptions": list(node.active_disruptions)
            })

        # Quality grading tier
        if current_q >= 85.0:
            grade = "GRADE_A_EXPORT"
            price_realization_factor = 1.25
        elif current_q >= 70.0:
            grade = "GRADE_B_DOMESTIC"
            price_realization_factor = 1.00
        elif current_q >= 50.0:
            grade = "GRADE_C_LOCAL"
            price_realization_factor = 0.65
        else:
            grade = "SPOILED_DISTRESS"
            price_realization_factor = 0.20

        mandi_market_rate_inr_kg = farmgate_rate_inr_kg * 1.55
        terminal_unit_price = mandi_market_rate_inr_kg * price_realization_factor
        final_revenue_inr = round(current_mass * terminal_unit_price, 2)
        initial_value_inr = round(initial_quantity_kg * farmgate_rate_inr_kg, 2)
        net_profit_inr = round(final_revenue_inr - initial_value_inr - total_logistics_cost_inr, 2)

        return {
            "commodity": prof.name,
            "initial_quantity_kg": initial_quantity_kg,
            "final_quantity_kg": round(current_mass, 1),
            "shrinkage_loss_pct": round(((initial_quantity_kg - current_mass) / initial_quantity_kg) * 100.0, 2),
            "initial_quality": initial_quality_score,
            "final_quality": round(current_q, 2),
            "final_grade": grade,
            "total_transit_hours": round(cumulative_transit_hours, 1),
            "logistics_cost_inr": round(total_logistics_cost_inr, 2),
            "initial_farmgate_value_inr": initial_value_inr,
            "final_revenue_inr": final_revenue_inr,
            "net_margin_inr": net_profit_inr,
            "stage_traces": stage_traces
        }

    def get_network_overview(self) -> Dict[str, Any]:
        """Returns JSON-serializable network summary for frontend visualization."""
        return {
            "nodes": [
                {
                    "node_id": n.node_id,
                    "name": n.name,
                    "stage_number": n.stage_number,
                    "stage_name": n.stage_name,
                    "city": n.city,
                    "latitude": n.latitude,
                    "longitude": n.longitude,
                    "facility_type": n.facility_type,
                    "capacity_tonnes": n.capacity_tonnes,
                    "current_inventory_tonnes": n.current_inventory_tonnes,
                    "storage_temp_c": n.storage_temp_c,
                    "storage_rh_pct": n.storage_rh_pct,
                    "health_status": n.health_status,
                    "power_backup_active": n.power_backup_active,
                    "disruptions": n.active_disruptions
                }
                for n in self.nodes.values()
            ],
            "edges": [
                {
                    "edge_id": e.edge_id,
                    "from_node_id": e.from_node_id,
                    "to_node_id": e.to_node_id,
                    "name": e.name,
                    "distance_km": e.distance_km,
                    "transit_hours": e.current_transit_hours,
                    "transport_mode": e.transport_mode,
                    "transit_temp_c": e.transit_temp_c,
                    "status": e.status,
                    "disruptions": e.active_disruptions
                }
                for e in self.edges.values()
            ],
            "active_scenarios": self.active_scenarios
        }
