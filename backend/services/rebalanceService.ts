import { getDb } from '../db/mongo';
import { TransferRequest, MLPrediction, Hospital } from '../models/types';
import { getAllHospitalPredictions } from './mlPredictionService';
import { generateGeminiTransferJustification } from './geminiService';

// Geographic distances and transit time estimates between Chennai demo hubs
const TRANSIT_ESTIMATES: Record<string, Record<string, { km: number; mins: number }>> = {
  H001: {
    H002: { km: 8.5, mins: 22 },
    H003: { km: 11.2, mins: 28 },
    H004: { km: 16.0, mins: 38 },
    H005: { km: 28.5, mins: 55 },
  },
  H002: {
    H001: { km: 8.5, mins: 22 },
    H003: { km: 14.0, mins: 32 },
    H004: { km: 15.5, mins: 35 },
    H005: { km: 26.0, mins: 50 },
  },
  H003: {
    H001: { km: 11.2, mins: 28 },
    H002: { km: 14.0, mins: 32 },
    H004: { km: 7.8, mins: 18 },
    H005: { km: 21.0, mins: 42 },
  },
  H004: {
    H001: { km: 16.0, mins: 38 },
    H002: { km: 15.5, mins: 35 },
    H003: { km: 7.8, mins: 18 },
    H005: { km: 14.2, mins: 30 },
  },
  H005: {
    H001: { km: 28.5, mins: 55 },
    H002: { km: 26.0, mins: 50 },
    H003: { km: 21.0, mins: 42 },
    H004: { km: 14.2, mins: 30 },
  },
};

export interface HospitalAnalysis {
  hospital_id: string;
  name: string;
  area: string;
  current_stock: number;
  consumption_rate: number;
  critical_threshold: number;
  time_to_critical_minutes: number;
  surplus_units: number;
  deficit_units: number;
  surplus_hours: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  role: 'SHORTAGE' | 'SURPLUS' | 'BALANCED';
}

export interface RebalanceAnalysisResult {
  shortageHospitals: HospitalAnalysis[];
  surplusHospitals: HospitalAnalysis[];
  balancedHospitals: HospitalAnalysis[];
  recommendations: TransferRequest[];
  timestamp: string;
}

export async function analyzeDistrictResources(): Promise<RebalanceAnalysisResult> {
  const db = getDb();
  const hospitals: Hospital[] = await db.collection('hospitals').find({}).toArray();
  const predictions: MLPrediction[] = await getAllHospitalPredictions();

  const predMap = new Map<string, MLPrediction>();
  predictions.forEach((p) => predMap.set(p.hospital_id, p));

  const hospitalAnalyses: HospitalAnalysis[] = [];

  for (const hosp of hospitals) {
    const pred = predMap.get(hosp.hospital_id);
    const oxygenResource = await db
      .collection('resources')
      .findOne({ hospital_id: hosp.hospital_id, resource_type: 'oxygen_cylinders' });

    const currentStock = oxygenResource ? oxygenResource.current_stock : 60;
    const criticalThreshold = oxygenResource ? oxygenResource.critical_threshold : 30;
    const consumptionRate = pred ? pred.consumption_rate : -2.0; // units/hr
    const timeToCritical = pred ? pred.time_to_critical_minutes : 240;
    const riskLevel = pred ? pred.risk_level : 'LOW';

    // Safe operational reserve is threshold + 4 hours buffer
    const safeBuffer = criticalThreshold + Math.abs(consumptionRate) * 4;
    const diff = currentStock - safeBuffer;

    let role: 'SHORTAGE' | 'SURPLUS' | 'BALANCED' = 'BALANCED';
    let surplusUnits = 0;
    let deficitUnits = 0;

    if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH' || diff < -5) {
      role = 'SHORTAGE';
      // Deficit is amount required to bring it up to safe buffer for at least 8 hours
      deficitUnits = Math.max(15, Math.round(safeBuffer + Math.abs(consumptionRate) * 4 - currentStock));
    } else if (diff > 25 && riskLevel === 'LOW') {
      role = 'SURPLUS';
      // Surplus is units above safe operational reserve
      surplusUnits = Math.round(diff);
    }

    const surplusHours =
      consumptionRate < -0.1
        ? Math.round((currentStock - criticalThreshold) / Math.abs(consumptionRate))
        : 48;

    hospitalAnalyses.push({
      hospital_id: hosp.hospital_id,
      name: hosp.name,
      area: hosp.area,
      current_stock: currentStock,
      consumption_rate: consumptionRate,
      critical_threshold: criticalThreshold,
      time_to_critical_minutes: timeToCritical,
      surplus_units: surplusUnits,
      deficit_units: deficitUnits,
      surplus_hours: Math.max(0, surplusHours),
      risk_level: riskLevel,
      role,
    });
  }

  // Sort shortage hospitals by urgency (lowest time to critical first)
  const shortageHospitals = hospitalAnalyses
    .filter((h) => h.role === 'SHORTAGE')
    .sort((a, b) => a.time_to_critical_minutes - b.time_to_critical_minutes);

  // Sort surplus hospitals by available surplus units descending
  const surplusHospitals = hospitalAnalyses
    .filter((h) => h.role === 'SURPLUS')
    .sort((a, b) => b.surplus_units - a.surplus_units);

  const balancedHospitals = hospitalAnalyses.filter((h) => h.role === 'BALANCED');

  // Generate Ranked Transfer Recommendations
  const recommendations: TransferRequest[] = [];

  for (const shortage of shortageHospitals) {
    if (surplusHospitals.length === 0) break;

    // Pick best donor based on surplus quantity and proximity
    let bestDonor: HospitalAnalysis | null = null;
    let lowestTravelTime = 999;

    for (const donor of surplusHospitals) {
      if (donor.surplus_units <= 10) continue;
      const travel = TRANSIT_ESTIMATES[shortage.hospital_id]?.[donor.hospital_id] || { km: 15, mins: 35 };
      if (travel.mins < lowestTravelTime) {
        lowestTravelTime = travel.mins;
        bestDonor = donor;
      }
    }

    // Fallback to highest surplus donor if travel time lookup was equal
    if (!bestDonor && surplusHospitals.length > 0) {
      bestDonor = surplusHospitals[0];
      const travel = TRANSIT_ESTIMATES[shortage.hospital_id]?.[bestDonor.hospital_id] || { km: 12, mins: 30 };
      lowestTravelTime = travel.mins;
    }

    if (bestDonor) {
      // Backend calculates actual transfer quantity:
      // Minimum of needed deficit and available donor surplus (capping at donor surplus minus safety margin)
      const maxTransferable = Math.max(10, Math.floor(bestDonor.surplus_units * 0.7));
      const needed = shortage.deficit_units;
      const transferQty = Math.min(needed, maxTransferable);

      // Deadline calculation: before shortage hospital hits critical stock (with safety margin)
      const minutesToDeadline = Math.max(25, shortage.time_to_critical_minutes - 20);
      const deadlineDate = new Date(Date.now() + minutesToDeadline * 60 * 1000);
      const deadlineStr = `Within ${Math.max(1, Math.round(minutesToDeadline / 60))} hour (${deadlineDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;

      const priority: 'URGENT' | 'HIGH' | 'MEDIUM' =
        shortage.risk_level === 'CRITICAL' || shortage.time_to_critical_minutes < 90
          ? 'URGENT'
          : shortage.risk_level === 'HIGH'
          ? 'HIGH'
          : 'MEDIUM';

      const reason = `${shortage.name} faces critical depletion within ${shortage.time_to_critical_minutes} mins while ${bestDonor.name} holds ${bestDonor.surplus_hours}h surplus.`;

      // Call Gemini for human-readable justification (concise, factual)
      const aiJustification = await generateGeminiTransferJustification({
        fromName: bestDonor.name,
        toName: shortage.name,
        resource: 'Oxygen Cylinders',
        quantity: transferQty,
        recipientTimeToCritical: shortage.time_to_critical_minutes,
        donorSurplusHours: bestDonor.surplus_hours,
      });

      const travelInfo = TRANSIT_ESTIMATES[bestDonor.hospital_id]?.[shortage.hospital_id] || { km: 11, mins: 28 };

      recommendations.push({
        _id: `rec_${bestDonor.hospital_id}_to_${shortage.hospital_id}_${Date.now()}`,
        from_hospital_id: bestDonor.hospital_id,
        from_hospital_name: bestDonor.name,
        to_hospital_id: shortage.hospital_id,
        to_hospital_name: shortage.name,
        resource_type: 'oxygen_cylinders',
        quantity: transferQty,
        priority,
        status: 'recommended',
        deadline: deadlineStr,
        reason,
        ai_justification: aiJustification,
        estimated_transit_time: `${travelInfo.km} km (~${travelInfo.mins} mins transit)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return {
    shortageHospitals,
    surplusHospitals,
    balancedHospitals,
    recommendations,
    timestamp: new Date().toISOString(),
  };
}
