import React, { useState } from 'react';
import { ImpactAnalysisPanel } from '../ai/ImpactAnalysisPanel';
import { DefectImpactGraph } from './DefectImpactGraph';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { AlertTriangle, Database, Activity, Cpu } from 'lucide-react';

export const ImpactAnalysisTab = () => {
  const [defectForm, setDefectForm] = useState({
    title: 'Payment Webhook Service Connection Loss',
    description: 'Third party payment gateway API fails to resolve auth token',
    category: 'Payment',
    module: 'PaymentGateway',
    severity: 'Critical',
    priority: 'Critical'
  });

  return (
    <div className="space-y-6">
      {/* Top Input Header */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input
          label="Target Defect Title"
          value={defectForm.title}
          onChange={(e) => setDefectForm({ ...defectForm, title: e.target.value })}
        />

        <Select
          label="Category"
          value={defectForm.category}
          onChange={(e) => setDefectForm({ ...defectForm, category: e.target.value })}
          options={[
            { label: 'Payment', value: 'Payment' },
            { label: 'Authentication', value: 'Authentication' },
            { label: 'UI/UX', value: 'UI/UX' },
            { label: 'API', value: 'API' },
            { label: 'Database', value: 'Database' },
            { label: 'Security', value: 'Security' }
          ]}
        />

        <Select
          label="Severity Level"
          value={defectForm.severity}
          onChange={(e) => setDefectForm({ ...defectForm, severity: e.target.value })}
          options={[
            { label: 'Critical', value: 'Critical' },
            { label: 'High', value: 'High' },
            { label: 'Medium', value: 'Medium' },
            { label: 'Low', value: 'Low' }
          ]}
        />
      </div>

      {/* Visual Defect Impact Flow Graph */}
      <DefectImpactGraph defectData={defectForm} />

      {/* Real Impact Analysis Panel */}
      <ImpactAnalysisPanel defectData={defectForm} />
    </div>
  );
};
