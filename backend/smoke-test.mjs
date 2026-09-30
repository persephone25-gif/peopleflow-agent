import assert from 'node:assert/strict';
import { handleAgentMessage, runTool, resolveDemoUser } from './orchestrator.mjs';

const manager = resolveDemoUser('maya-ndiaye');
const hr = resolveDemoUser('noah-kim');
const employee = resolveDemoUser('amina-benali');

assert(manager && hr && employee);

const profile = runTool(employee, 'get_employee_profile', { employeeId: 'amina-benali' });
assert.equal(profile.ok, true);
assert.equal(profile.data.employee.name, 'Amina Benali');

const denied = runTool(employee, 'get_workforce_risks', { date: '2026-10-14' });
assert.equal(denied.ok, false);

const risks = runTool(manager, 'get_workforce_risks', { date: '2026-10-14' });
assert.equal(risks.ok, true);
assert(risks.data.summary.riskCount >= 1);


const riskAnswer = handleAgentMessage({
  userId: 'maya-ndiaye',
  message: 'Quels sont les risques workforce ?',
  currentPage: 'manager-ai',
});
assert.equal(riskAnswer.presentation?.kind, 'analysis');
assert.equal(
  riskAnswer.presentation?.items?.length,
  riskAnswer.toolResults?.[0]?.data?.summary?.riskCount,
);
assert(riskAnswer.presentation?.items?.every((item) => item.title));

const prepare = handleAgentMessage({
  userId: 'maya-ndiaye',
  message: 'Propose 2 h supplémentaires à Amina',
  currentPage: 'manager-requests',
});
assert.equal(prepare.suggestions.includes('Confirmer'), true);
assert.equal(prepare.clientAction, undefined);
assert.equal(prepare.presentation?.kind, 'action');
assert.equal(prepare.presentation?.items?.some((item) => item.title === 'Personne concernée'), true);
assert.equal(prepare.presentation?.items?.some((item) => item.title === 'Date'), true);
assert.equal(prepare.presentation?.items?.some((item) => item.title === 'Durée'), true);

const confirm = handleAgentMessage({
  userId: 'maya-ndiaye',
  sessionId: prepare.sessionId,
  message: 'Confirmer',
  currentPage: 'manager-requests',
});
assert.equal(confirm.clientAction?.confirmed, true);
assert.equal(confirm.clientAction?.type, 'create_unified_request');

const recruitment = handleAgentMessage({
  userId: 'noah-kim',
  message: 'Analyse les candidats pour Line Leader',
  currentPage: 'hr-ai',
});
assert.equal(recruitment.agent, 'recruitment');
assert.equal(recruitment.toolResults?.[0]?.ok, true);

console.log('PeopleFlow backend smoke tests: OK');
