import { Router } from 'express';
import {
  generateGeminiTransferJustification,
  generateGeminiPredictionExplanation,
  generateGeminiEmergencyGuidance,
} from '../services/geminiService';

const router = Router();

router.post('/explain-transfer', async (req, res) => {
  try {
    const { fromName, toName, resource, quantity, recipientTimeToCritical, donorSurplusHours } = req.body;
    const justification = await generateGeminiTransferJustification({
      fromName: fromName || 'Donor Hospital',
      toName: toName || 'Recipient Hospital',
      resource: resource || 'Oxygen Cylinders',
      quantity: parseInt(quantity) || 30,
      recipientTimeToCritical: parseInt(recipientTimeToCritical) || 60,
      donorSurplusHours: parseInt(donorSurplusHours) || 8,
    });
    res.json({ justification });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate justification' });
  }
});

router.post('/explain-prediction', async (req, res) => {
  try {
    const { hospitalName, currentStock, criticalThreshold, depletionRate, timeToCriticalMinutes, riskLevel } = req.body;
    const explanation = await generateGeminiPredictionExplanation({
      hospitalName: hospitalName || 'Hospital',
      currentStock: parseInt(currentStock) || 50,
      criticalThreshold: parseInt(criticalThreshold) || 30,
      depletionRate: parseFloat(depletionRate) || -2.5,
      timeToCriticalMinutes: parseInt(timeToCriticalMinutes) || 90,
      riskLevel: riskLevel || 'HIGH',
    });
    res.json({ explanation });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate prediction explanation' });
  }
});

router.post('/emergency-guidance', async (req, res) => {
  try {
    const { requestType = 'Oxygen Support', area = 'Chennai' } = req.body;
    const guidance = await generateGeminiEmergencyGuidance({ requestType, area });
    res.json({ guidance });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate guidance' });
  }
});

export default router;
