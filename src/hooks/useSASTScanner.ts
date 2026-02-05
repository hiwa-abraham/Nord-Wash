/**
 * useSASTScanner - Hook for running SAST scans
 * 
 * Provides real-time static analysis capabilities for development.
 * Can be integrated into admin security dashboard.
 */

import { useState, useCallback } from 'react';
import { 
  scanCode, 
  calculateSASTScore,
  groupByOWASP,
  type SASTFinding,
  type SASTCategory,
} from '@/lib/sast-scanner';

interface SASTScanResult {
  findings: SASTFinding[];
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  breakdown: Record<SASTCategory, number>;
  owaspGroups: Map<string, SASTFinding[]>;
  scannedAt: Date | null;
  isScanning: boolean;
}

interface CodeFile {
  path: string;
  content: string;
}

export function useSASTScanner() {
  const [result, setResult] = useState<SASTScanResult>({
    findings: [],
    score: 100,
    grade: 'A',
    breakdown: {
      injection: 0,
      xss: 0,
      authentication: 0,
      authorization: 0,
      cryptography: 0,
      'sensitive-data': 0,
      configuration: 0,
      validation: 0,
    },
    owaspGroups: new Map(),
    scannedAt: null,
    isScanning: false,
  });

  const scanFile = useCallback((content: string, filename?: string): SASTFinding[] => {
    return scanCode(content, filename);
  }, []);

  const scanFiles = useCallback((files: CodeFile[]) => {
    setResult(prev => ({ ...prev, isScanning: true }));
    
    try {
      const allFindings: SASTFinding[] = [];
      
      for (const file of files) {
        const fileFindings = scanCode(file.content, file.path);
        allFindings.push(...fileFindings);
      }
      
      const { score, grade, breakdown } = calculateSASTScore(allFindings);
      const owaspGroups = groupByOWASP(allFindings);
      
      setResult({
        findings: allFindings,
        score,
        grade,
        breakdown,
        owaspGroups,
        scannedAt: new Date(),
        isScanning: false,
      });
      
      return allFindings;
    } catch (error) {
      setResult(prev => ({ ...prev, isScanning: false }));
      throw error;
    }
  }, []);

  const getRecommendations = useCallback((): string[] => {
    const recommendations: string[] = [];
    
    if (result.breakdown.injection > 0) {
      recommendations.push('Fix injection vulnerabilities - use parameterized queries');
    }
    if (result.breakdown.xss > 0) {
      recommendations.push('Address XSS issues - sanitize HTML output');
    }
    if (result.breakdown.authentication > 0) {
      recommendations.push('Remove hardcoded credentials from code');
    }
    if (result.breakdown.cryptography > 0) {
      recommendations.push('Upgrade to stronger cryptographic algorithms');
    }
    if (result.breakdown['sensitive-data'] > 0) {
      recommendations.push('Remove sensitive data from logs and storage');
    }
    
    return recommendations;
  }, [result.breakdown]);

  const getCriticalFindings = useCallback((): SASTFinding[] => {
    return result.findings.filter(f => f.severity === 'critical');
  }, [result.findings]);

  const getHighFindings = useCallback((): SASTFinding[] => {
    return result.findings.filter(f => f.severity === 'high');
  }, [result.findings]);

  return {
    ...result,
    scanFile,
    scanFiles,
    getRecommendations,
    getCriticalFindings,
    getHighFindings,
    hasCriticalIssues: getCriticalFindings().length > 0,
    hasHighIssues: getHighFindings().length > 0,
    totalIssues: result.findings.length,
  };
}
