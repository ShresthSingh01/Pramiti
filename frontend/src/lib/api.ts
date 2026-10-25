import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 120000, // 120s to allow OCR and LLM/SLM extraction pipelines
});

// Automatically inject JWT Bearer Token into all outgoing requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('eg_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const logout = () => {
  localStorage.removeItem('eg_token');
  localStorage.removeItem('eg_role');
  localStorage.removeItem('eg_name');
  localStorage.removeItem('eg_user');
  window.location.reload();
};

export default api;

export interface DashboardData {
  totals: {
    total: number;
    cleared: number;
    needsReview: number;
    critical: number;
  };
  deltaPct: number | null;
  pipeline: { stage: string; count: number }[];
  automation: {
    autoPct: number | null;
    avgMinutes: number | null;
    baselineMinutes: number | null;
  };
  issues: {
    total: number;
    breakdown: { type: string; count: number }[];
  };
  recent: {
    id: string;
    institution: string;
    type: string;
    status: string;
    riskScore: number | null;
    submitted: string;
  }[];
}

export interface ApplicationDetail {
  id: string;
  institutionName: string;
  category: string;
  status: string;
  riskScore: number | null;
  isSynthetic: boolean;
  checklist: {
    id: string;
    docType: string;
    status: 'verified' | 'issues_found' | 'missing' | 'analyzing' | 'not_required';
    required: boolean;
    fileUrl?: string;
  }[];
}

export interface Finding {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  tags: string[];
  docId?: string;
  ruleId?: string;
  clauseRef?: string;
  handbookVersion?: string;
  evidence?: {
    page?: number;
    bbox?: number[];
    phrase?: string;
    cross_phrase?: string;
    line_ref?: string;
    cross_line_ref?: string;
    primary_doc?: string;
    cross_doc?: string;
    [key: string]: any;
  };
  analysis?: {
    type: string;
    confidence: number;
    method: string;
    explanation: string;
    why_happened?: string;
    sources?: { doc?: string; doc_type?: string; phrase?: string; page?: number; field?: string; value?: any }[];
    [key: string]: any;
  };
  suggestedFix?: string;
  clarificationDispatched?: boolean;
}

export interface VerificationItem {
  id: string;
  documentId: string;
  source: string;
  timestamp: string;
  status: string;
  simulated: boolean;
  fields: { name: string; value: string; match: boolean }[];
  log: { time: string; event: string }[];
}

export interface AlertItem {
  id: string;
  applicationId: string;
  trigger: string;
  message: string;
  recipientRole: string;
  createdAt: string;
  acknowledged: boolean;
}
